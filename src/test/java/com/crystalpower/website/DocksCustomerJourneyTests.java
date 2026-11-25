package com.crystalpower.website;

import com.crystalpower.website.security.OwnerPrincipal;
import com.crystalpower.website.service.EmailTransport;
import com.crystalpower.website.service.OwnerService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.ResultActions;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "app.docks.email-enabled=true",
        "spring.datasource.url=${crystal.test.database-url:jdbc:h2:mem:crystal-docks-journey;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1}"
})
@AutoConfigureMockMvc
class DocksCustomerJourneyTests {
    private static final String DOCKS = "/api/docks";
    private static final String REPORTS = DOCKS + "/reports";
    private static final String SUPPORT = REPORTS + "/support-access";
    private static final String LOG = DOCKS + "/diagnostic-log";
    private static final String RESEARCH = DOCKS + "/research";

    @Autowired MockMvc http;
    @Autowired ObjectMapper json;
    @MockitoBean EmailTransport mail;
    @MockitoBean OwnerService owners;

    @Test
    void enrolledCustomerControlsReportsSupportLogsAndResearchIndependently() throws Exception {
        var delivered = new AtomicReference<EmailTransport.Message>();
        when(mail.configured()).thenReturn(true);
        http.perform(get(DOCKS + "/auth/email")).andExpect(status().isOk()).andExpect(jsonPath("$.enabled").value(true));
        doAnswer(invocation -> {
            delivered.set(invocation.getArgument(0));
            return null;
        }).when(mail).send(any(EmailTransport.Message.class));

        String customer = signIn(delivered);
        String other = signIn(delivered);
        UUID installation = UUID.randomUUID();
        String entitlement = DOCKS + "/entitlement?installationId=" + installation;
        asCustomer(get(entitlement), customer).andExpect(status().isNotFound());
        asCustomer(body(post(DOCKS + "/devices"), Map.of("installationId", installation, "label", "Pilot PC")), customer)
                .andExpect(status().isOk());
        asCustomer(get(entitlement), customer).andExpect(status().isOk()).andExpect(jsonPath("$.canRepair").value(false));
        asCustomer(body(post(DOCKS + "/trial"), Map.of("installationId", installation)), customer)
                .andExpect(status().isOk()).andExpect(jsonPath("$.canRepair").value(true));
        asCustomer(get(entitlement), other).andExpect(status().isNotFound());

        var checkedAt = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1);
        var summary = Map.of("installationId", installation, "checkedAt", checkedAt, "cpuPercent", 28, "memoryPercent", 47);
        asCustomer(body(put(REPORTS + "/latest"), summary), customer).andExpect(status().isConflict());
        asCustomer(body(put(REPORTS + "/preference"), Map.of("enabled", true)), customer).andExpect(status().isNoContent());
        asCustomer(body(put(REPORTS + "/latest"), summary), customer).andExpect(status().isNoContent());
        asCustomer(get(REPORTS), other).andExpect(status().isOk()).andExpect(jsonPath("$.reports").isEmpty());
        asCustomer(get(REPORTS), customer).andExpect(status().isOk())
                .andExpect(jsonPath("$.reports[0].deviceLabel").value("Pilot PC"))
                .andExpect(jsonPath("$.reports[0].memoryPercent").value(47));

