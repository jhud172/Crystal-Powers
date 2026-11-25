package com.crystalpower.website.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.crystalpower.website.api.DocksOnlineExplanationController;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

class DocksOnlineExplanationTests {
    @Test
    void capsApplyAtomicallyAcrossAccounts() throws Exception {
        var db = new EmbeddedDatabaseBuilder().generateUniqueName(true).setType(EmbeddedDatabaseType.H2)
                .addScripts("classpath:db/migration/V87__docks_accounts_and_devices.sql",
                        "classpath:db/migration/V100__docks_online_ai_allowance.sql").build();
        var executor = Executors.newFixedThreadPool(4);
        try {
            var jdbc = new JdbcTemplate(db);
            var allowance = new DocksAiAllowance(jdbc, new TransactionTemplate(new DataSourceTransactionManager(db)));
            UUID first = UUID.randomUUID();
            UUID second = UUID.randomUUID();
            for (UUID account : new UUID[] { first, second })
                jdbc.update("INSERT INTO docks_account(id, display_name) VALUES (?, 'Fixture')", account);
            assertTrue(allowance.reserve(first, 1, 6, 2));
            assertFalse(allowance.reserve(first, 1, 6, 2));
            var calls = new ArrayList<Callable<Boolean>>();
            for (int i = 0; i < 10; i++) calls.add(() -> allowance.reserve(second, 10, 6, 2));
            int successes = 0;
            for (var result : executor.invokeAll(calls, 10, TimeUnit.SECONDS)) if (result.get()) successes++;
            assertEquals(2, successes);
            assertEquals(6L, jdbc.queryForObject("SELECT reserved_pence FROM docks_ai_budget", Long.class));
            var month = YearMonth.now(ZoneOffset.UTC);
            assertEquals(6L, allowance.reservedPence(month));
            assertEquals(0L, allowance.reservedPence(month.plusMonths(1)));
        } finally {
            executor.shutdownNow();
            db.shutdown();
        }
    }

    @Test
    void ownerBudgetRemainsReadableWhenProviderIsDisabledOrConfigIsInvalid() {
        var env = new MockEnvironment()
                .withProperty("DOCKS_AI_ENABLED", "false")
                .withProperty("DOCKS_AI_PRICING_VERIFIED", "true")
                .withProperty("DOCKS_AI_OPENAI_KEY", "synthetic-credential")
                .withProperty("DOCKS_AI_ACCOUNT_MONTHLY_LIMIT", "4")
                .withProperty("DOCKS_AI_MONTHLY_BUDGET_PENCE", "10")
                .withProperty("DOCKS_AI_REQUEST_RESERVE_PENCE", "2");
        var allowance = mock(DocksAiAllowance.class);
        when(allowance.reservedPence(any(YearMonth.class))).thenReturn(6L);
        var service = new DocksOnlineExplanation(env, new ObjectMapper(), mock(DocksEntitlements.class), allowance);
        assertFalse(service.available());
        var disabled = service.budgetStatus();
        assertEquals(6L, disabled.reservedPence());
        assertEquals(4L, disabled.remainingPence());
        assertEquals(2L, disabled.requestReservePence());
        assertEquals(4, disabled.accountMonthlyLimit());
        env.setProperty("DOCKS_AI_ENABLED", "true");
        env.setProperty("DOCKS_AI_MONTHLY_BUDGET_PENCE", "5");
        assertTrue(service.available());
        assertEquals(0L, service.budgetStatus().remainingPence());
        env.setProperty("DOCKS_AI_MONTHLY_BUDGET_PENCE", "invalid-value");
        assertFalse(service.available());
        assertNull(service.budgetStatus().remainingPence());
        assertEquals(6L, service.budgetStatus().reservedPence());
        env.setProperty("DOCKS_AI_ENABLED", "not-a-boolean");
        assertFalse(service.available());
    }

    @Test
    void verifiesConsentEntitlementAndCapBeforeCallingProvider() throws Exception {
        var env = new MockEnvironment();
        var auth = mock(DocksEmailSignIn.class);
        var entitlements = mock(DocksEntitlements.class);
        var allowance = mock(DocksAiAllowance.class);
        var service = spy(new DocksOnlineExplanation(env, new ObjectMapper(), entitlements, allowance));
        UUID account = UUID.randomUUID();
        UUID installation = UUID.randomUUID();
        String endpoint = "/api/docks/explanations/online";
        when(auth.account("Bearer fixture")).thenReturn(Optional.of(account));
        var mvc = MockMvcBuilders.standaloneSetup(new DocksOnlineExplanationController(auth, service)).build();
        mvc.perform(get(endpoint)).andExpect(status().isUnauthorized());
        mvc.perform(get(endpoint).header("Authorization", "Bearer fixture"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.available").value(false));
        assertEquals(503, assertThrows(ResponseStatusException.class,
                () -> service.explain(account, installation, 12, null)).getStatusCode().value());
        env.setProperty("DOCKS_AI_ENABLED", "true");
        env.setProperty("DOCKS_AI_PRICING_VERIFIED", "true");
        env.setProperty("DOCKS_AI_OPENAI_KEY", "fixture");
        env.setProperty("DOCKS_AI_ACCOUNT_MONTHLY_LIMIT", "2");
        env.setProperty("DOCKS_AI_MONTHLY_BUDGET_PENCE", "10");
        env.setProperty("DOCKS_AI_REQUEST_RESERVE_PENCE", "1");
        String body = "{\"installationId\":\"" + installation + "\",\"cpuPercent\":12";
        mvc.perform(post(endpoint).header("Authorization", "Bearer fixture").contentType(MediaType.APPLICATION_JSON)
                .content(body + "}")).andExpect(status().isBadRequest());
        when(entitlements.status(account, installation)).thenReturn(Optional.empty());
        mvc.perform(post(endpoint).header("Authorization", "Bearer fixture").contentType(MediaType.APPLICATION_JSON)
                .content(body + ",\"approved\":true}")).andExpect(status().isForbidden());
        verifyNoInteractions(allowance);
        verify(service, never()).requestExplanation(anyString(), any(), any());
        when(entitlements.status(account, installation))
                .thenReturn(Optional.of(new DocksEntitlements.Status(true, false, null, null, null)));
        assertEquals(429, assertThrows(ResponseStatusException.class,
                () -> service.explain(account, installation, 12, null)).getStatusCode().value());
        verify(service, never()).requestExplanation(anyString(), any(), any());
        when(allowance.reserve(account, 2, 10, 1)).thenReturn(true);
        doReturn(Optional.of("Fixture explanation.")).when(service).requestExplanation("fixture", 12, null);
        mvc.perform(post(endpoint).header("Authorization", "Bearer fixture").contentType(MediaType.APPLICATION_JSON)
                .content(body + ",\"approved\":true}")).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.explanation").value("Fixture explanation."));
        assertEquals("Processor use: 12%\nMemory use: unavailable", DocksOnlineExplanation.payload(12, null).get("input"));
        assertEquals(false, DocksOnlineExplanation.payload(12, null).get("store"));
    }
}
