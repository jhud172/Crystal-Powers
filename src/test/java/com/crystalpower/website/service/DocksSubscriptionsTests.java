package com.crystalpower.website.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.crystalpower.website.api.DocksSubscriptionsController;
import com.crystalpower.website.security.AttemptLimiter;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

class DocksSubscriptionsTests {
    @Test
    void checkoutIsTestOnlyAndRetriesDoNotOpenAnotherSession() {
        var database = new EmbeddedDatabaseBuilder().generateUniqueName(true).setType(EmbeddedDatabaseType.H2)
                .addScripts("classpath:db/migration/V87__docks_accounts_and_devices.sql",
                            "classpath:db/migration/V92__docks_subscription_checkout.sql",
                            "classpath:db/migration/V93__docks_subscription_status.sql",
                            "classpath:db/migration/V95__docks_household_members.sql",
                            "classpath:db/migration/V102__docks_stripe_mode_isolation.sql").build();
        try {
            var jdbc = new JdbcTemplate(database);
            var tx = new TransactionTemplate(new DataSourceTransactionManager(database));
            var stripe = mock(StripeGateway.class);
            when(stripe.connected()).thenReturn(true);
            when(stripe.docksCheckout(any(), any(), eq("price_monthly"), anyLong())).thenAnswer(call ->
                    new StripeGateway.Checkout("cs_test_preview", "https://checkout.stripe.com/c/pay/cs_test_preview",
                        call.getArgument(3)));
            var billing = new DocksSubscriptions(jdbc, tx, stripe, new DocksBillingMode(stripe, true, false, false, true, ""),
                    "bpc_IgnoredLive", "bpc_TestFixture",
                    "price_monthly", "price_annual", "price_householdMonthly", "price_householdAnnual");
            UUID account = UUID.randomUUID();
            jdbc.update("INSERT INTO docks_account (id, display_name) VALUES (?, ?)", account, "Fixture");
            assertEquals(4, billing.availablePlans().size());
            var first = billing.checkout(account, DocksSubscriptions.Plan.SINGLE_MONTHLY);
            assertTrue(first.testMode());
            assertEquals(first, billing.checkout(account, DocksSubscriptions.Plan.SINGLE_MONTHLY));
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM docks_subscription_checkout", Integer.class));
            verify(stripe, times(1)).docksCheckout(eq(account), any(), eq("price_monthly"), anyLong());
            assertEquals(409, assertThrows(ResponseStatusException.class,
                    () -> billing.checkout(account, DocksSubscriptions.Plan.SINGLE_ANNUAL)).getStatusCode().value());
            jdbc.update("""
                    INSERT INTO docks_subscription_status
                        (stripe_subscription_id, attempt_id, provider_state, updated_at_epoch)
                    SELECT 'sub_ended', attempt_id, 'canceled', 1 FROM docks_subscription_checkout
                    """);
            var testAttempt = jdbc.queryForObject("SELECT attempt_id FROM docks_subscription_checkout", UUID.class);
            var testSubscription = new ObjectMapper().createObjectNode().put("id", "sub_ended")
                    .put("object", "subscription").put("livemode", true).put("customer", "cus_TestFixture");
            testSubscription.putObject("metadata").put("docks_checkout_attempt", testAttempt.toString())
                    .put("docks_account_id", account.toString());
            when(stripe.subscription("sub_ended")).thenReturn(testSubscription);
            assertEquals(502, assertThrows(ResponseStatusException.class, () -> billing.portal(account)).getStatusCode().value());
            verify(stripe, never()).docksPortal(anyString(), anyString());
            testSubscription.put("livemode", false);
            when(stripe.docksPortal("cus_TestFixture", "bpc_TestFixture")).thenReturn("https://billing.stripe.com/p/session/testFixture");
            assertEquals(new DocksSubscriptions.Link("https://billing.stripe.com/p/session/testFixture", true), billing.portal(account));
            when(stripe.docksCheckout(any(), any(), eq("price_annual"), anyLong())).thenAnswer(call ->
                    new StripeGateway.Checkout("cs_test_replacement",
                        "https://checkout.stripe.com/c/pay/cs_test_replacement", call.getArgument(3)));
            assertNotEquals(first, billing.checkout(account, DocksSubscriptions.Plan.SINGLE_ANNUAL));
            assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM docks_subscription_checkout", Integer.class));
            when(stripe.liveMode()).thenReturn(true);
            assertTrue(billing.availablePlans().isEmpty());
            assertEquals(503, assertThrows(ResponseStatusException.class,
                    () -> billing.checkout(account, DocksSubscriptions.Plan.SINGLE_MONTHLY)).getStatusCode().value());
            var liveMode = new DocksBillingMode(stripe, true, false, true, true, "whsec_Fixture");
            var live = new DocksSubscriptions(jdbc, tx, stripe, liveMode, "bpc_Fixture", "bpc_IgnoredTest",
                    "price_liveMonthly", "price_liveAnnual", "price_liveHouseholdMonthly", "price_liveHouseholdAnnual");
            assertEquals(4, live.availablePlans().size());
            assertTrue(live.latestStatus(account).isEmpty());
            var auth = mock(DocksEmailSignIn.class);
            when(auth.account("Bearer fixture")).thenReturn(Optional.of(account));
            var limiter = mock(AttemptLimiter.class);
            var liveController = new DocksSubscriptionsController(auth, live, limiter);
            var livePlans = assertInstanceOf(DocksSubscriptionsController.Billing.class,
                    liveController.plans("Bearer fixture").getBody());
            assertEquals(Map.of(DocksSubscriptions.Plan.SINGLE_MONTHLY, 1299,
                    DocksSubscriptions.Plan.SINGLE_ANNUAL, 9999,
                    DocksSubscriptions.Plan.HOUSEHOLD_MONTHLY, 2499,
                    DocksSubscriptions.Plan.HOUSEHOLD_ANNUAL, 17999), livePlans.pricePence());
            when(stripe.liveMode()).thenReturn(false);
            var sandboxController = new DocksSubscriptionsController(auth, billing, limiter);
            var sandboxPlans = assertInstanceOf(DocksSubscriptionsController.Billing.class,
                    sandboxController.plans("Bearer fixture").getBody());
            assertTrue(sandboxPlans.testMode());
            assertFalse(sandboxPlans.plans().isEmpty());
            assertTrue(sandboxPlans.pricePence().isEmpty());
            when(stripe.liveMode()).thenReturn(true);
            assertEquals(404, assertThrows(ResponseStatusException.class, () -> live.portal(account)).getStatusCode().value());
            when(stripe.docksCheckout(any(), any(), eq("price_liveMonthly"), anyLong())).thenAnswer(call ->
                    new StripeGateway.Checkout("cs_live_Fixture", "https://checkout.stripe.com/c/pay/cs_live_Fixture",
                        call.getArgument(3)));
            assertFalse(live.checkout(account, DocksSubscriptions.Plan.SINGLE_MONTHLY).testMode());
            verify(stripe).verifyDocksPrice("price_liveMonthly", DocksSubscriptions.Plan.SINGLE_MONTHLY);
            var attemptId = jdbc.queryForObject("SELECT attempt_id FROM docks_subscription_checkout WHERE live_mode = TRUE", UUID.class);
            jdbc.update("UPDATE docks_subscription_checkout SET expires_at_epoch = 1 WHERE attempt_id = ?", attemptId);
            var provider = new ObjectMapper().createObjectNode().put("id", "cs_live_Fixture")
                    .put("client_reference_id", attemptId.toString()).put("status", "complete");
            when(stripe.session("cs_live_Fixture")).thenReturn(provider);
            assertEquals(409, assertThrows(ResponseStatusException.class,
                    () -> live.checkout(account, DocksSubscriptions.Plan.SINGLE_MONTHLY)).getStatusCode().value());
            jdbc.update("""
                    INSERT INTO docks_subscription_status (stripe_subscription_id, attempt_id, provider_state, updated_at_epoch)
                    VALUES ('sub_liveFixture', ?, 'paid', 1)
                    """, attemptId);
            var subscription = new ObjectMapper().createObjectNode().put("id", "sub_liveFixture")
                    .put("object", "subscription").put("livemode", true).put("customer", "cus_LiveFixture");
            var metadata = subscription.putObject("metadata").put("docks_checkout_attempt", attemptId.toString());
            metadata.put("docks_account_id", UUID.randomUUID().toString());
            when(stripe.subscription("sub_liveFixture")).thenReturn(subscription);
            assertEquals(502, assertThrows(ResponseStatusException.class, () -> live.portal(account)).getStatusCode().value());
            verify(stripe, never()).docksPortal(eq("cus_LiveFixture"), anyString());
            metadata.put("docks_account_id", account.toString());
            when(stripe.docksPortal("cus_LiveFixture", "bpc_Fixture")).thenReturn("https://billing.stripe.com/p/session/liveFixture");
            assertEquals("https://billing.stripe.com/p/session/liveFixture", live.portal(account).url());

            var pausedMode = new DocksBillingMode(stripe, true, false, true, false, "whsec_Fixture");
            var paused = new DocksSubscriptions(jdbc, tx, stripe, pausedMode, "bpc_Fixture", "bpc_IgnoredTest",
                    "price_liveMonthly", "price_liveAnnual", "price_liveHouseholdMonthly", "price_liveHouseholdAnnual");
            assertTrue(paused.availablePlans().isEmpty());
            assertEquals(503, assertThrows(ResponseStatusException.class,
                    () -> paused.checkout(account, DocksSubscriptions.Plan.SINGLE_MONTHLY)).getStatusCode().value());
            assertEquals("paid", paused.latestStatus(account).orElseThrow().state());
            assertEquals("https://billing.stripe.com/p/session/liveFixture", paused.portal(account).url());
            verify(stripe, times(1)).docksCheckout(any(), any(), eq("price_liveMonthly"), anyLong());
        } finally {
            database.shutdown();
        }
    }

    @Test
    void subscriptionCheckoutUsesTheConfiguredPriceAndDocksReturnPath() {
        var gateway = new StripeGateway(new ObjectMapper(), false, false, "", "", "https://example.com");
        var attempt = UUID.randomUUID();
        var account = UUID.randomUUID();
        var fields = gateway.docksCheckoutFields(account, attempt, "price_annual", 1234);
        assertEquals("subscription", fields.get("mode"));
        assertFalse(fields.containsKey("payment_method_types[0]"));
        assertEquals("price_annual", fields.get("line_items[0][price]"));
        assertEquals(attempt.toString(), fields.get("client_reference_id"));
        assertEquals(account.toString(), fields.get("subscription_data[metadata][docks_account_id]"));
        assertEquals("https://example.com/docks/reports?checkout=returned", fields.get("success_url"));
    }
}
