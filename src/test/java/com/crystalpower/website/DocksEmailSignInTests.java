package com.crystalpower.website;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.crystalpower.website.service.DocksEmailSignIn;
import com.crystalpower.website.service.EmailTransport;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.transaction.support.TransactionTemplate;

class DocksEmailSignInTests {
    @Test
    void emailProofIsSingleUseAndBearerCanBeRevoked() {
        var database = new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2)
                .generateUniqueName(true)
                .addScripts("classpath:db/migration/V87__docks_accounts_and_devices.sql",
                            "classpath:db/migration/V88__docks_email_sign_in.sql").build();
        try {
            var db = new JdbcTemplate(database);
            var email = mock(EmailTransport.class);
            when(email.configured()).thenReturn(true);
            var transactions = new TransactionTemplate(new DataSourceTransactionManager(database));
            var signIn = new DocksEmailSignIn(db, transactions, email, true);
            assertTrue(signIn.available());
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
            signIn.signOut(bearer);
            assertTrue(signIn.account(bearer).isEmpty());
            assertFalse(new DocksEmailSignIn(db, transactions, email, false).available());
        } finally {
            database.shutdown();
        }
    }
}
