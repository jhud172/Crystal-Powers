package com.crystalpower.website.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
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
            var billing = new DocksSubscriptions(jdbc, tx, stripe, new DocksBillingMode(stripe, true, false, false, ""), "",
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
            when(stripe.docksCheckout(any(), any(), eq("price_annual"), anyLong())).thenAnswer(call ->
                    new StripeGateway.Checkout("cs_test_replacement",
                        "https://checkout.stripe.com/c/pay/cs_test_replacement", call.getArgument(3)));
            assertNotEquals(first, billing.checkout(account, DocksSubscriptions.Plan.SINGLE_ANNUAL));
            assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM docks_subscription_checkout", Integer.class));
            when(stripe.liveMode()).thenReturn(true);
            assertTrue(billing.availablePlans().isEmpty());
            assertEquals(503, assertThrows(ResponseStatusException.class,
                    () -> billing.checkout(account, DocksSubscriptions.Plan.SINGLE_MONTHLY)).getStatusCode().value());
            var liveMode = new DocksBillingMode(stripe, true, false, true, "whsec_Fixture");
            var live = new DocksSubscriptions(jdbc, tx, stripe, liveMode, "bpc_Fixture",
                    "price_liveMonthly", "price_liveAnnual", "price_liveHouseholdMonthly", "price_liveHouseholdAnnual");
            assertEquals(4, live.availablePlans().size());
            assertTrue(live.latestStatus(account).isEmpty());
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
            verify(stripe, never()).docksPortal(anyString(), anyString());
            metadata.put("docks_account_id", account.toString());
            when(stripe.docksPortal("cus_LiveFixture", "bpc_Fixture")).thenReturn("https://billing.stripe.com/p/session/liveFixture");
            assertEquals("https://billing.stripe.com/p/session/liveFixture", live.portal(account).url());
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