        var grant = response(asCustomer(post(SUPPORT), customer).andExpect(status().isOk()));
        String reference = grant.get("reference").asText();
        var principal = new OwnerPrincipal(UUID.randomUUID(), "owner@example.invalid", 1);
        when(owners.valid(principal)).thenReturn(true);
        var owner = UsernamePasswordAuthenticationToken.authenticated(principal, null, List.of(new SimpleGrantedAuthority("ROLE_OWNER")));
        String ownerPath = "/api/admin/docks/support-reports";
        asCustomer(body(post(ownerPath).with(csrf()), Map.of("reference", reference)), customer)
                .andExpect(status().isUnauthorized());
        http.perform(body(post(ownerPath).with(csrf()).with(authentication(owner)), Map.of("reference", reference)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.reports[0].deviceLabel").value("Pilot PC"));
        asCustomer(get(SUPPORT), customer).andExpect(status().isOk()).andExpect(jsonPath("$.activity[0].action").value("VIEWED"));

        var readings = Map.of("cpuPercent", 28, "memoryPercent", 47, "logicalProcessors", 4,
                "installedApps", 12, "driveStatus", "HEALTHY");
        var diagnostic = Map.of("installationId", installation, "checkedAt", checkedAt, "readings", readings, "approved", true);
        var log = response(asCustomer(body(post(LOG), diagnostic), customer).andExpect(status().isOk()));
        String logReference = log.get("reference").asText();
        http.perform(body(post(ownerPath).with(csrf()).with(authentication(owner)), Map.of("reference", logReference)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.diagnosticLog.readings.installedApps").value(12));
        asCustomer(get(LOG), other).andExpect(status().isOk()).andExpect(jsonPath("$.grant").isEmpty());
        asCustomer(delete(LOG), customer).andExpect(status().isNoContent());
        http.perform(body(post(ownerPath).with(csrf()).with(authentication(owner)), Map.of("reference", logReference)))
                .andExpect(status().isNotFound());

        var bands = Map.of("cpuBand", "MEDIUM", "memoryBand", "MEDIUM");
        asCustomer(body(put(RESEARCH + "/contribution"), bands), customer).andExpect(status().isConflict());
        asCustomer(body(put(RESEARCH + "/preference"), Map.of("enabled", true)), customer).andExpect(status().isOk());
        asCustomer(body(put(RESEARCH + "/contribution"), bands), customer)
                .andExpect(status().isOk()).andExpect(jsonPath("$.submittedAt").isNotEmpty());
        asCustomer(body(put(RESEARCH + "/preference"), Map.of("enabled", false)), customer)
                .andExpect(status().isOk()).andExpect(jsonPath("$.submittedAt").isEmpty());
        asCustomer(get(REPORTS), customer).andExpect(status().isOk()).andExpect(jsonPath("$.reports[0].deviceLabel").value("Pilot PC"));

        asCustomer(body(put(REPORTS + "/preference"), Map.of("enabled", false)), customer).andExpect(status().isNoContent());
        http.perform(body(post(ownerPath).with(csrf()).with(authentication(owner)), Map.of("reference", reference)))
                .andExpect(status().isNotFound());
        asCustomer(get(REPORTS), customer).andExpect(status().isOk()).andExpect(jsonPath("$.reports").isEmpty());
        asCustomer(post(DOCKS + "/auth/sign-out"), customer).andExpect(status().isNoContent());
        asCustomer(get(REPORTS), customer).andExpect(status().isUnauthorized());
    }

    private String signIn(AtomicReference<EmailTransport.Message> delivered) throws Exception {
        var email = "pilot-" + UUID.randomUUID() + "@example.invalid";
        delivered.set(null);
        http.perform(body(post(DOCKS + "/auth/email/request"), Map.of("email", email))).andExpect(status().isAccepted());
        var match = Pattern.compile("<strong>([A-Za-z0-9_-]{43})</strong>").matcher(delivered.get().html());
        assertTrue(match.find(), "The captured fixture email contains a sign-in code");
        var code = Map.of("code", match.group(1));
        String token = response(http.perform(body(post(DOCKS + "/auth/email/exchange"), code)).andExpect(status().isOk()))
                .get("accessToken").asText();
        http.perform(body(post(DOCKS + "/auth/email/exchange"), code)).andExpect(status().isUnauthorized());
        return token;
    }

    private ResultActions asCustomer(MockHttpServletRequestBuilder request, String token) throws Exception {
        return http.perform(request.header("Authorization", "Bearer " + token));
    }

    private MockHttpServletRequestBuilder body(MockHttpServletRequestBuilder request, Object value) throws Exception {
        return request.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(value));
    }

    private JsonNode response(ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsByteArray());
    }
}
