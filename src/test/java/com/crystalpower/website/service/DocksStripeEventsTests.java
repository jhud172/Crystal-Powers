package com.crystalpower.website.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.crystalpower.website.repository.DocksDeviceRepository;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

class DocksStripeEventsTests {
    private static final String HOOK = "whsec_FixtureDocksWebhook";
    private final ObjectMapper json = new ObjectMapper();

    @Test
    void signedEventsUseCanonicalStatusDeduplicateAndCannotRestoreCancelledAccess() throws Exception {
        var database = new EmbeddedDatabaseBuilder().generateUniqueName(true).setType(EmbeddedDatabaseType.H2)
                .addScripts("classpath:db/migration/V87__docks_accounts_and_devices.sql",
                        "classpath:db/migration/V89__docks_trial.sql",
                        "classpath:db/migration/V90__docks_access_keys.sql",
                        "classpath:db/migration/V92__docks_subscription_checkout.sql",
                        "classpath:db/migration/V93__docks_subscription_status.sql",
                        "classpath:db/migration/V94__docks_subscription_seats.sql",
                        "classpath:db/migration/V95__docks_household_members.sql").build();
        try {
            var db = new JdbcTemplate(database);
            var tx = new TransactionTemplate(new DataSourceTransactionManager(database));
            var stripe = spy(new StripeGateway(json, false, false, "sk_test_Fixture", "whsec_FixtureWebsite",
                    "https://example.com"));
            var events = new DocksStripeEvents(db, tx, stripe, true, HOOK);
            var account = UUID.randomUUID();
            var attempt = UUID.randomUUID();
            db.update("INSERT INTO docks_account(id, display_name) VALUES (?, 'Fixture')", account);
            var devices = new DocksDeviceRepository(db);
            var installation = UUID.randomUUID();
            devices.enrol(account, installation, "Fixture PC");
            var next = UUID.randomUUID();
            devices.enrol(account, next, "Second PC");
            var entitlements = new DocksEntitlements(db, tx, new DocksSubscriptionSeats(db, stripe, true, true));
            var disabled = new DocksEntitlements(db, tx, new DocksSubscriptionSeats(db, stripe, true, false));
            db.update("""
                    INSERT INTO docks_subscription_checkout
                      (account_id, attempt_id, plan, stripe_price, expires_at_epoch, stripe_session)
                    VALUES (?, ?, 'SINGLE_MONTHLY', 'price_Fixture', ?, 'cs_test_Fixture')
                    """, account, attempt, Instant.now().plusSeconds(3600).getEpochSecond());

            long end = Instant.now().plusSeconds(86400).getEpochSecond();
            var active = json.readTree("""
                    {"id":"sub_Fixture","object":"subscription","livemode":false,"customer":"cus_Fixture",
                     "metadata":{"docks_account_id":"%s","docks_checkout_attempt":"%s"},
                     "status":"active","items":{"has_more":false,"data":[{"quantity":1,"current_period_end":%d,
                       "price":{"id":"price_Fixture","currency":"gbp","recurring":{"interval":"month","interval_count":1}}}]},
                     "latest_invoice":{"status":"paid","customer":"cus_Fixture","amount_paid":500,
                        "lines":{"data":[{"parent":{"type":"subscription_item_details",
                            "subscription_item_details":{"subscription":"sub_Fixture","proration":false}},
                            "pricing":{"price_details":{"price":"price_Fixture"}},"period":{"end":%d}}]},
                        "parent":{"subscription_details":{"subscription":"sub_Fixture"}}}}
                    """.formatted(account, attempt, end, end));
            var cancelled = ((com.fasterxml.jackson.databind.node.ObjectNode) active.deepCopy()).put("status", "canceled");
            doReturn(active).when(stripe).subscription("sub_Fixture");

            var completed = event("evt_Complete", "checkout.session.completed", """
                    {"id":"cs_test_Fixture","subscription":"sub_Fixture","client_reference_id":"%s"}
                    """.formatted(attempt));
            assertThrows(ResponseStatusException.class, () -> events.receive(completed, sign(completed, "whsec_FixtureWebsite")));
            verify(stripe, never()).subscription(anyString());
            events.receive(completed, sign(completed, HOOK));
            events.receive(completed, sign(completed, HOOK));
            assertEquals(end, db.queryForObject("SELECT paid_until_epoch FROM docks_subscription_status", Long.class));
            verify(stripe, times(1)).subscription("sub_Fixture");
            assertFalse(disabled.status(account, installation).orElseThrow().canRepair());
            assertEquals(end, entitlements.status(account, installation).orElseThrow().subscriptionExpiresAt().toEpochSecond());
            assertFalse(entitlements.status(account, next).orElseThrow().canRepair());
            var liveStripe = mock(StripeGateway.class);
            when(liveStripe.liveMode()).thenReturn(true);
            when(liveStripe.connected()).thenReturn(true);
            var live = new DocksEntitlements(db, tx, new DocksSubscriptionSeats(db, liveStripe, true, true));
            assertFalse(live.status(account, installation).orElseThrow().canRepair());

            var billing = new DocksSubscriptions(db, tx, stripe, true, "price_Fixture", "", "", "");
            assertEquals(409, assertThrows(ResponseStatusException.class,
                    () -> billing.checkout(account, DocksSubscriptions.Plan.SINGLE_MONTHLY)).getStatusCode().value());

            doReturn(cancelled).when(stripe).subscription("sub_Fixture");
            var deletion = event("evt_Cancel", "customer.subscription.deleted", "{\"id\":\"sub_Fixture\"}");
            events.receive(deletion, sign(deletion, HOOK));
            var late = event("evt_Late", "invoice.paid",
                    "{\"parent\":{\"subscription_details\":{\"subscription\":\"sub_Fixture\"}}}");
            events.receive(late, sign(late, HOOK));
            assertEquals("canceled", db.queryForObject("SELECT provider_state FROM docks_subscription_status", String.class));
            assertNull(db.queryForObject("SELECT paid_until_epoch FROM docks_subscription_status", Long.class));
            assertEquals(3, db.queryForObject("SELECT COUNT(*) FROM docks_subscription_event", Integer.class));
            assertFalse(entitlements.status(account, installation).orElseThrow().canRepair());
        } finally { database.shutdown(); }
    }

    private static byte[] event(String id, String type, String object) {
        return """
                {"id":"%s","type":"%s","livemode":false,"api_version":"%s","data":{"object":%s}}
                """.formatted(id, type, StripeGateway.API_VERSION, object).getBytes(StandardCharsets.UTF_8);
    }

    private static String sign(byte[] body, String secret) throws Exception {
        long time = Instant.now().getEpochSecond();
        var mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        mac.update((time + ".").getBytes(StandardCharsets.UTF_8));
        return "t=" + time + ",v1=" + HexFormat.of().formatHex(mac.doFinal(body));
    }
}
