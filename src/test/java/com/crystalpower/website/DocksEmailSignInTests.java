package com.crystalpower.website;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.crystalpower.website.service.DocksEmailSignIn;
import com.crystalpower.website.service.DocksPilotAccess;
import com.crystalpower.website.service.EmailTransport;
import java.util.regex.Pattern;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.transaction.support.TransactionTemplate;

class DocksEmailSignInTests {
    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void emailProofIsSingleUseAndBearerCanBeRevoked(boolean staging) {
        var database = new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2)
                .generateUniqueName(true)
                .addScripts("classpath:db/migration/V87__docks_accounts_and_devices.sql",
                            "classpath:db/migration/V88__docks_email_sign_in.sql",
                            "classpath:db/migration/V106__docks_account_deletion.sql").build();
        try {
            var db = new JdbcTemplate(database);
            var email = mock(EmailTransport.class);
            when(email.configured()).thenReturn(true);
            var transactions = new TransactionTemplate(new DataSourceTransactionManager(database));
            var environment = new MockEnvironment().withProperty("DOCKS_PILOT_ALLOWED_EMAILS", " CUSTOMER@example.com ");
            if (staging) environment.setActiveProfiles("docks-pilot");
            var access = new DocksPilotAccess(environment);
            var signIn = new DocksEmailSignIn(db, transactions, email, true, access);
            assertTrue(signIn.available());
            if (staging) {
                signIn.request("other@example.com");
                verify(email, never()).send(any());
                assertEquals(0, db.queryForObject("SELECT COUNT(*) FROM docks_email_challenge", Integer.class));
            }
            signIn.request("Customer@example.com");
            signIn.request("customer@example.com");
            var message = ArgumentCaptor.forClass(EmailTransport.Message.class);
            verify(email, times(1)).send(message.capture());
            var matcher = Pattern.compile("<strong>([A-Za-z0-9_-]{43})</strong>").matcher(message.getValue().html());
            assertTrue(matcher.find());
            String code = matcher.group(1);
            assertNotEquals(code, db.queryForObject("SELECT token_hash FROM docks_email_challenge", String.class));
            assertTrue(signIn.exchange("A".repeat(43)).isEmpty());
            var session = signIn.exchange(code).orElseThrow();
            assertTrue(signIn.exchange(code).isEmpty());
            String bearer = "Bearer " + session.accessToken();
            assertEquals(session.accountId(), signIn.account(bearer).orElseThrow());
            assertTrue(signIn.account(null).isEmpty());
            var emptyPilot = new MockEnvironment();
            emptyPilot.setActiveProfiles("docks-pilot");
            var restricted = new DocksEmailSignIn(db, transactions, email, true, new DocksPilotAccess(emptyPilot));
            assertFalse(restricted.available());
            assertTrue(restricted.account(bearer).isEmpty());
            signIn.signOut(bearer);
            assertTrue(signIn.account(bearer).isEmpty());
            assertFalse(new DocksEmailSignIn(db, transactions, email, false, access).available());
        } finally {
            database.shutdown();
        }
    }
}
