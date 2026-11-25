package com.crystalpower.website.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.crystalpower.website.repository.DocksDeviceRepository;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;
import java.util.function.BooleanSupplier;
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
                        "classpath:db/migration/V95__docks_household_members.sql",
                        "classpath:db/migration/V102__docks_stripe_mode_isolation.sql",
                        "classpath:db/migration/V103__docks_subscription_payment_risk.sql").build();
        try {
            var db = new JdbcTemplate(database);
            var tx = new TransactionTemplate(new DataSourceTransactionManager(database));
            var stripe = spy(new StripeGateway(json, false, false, "sk_test_Fixture", "whsec_FixtureWebsite",
                    "https://example.com"));
            var sandbox = new DocksBillingMode(stripe, true, true, false, HOOK);
            var events = new DocksStripeEvents(db, tx, stripe, sandbox, new DocksStripeRisk(stripe));
            var account = UUID.randomUUID();
            var attempt = UUID.randomUUID();
            db.update("INSERT INTO docks_account(id, display_name) VALUES (?, 'Fixture')", account);
            var devices = new DocksDeviceRepository(db);
            var installation = UUID.randomUUID();
            devices.enrol(account, installation, "Fixture PC");
            var next = UUID.randomUUID();
            devices.enrol(account, next, "Second PC");
            var entitlements = new DocksEntitlements(db, tx, new DocksSubscriptionSeats(db, sandbox));
            var disabled = new DocksEntitlements(db, tx, new DocksSubscriptionSeats(db,
                    new DocksBillingMode(stripe, true, false, false, HOOK)));
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
                     "latest_invoice":{"id":"in_Fixture","status":"paid","customer":"cus_Fixture","amount_paid":500,
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
            assertThrows(ResponseStatusException.class, () -> events.authenticate(completed, sign(completed, "whsec_FixtureWebsite")));
            verify(stripe, never()).subscription(anyString());
            deliver(events, completed);
            deliver(events, completed);
            assertEquals(end, db.queryForObject("SELECT paid_until_epoch FROM docks_subscription_status", Long.class));
            verify(stripe, times(1)).subscription("sub_Fixture");
            assertFalse(disabled.status(account, installation).orElseThrow().canRepair());
            assertEquals(end, entitlements.status(account, installation).orElseThrow().subscriptionExpiresAt().toEpochSecond());
            assertFalse(entitlements.status(account, next).orElseThrow().canRepair());
            var liveStripe = spy(new StripeGateway(json, false, true, "sk_live_Fixture", "whsec_FixtureWebsite",
                    "https://example.com"));
            var liveMode = new DocksBillingMode(liveStripe, true, true, true, HOOK);
            var live = new DocksEntitlements(db, tx, new DocksSubscriptionSeats(db, liveMode));
            assertFalse(live.status(account, installation).orElseThrow().canRepair());
            var liveEvents = new DocksStripeEvents(db, tx, liveStripe, liveMode, new DocksStripeRisk(liveStripe));
            assertThrows(ResponseStatusException.class, () -> deliver(liveEvents, completed));
            var crossMode = event("evt_CrossMode", "checkout.session.completed", """
                    {"id":"cs_live_Fixture","subscription":"sub_CrossMode","client_reference_id":"%s"}
                    """.formatted(attempt), true);
            deliver(liveEvents, crossMode);
            verify(liveStripe, never()).subscription(anyString());

            var billing = new DocksSubscriptions(db, tx, stripe, sandbox, "", "price_Fixture", "", "", "");
            assertEquals(409, assertThrows(ResponseStatusException.class,
                    () -> billing.checkout(account, DocksSubscriptions.Plan.SINGLE_MONTHLY)).getStatusCode().value());

            doReturn(cancelled).when(stripe).subscription("sub_Fixture");
            var deletion = event("evt_Cancel", "customer.subscription.deleted", "{\"id\":\"sub_Fixture\"}");
            deliver(events, deletion);
            var late = event("evt_Late", "invoice.paid",
                    "{\"parent\":{\"subscription_details\":{\"subscription\":\"sub_Fixture\"}}}");
            deliver(events, late);
            assertEquals("canceled", db.queryForObject("SELECT provider_state FROM docks_subscription_status", String.class));
            assertNull(db.queryForObject("SELECT paid_until_epoch FROM docks_subscription_status", Long.class));
            assertEquals(3, db.queryForObject("SELECT COUNT(*) FROM docks_subscription_event", Integer.class));
            assertFalse(entitlements.status(account, installation).orElseThrow().canRepair());

            var liveAttempt = UUID.randomUUID();
            db.update("""
                    INSERT INTO docks_subscription_checkout
                      (account_id, attempt_id, plan, stripe_price, expires_at_epoch, stripe_session, live_mode)
                    VALUES (?, ?, 'SINGLE_MONTHLY', 'price_Fixture', ?, 'cs_live_Fixture', TRUE)
                    """, account, liveAttempt, Instant.now().plusSeconds(3600).getEpochSecond());
            var liveSubscription = json.readTree(active.toString()
                    .replace("sub_Fixture", "sub_LiveFixture").replace(attempt.toString(), liveAttempt.toString())
                    .replace("\"livemode\":false", "\"livemode\":true"));
            doReturn(liveSubscription).when(liveStripe).subscription("sub_LiveFixture");
            var paid = event("evt_LiveAsync", "checkout.session.async_payment_succeeded", """
                    {"id":"cs_live_Fixture","subscription":"sub_LiveFixture","client_reference_id":"%s"}
                    """.formatted(liveAttempt), true);
            deliver(liveEvents, paid);
            assertEquals(end, live.status(account, next).orElseThrow().subscriptionExpiresAt().toEpochSecond());
            assertFalse(live.status(account, installation).orElseThrow().canRepair());
            assertFalse(entitlements.status(account, next).orElseThrow().canRepair());
            verifyPaymentRisk(liveStripe, liveEvents, liveSubscription,
                    () -> live.status(account, next).orElseThrow().canRepair());
            assertTrue(events.recentPaymentReviews().isEmpty());
        } finally { database.shutdown(); }
    }

    private void verifyPaymentRisk(StripeGateway stripe, DocksStripeEvents events, JsonNode paidSubscription,
                                   BooleanSupplier entitled) throws Exception {
        var charge = json.createObjectNode().put("object", "charge").put("id", "ch_Fixture").put("livemode", true)
                .put("customer", "cus_Fixture").put("payment_intent", "pi_Fixture")
                .put("refunded", false).put("amount_refunded", 100);
        doReturn(charge).when(stripe).charge("ch_Fixture");
        var payments = json.readTree("""
                [{"invoice":"in_Fixture","object":"invoice_payment","status":"paid","livemode":true,
                  "payment":{"type":"payment_intent","payment_intent":"pi_Fixture"}}]
                """);
        doReturn(payments).when(stripe).docksPaidInvoicePayments("pi_Fixture");
        doReturn(json.readTree("""
                {"id":"in_Fixture","object":"invoice","livemode":true,"customer":"cus_Fixture",
                 "parent":{"type":"subscription_details","subscription_details":{"subscription":"sub_LiveFixture"}}}
                """)).when(stripe).invoice("in_Fixture");
        String chargeObject = "{\"id\":\"ch_Fixture\"}";
        send(events, "evt_Partial", "charge.refunded", chargeObject);
        assertTrue(entitled.getAsBoolean());
        assertEquals("partially_refunded", events.recentPaymentReviews().get(0).outcome());

        var fraud = json.createObjectNode().put("id", "issfr_Fixture").put("object", "radar.early_fraud_warning")
                .put("livemode", true).put("charge", "ch_Fixture").put("actionable", true);
        doReturn(fraud).when(stripe).docksFraudWarning("issfr_Fixture");
        String fraudEvent = "{\"id\":\"issfr_Fixture\",\"charge\":\"ch_Fixture\"}";
        send(events, "evt_Warning", "radar.early_fraud_warning.created", fraudEvent);
        assertFalse(entitled.getAsBoolean());
        send(events, "evt_Warning", "radar.early_fraud_warning.created", fraudEvent);
        verify(stripe, times(1)).docksFraudWarning("issfr_Fixture");

        var dispute = json.createObjectNode().put("id", "dp_Fixture").put("object", "dispute").put("livemode", true)
                .put("charge", "ch_Fixture").put("payment_intent", "pi_Fixture").put("status", "needs_response");
        doReturn(dispute).when(stripe).dispute("dp_Fixture");
        String disputeEvent = "{\"id\":\"dp_Fixture\",\"charge\":\"ch_Fixture\"}";
        send(events, "evt_OpenedDispute", "charge.dispute.created", disputeEvent);
        assertFalse(entitled.getAsBoolean());
        dispute.put("status", "won");
        send(events, "evt_WonDispute", "charge.dispute.closed", disputeEvent);
        assertTrue(entitled.getAsBoolean());
        send(events, "evt_OldDispute", "charge.dispute.created", disputeEvent);
        assertTrue(entitled.getAsBoolean());

        charge.put("refunded", true).put("amount_refunded", 500);
        send(events, "evt_Full", "charge.refunded", chargeObject);
        assertFalse(entitled.getAsBoolean());
        String subscriptionInvoice = "{\"parent\":{\"subscription_details\":{\"subscription\":\"sub_LiveFixture\"}}}";
        send(events, "evt_LatePaid", "invoice.paid", subscriptionInvoice);
        assertFalse(entitled.getAsBoolean());
        var renewal = paidSubscription.deepCopy();
        ((ObjectNode) renewal.path("latest_invoice")).put("id", "in_Renewal");
        doReturn(renewal).when(stripe).subscription("sub_LiveFixture");
        send(events, "evt_Renewal", "invoice.paid", subscriptionInvoice);
        assertTrue(entitled.getAsBoolean());
        send(events, "evt_LateRefund", "charge.refunded", chargeObject);
        assertTrue(entitled.getAsBoolean());
        assertTrue(events.recentPaymentReviews().stream().anyMatch(item ->
                item.invoiceId().equals("in_Fixture") && item.outcome().equals("fully_refunded") && item.holdsAccess()));
    }

    private static void send(DocksStripeEvents events, String id, String type, String object) throws Exception {
        byte[] body = event(id, type, object, true);
        deliver(events, body);
    }

    private static void deliver(DocksStripeEvents events, byte[] body) throws Exception {
        events.authenticate(body, sign(body, HOOK)).ifPresent(events::process);
    }

    private static byte[] event(String id, String type, String object) {
        return event(id, type, object, false);
    }

    private static byte[] event(String id, String type, String object, boolean live) {
        return """
                {"id":"%s","type":"%s","livemode":%b,"api_version":"%s","data":{"object":%s}}
                """.formatted(id, type, live, StripeGateway.API_VERSION, object).getBytes(StandardCharsets.UTF_8);
    }

    private static String sign(byte[] body, String secret) throws Exception {
        long time = Instant.now().getEpochSecond();
        var mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        mac.update((time + ".").getBytes(StandardCharsets.UTF_8));
        return "t=" + time + ",v1=" + HexFormat.of().formatHex(mac.doFinal(body));
    }
}
