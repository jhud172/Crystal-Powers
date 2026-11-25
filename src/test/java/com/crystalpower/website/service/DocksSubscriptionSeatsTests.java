package com.crystalpower.website.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.crystalpower.website.repository.DocksDeviceRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.transaction.support.TransactionTemplate;

class DocksSubscriptionSeatsTests {
    @Test
    void concurrentHouseholdClaimsRespectTheCapAndRemovalFreesASeat() throws Exception {
        var database = new EmbeddedDatabaseBuilder().generateUniqueName(true).setType(EmbeddedDatabaseType.H2)
                .addScripts("classpath:db/migration/V87__docks_accounts_and_devices.sql",
                        "classpath:db/migration/V89__docks_trial.sql",
                        "classpath:db/migration/V90__docks_access_keys.sql",
                        "classpath:db/migration/V92__docks_subscription_checkout.sql",
                        "classpath:db/migration/V93__docks_subscription_status.sql",
                        "classpath:db/migration/V94__docks_subscription_seats.sql").build();
        var workers = Executors.newFixedThreadPool(6);
        try {
            var db = new JdbcTemplate(database);
            var devices = new DocksDeviceRepository(db);
            var stripe = mock(StripeGateway.class);
            when(stripe.connected()).thenReturn(true);
            var seats = new DocksSubscriptionSeats(db, stripe, true, true);
            var entitlements = new DocksEntitlements(db,
                    new TransactionTemplate(new DataSourceTransactionManager(database)), seats);

            var owner = UUID.randomUUID();
            var outsider = UUID.randomUUID();
            for (var account : new UUID[] {owner, outsider})
                db.update("INSERT INTO docks_account (id, display_name) VALUES (?, 'Fixture')", account);
            var attempt = UUID.randomUUID();
            long expiry = Instant.now().plusSeconds(3600).getEpochSecond();
            db.update("""
                    INSERT INTO docks_subscription_checkout (account_id, attempt_id, plan, stripe_price, expires_at_epoch)
                    VALUES (?, ?, 'HOUSEHOLD_ANNUAL', 'price_Fixture', ?)
                    """, owner, attempt, expiry);
            db.update("""
                    INSERT INTO docks_subscription_status
                        (stripe_subscription_id, attempt_id, provider_state, paid_until_epoch, updated_at_epoch)
                    VALUES ('sub_Fixture', ?, 'paid', ?, ?)
                    """, attempt, expiry, Instant.now().getEpochSecond());

            var enrolled = new ArrayList<DocksDeviceRepository.Device>();
            for (int i = 0; i < 6; i++) enrolled.add(devices.enrol(owner, UUID.randomUUID(), "Fixture PC"));
            var outsiderDevice = devices.enrol(outsider, enrolled.get(0).installationId(), "Other PC");
            assertFalse(entitlements.status(outsider, outsiderDevice.installationId()).orElseThrow().canRepair());
            assertTrue(entitlements.status(owner, UUID.randomUUID()).isEmpty());

            var start = new CountDownLatch(1);
            var attempts = enrolled.stream().map(device -> workers.submit(() -> {
                start.await();
                return entitlements.status(owner, device.installationId()).orElseThrow().canRepair();
            })).toList();
            start.countDown();
            var results = new ArrayList<Boolean>();
            for (var pending : attempts) results.add(pending.get(10, TimeUnit.SECONDS));
            assertEquals(5L, results.stream().filter(Boolean::booleanValue).count());
            var winner = enrolled.get(results.indexOf(true));
            var waiting = enrolled.get(results.indexOf(false));
            assertTrue(entitlements.status(owner, winner.installationId()).orElseThrow().canRepair());
            assertFalse(devices.removeOwnedBy(outsider, winner.id()));
            assertTrue(devices.removeOwnedBy(owner, winner.id()));
            assertTrue(entitlements.status(owner, waiting.installationId()).orElseThrow().canRepair());

            db.update("UPDATE docks_subscription_status SET paid_until_epoch = ?", Instant.now().getEpochSecond() - 1);
            assertFalse(entitlements.status(owner, waiting.installationId()).orElseThrow().canRepair());
        } finally {
            workers.shutdownNow();
            database.shutdown();
        }
    }
}
