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
    void emailProofIsSingleUseAndBearerCanBeRevoked(boolean staging) throws Exception {
        var database = new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2)
                .generateUniqueName(true)
                .addScripts("classpath:db/migration/V87__docks_accounts_and_devices.sql",
                            "classpath:db/migration/V88__docks_email_sign_in.sql",
                            "classpath:db/migration/V106__docks_account_deletion.sql",
                            "classpath:db/migration/V109__limit_docks_email_code_attempts.sql").build();
        try {
            var db = new JdbcTemplate(database);
            var email = mock(EmailTransport.class);
            when(email.configured()).thenReturn(true);
            var transactions = new TransactionTemplate(new DataSourceTransactionManager(database));
            var environment = new MockEnvironment().withProperty("DOCKS_PILOT_ALLOWED_EMAILS", " CUSTOMER@example.com ");
            if (staging) environment.setActiveProfiles("docks-pilot");
            var access = new DocksPilotAccess(environment);
            var vault = new com.crystalpower.website.security.SecretVault("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", environment);
            var signIn = new DocksEmailSignIn(db, transactions, email, true, access, vault);
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
            var matcher = Pattern.compile("<strong>([0-9]{9})</strong>").matcher(message.getValue().html());
            assertTrue(matcher.find());
            String code = matcher.group(1);
            assertNotEquals(code, db.queryForObject("SELECT token_hash FROM docks_email_challenge", String.class));
            assertTrue(signIn.exchange("other@example.com", code).isEmpty());
            assertTrue(signIn.exchange(null, code).isEmpty());
            var session = signIn.exchange(" CUSTOMER@example.com ", code).orElseThrow();
            assertTrue(signIn.exchange(" CUSTOMER@example.com ", code).isEmpty());
            String bearer = "Bearer " + session.accessToken();
            assertEquals(session.accountId(), signIn.account(bearer).orElseThrow());
            assertTrue(signIn.account(null).isEmpty());
            var emptyPilot = new MockEnvironment();
            emptyPilot.setActiveProfiles("docks-pilot");
            var restricted = new DocksEmailSignIn(db, transactions, email, true, new DocksPilotAccess(emptyPilot), vault);
            assertFalse(restricted.available());
            assertTrue(restricted.account(bearer).isEmpty());
            signIn.signOut(bearer);
            assertTrue(signIn.account(bearer).isEmpty());
            db.update("DELETE FROM docks_email_rate");
            signIn.request("customer@example.com");
            verify(email, times(2)).send(message.capture());
            var second = Pattern.compile("<strong>([0-9]{9})</strong>").matcher(message.getValue().html());
            assertTrue(second.find());
            String freshCode = second.group(1);
            String incorrectCode = freshCode.equals("000000000") ? "000000001" : "000000000";
            for (int i = 0; i < 5; i++) assertTrue(signIn.exchange("customer@example.com", incorrectCode).isEmpty());
            assertTrue(signIn.exchange("customer@example.com", freshCode).isEmpty());
            assertFalse(new DocksEmailSignIn(db, transactions, email, false, access, vault).available());
        } finally {
            database.shutdown();
        }
    }
}
