package com.crystalpower.website.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.transaction.support.TransactionTemplate;

class DocksAccountDeletionTests {
    @Test
    void onlyFreshSessionsCanDeleteAndOnlyAfterResolvingBilling() {
        var database = new EmbeddedDatabaseBuilder().generateUniqueName(true).setType(EmbeddedDatabaseType.H2)
                .addScripts("classpath:db/migration/V87__docks_accounts_and_devices.sql",
                        "classpath:db/migration/V88__docks_email_sign_in.sql",
                        "classpath:db/migration/V89__docks_trial.sql",
                        "classpath:db/migration/V90__docks_access_keys.sql",
                        "classpath:db/migration/V91__docks_report_sync.sql",
                        "classpath:db/migration/V92__docks_subscription_checkout.sql",
                        "classpath:db/migration/V93__docks_subscription_status.sql",
                        "classpath:db/migration/V94__docks_subscription_seats.sql",
                        "classpath:db/migration/V95__docks_household_members.sql",
                        "classpath:db/migration/V97__docks_report_support_access.sql",
                        "classpath:db/migration/V98__docks_diagnostic_research.sql",
                        "classpath:db/migration/V99__docks_google_sign_in.sql",
                        "classpath:db/migration/V101__docks_diagnostic_log_sharing.sql",
                        "classpath:db/migration/V102__docks_stripe_mode_isolation.sql",
                        "classpath:db/migration/V106__docks_account_deletion.sql",
                        "classpath:db/migration/V107__detach_closed_docks_billing.sql",
                        "classpath:db/migration/V111__docks_browser_sessions.sql").build();
        try {
            var db = new JdbcTemplate(database);
            var tx = new TransactionTemplate(new DataSourceTransactionManager(database));
            var signIn = new DocksEmailSignIn(db, tx, mock(EmailTransport.class), false, new DocksPilotAccess(new MockEnvironment()), mock(com.crystalpower.website.security.SecretVault.class));
            var stripe = mock(StripeGateway.class);
            when(stripe.connected()).thenReturn(true);
            var service = new DocksAccountDeletion(db, tx, signIn, stripe);
            UUID account = UUID.randomUUID(), other = UUID.randomUUID();
            UUID device = UUID.randomUUID(), otherDevice = UUID.randomUUID(), terminal = UUID.randomUUID(), abandoned = UUID.randomUUID();
            var now = OffsetDateTime.now(ZoneOffset.UTC);
            db.update("INSERT INTO docks_account(id, display_name) VALUES (?, 'Fixture'), (?, 'Other')", account, other);
            db.update("INSERT INTO docks_identity(issuer, subject, account_id) VALUES (?, ?, ?)",
                    DocksEmailSignIn.ISSUER, "fixture@example.invalid", account);
            db.update("INSERT INTO docks_device(id, account_id, installation_id, label) VALUES (?, ?, ?, 'Fixture')",
                    device, account, UUID.randomUUID());
            db.update("INSERT INTO docks_device(id, account_id, installation_id, label) VALUES (?, ?, ?, 'Other')",
                    otherDevice, other, UUID.randomUUID());
            db.update("INSERT INTO docks_report_consent(account_id, granted_at) VALUES (?, ?)", account, now);
            db.update("INSERT INTO docks_device_report(device_id, checked_at, cpu_percent) VALUES (?, ?, 40)", device, now);
            db.update("INSERT INTO docks_research_consent(account_id, granted_at) VALUES (?, ?)", account, now);
            db.update("INSERT INTO docks_email_challenge(token_hash, email, expires_at) VALUES ('fixture', 'fixture@example.invalid', ?)", now.plusMinutes(5));
            db.update("INSERT INTO docks_email_rate(bucket, sent_at) VALUES (?, ?)",
                    DocksEmailSignIn.digest("fixture@example.invalid"), now);
            db.update("""
                    INSERT INTO docks_subscription_checkout(account_id, attempt_id, plan, stripe_price, expires_at_epoch,
                                                             stripe_session, checkout_url)
                    VALUES (?, ?, 'HOUSEHOLD_MONTHLY', 'price_Fixture', 1, 'cs_test_Terminal', 'https://checkout.stripe.com/fixture'),
                           (?, ?, 'SINGLE_MONTHLY', 'price_Fixture', 1, 'cs_test_Abandoned', 'https://checkout.stripe.com/fixture')
                    """, account, terminal, account, abandoned);
            db.update("""
                    INSERT INTO docks_subscription_status(stripe_subscription_id, attempt_id, provider_state, updated_at_epoch)
                    VALUES ('sub_Fixture', ?, 'paid', 1)
                    """, terminal);
            db.update("""
                    INSERT INTO docks_household_invitation(id, stripe_subscription_id, invited_email, expires_at_epoch, member_account_id)
                    VALUES (?, 'sub_Fixture', 'other@example.invalid', 2, ?)
                    """, UUID.randomUUID(), other);
            db.update("INSERT INTO docks_subscription_seat(stripe_subscription_id, device_id) VALUES ('sub_Fixture', ?)", otherDevice);
            db.update("INSERT INTO docks_subscription_event(stripe_event_id, attempt_id, handled_at_epoch) VALUES ('evt_Fixture', ?, 1)", terminal);

            var oldToken = "Bearer " + signIn.issueSession(account, false).accessToken();
            db.update("UPDATE docks_session SET issued_at = ? WHERE account_id = ?", now.minusMinutes(11), account);
            assertEquals(DocksAccountDeletion.Result.SIGN_IN_AGAIN, service.delete(oldToken));
            var otherToken = "Bearer " + signIn.issueSession(other, false).accessToken();
            var token = "Bearer " + signIn.issueSession(account, false).accessToken();
            assertEquals(DocksAccountDeletion.Result.UNAUTHORISED, service.delete(null));
            assertEquals(DocksAccountDeletion.Result.BILLING_OPEN, service.delete(token));
            verify(stripe, never()).session(anyString());
            db.update("UPDATE docks_subscription_status SET provider_state = 'canceled' WHERE attempt_id = ?", terminal);
            var checkout = new ObjectMapper().createObjectNode().put("object", "checkout.session")
                    .put("id", "cs_test_Abandoned").put("livemode", false).put("status", "complete")
                    .put("client_reference_id", abandoned.toString()).putNull("subscription");
            when(stripe.session("cs_test_Abandoned")).thenReturn(checkout);
            assertEquals(DocksAccountDeletion.Result.BILLING_OPEN, service.delete(token));
            checkout.put("status", "expired");
            assertEquals(DocksAccountDeletion.Result.DELETED, service.delete(token));
            assertTrue(signIn.account(token).isEmpty());
            assertTrue(signIn.account(oldToken).isEmpty());
            assertEquals(other, signIn.account(otherToken).orElseThrow());
            for (String table : new String[]{"docks_identity", "docks_device_report", "docks_report_consent",
                    "docks_research_consent", "docks_household_invitation", "docks_subscription_seat", "docks_email_challenge",
                    "docks_email_rate"})
                assertEquals(0, db.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class), table);
            assertNull(db.queryForObject("SELECT account_id FROM docks_subscription_checkout WHERE attempt_id = ?", UUID.class, terminal));
            assertNull(db.queryForObject("SELECT checkout_url FROM docks_subscription_checkout WHERE attempt_id = ?", String.class, terminal));
            assertEquals(1, db.queryForObject("SELECT COUNT(*) FROM docks_subscription_event", Integer.class));
            assertEquals(1, db.queryForObject("SELECT COUNT(*) FROM docks_subscription_checkout", Integer.class));
            assertEquals(1, db.queryForObject("SELECT COUNT(*) FROM docks_device WHERE account_id = ?", Integer.class, other));
        } finally {
            database.shutdown();
        }
    }
}
