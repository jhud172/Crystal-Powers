package com.crystalpower.website.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.crystalpower.website.repository.DocksDeviceRepository;
import java.time.Instant;
import java.time.OffsetDateTime;
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
import org.springframework.web.server.ResponseStatusException;

class DocksSubscriptionSeatsTests {
    @Test
    void invitedAdultsShareTheCapWithoutSharingReports() throws Exception {
        var database = new EmbeddedDatabaseBuilder().generateUniqueName(true).setType(EmbeddedDatabaseType.H2)
                .addScripts("classpath:db/migration/V87__docks_accounts_and_devices.sql",
                        "classpath:db/migration/V89__docks_trial.sql",
                        "classpath:db/migration/V90__docks_access_keys.sql",
                        "classpath:db/migration/V91__docks_report_sync.sql",
                        "classpath:db/migration/V92__docks_subscription_checkout.sql",
                        "classpath:db/migration/V93__docks_subscription_status.sql",
                        "classpath:db/migration/V94__docks_subscription_seats.sql",
                        "classpath:db/migration/V95__docks_household_members.sql",
                        "classpath:db/migration/V102__docks_stripe_mode_isolation.sql").build();
        var workers = Executors.newFixedThreadPool(6);
        try {
            var db = new JdbcTemplate(database);
            var devices = new DocksDeviceRepository(db);
            var stripe = mock(StripeGateway.class);
            when(stripe.connected()).thenReturn(true);
            var seats = new DocksSubscriptionSeats(db, new DocksBillingMode(stripe, true, true, false, ""));
            var tx = new TransactionTemplate(new DataSourceTransactionManager(database));
            var entitlements = new DocksEntitlements(db, tx, seats);
            var households = new DocksHouseholds(db, seats);
            var reports = new DocksReports(db, tx);

            var owner = UUID.randomUUID();
            var member = UUID.randomUUID();
            var outsider = UUID.randomUUID();
            for (var account : new UUID[] {owner, member, outsider})
                db.update("INSERT INTO docks_account (id, display_name) VALUES (?, 'Fixture')", account);
            db.update("INSERT INTO docks_identity (issuer, subject, account_id) VALUES (?, 'adult@example.com', ?)",
                    DocksEmailSignIn.ISSUER, member);
            db.update("INSERT INTO docks_identity (issuer, subject, account_id) VALUES (?, 'owner@example.com', ?)",
                    DocksEmailSignIn.ISSUER, owner);
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
            for (int i = 0; i < 6; i++)
                enrolled.add(devices.enrol(i < 3 ? owner : member, UUID.randomUUID(), "Fixture PC " + i));
            var outsiderDevice = devices.enrol(outsider, enrolled.get(0).installationId(), "Other PC");
            assertFalse(entitlements.status(outsider, outsiderDevice.installationId()).orElseThrow().canRepair());
            assertTrue(entitlements.status(owner, UUID.randomUUID()).isEmpty());

            tx.executeWithoutResult(t -> households.invite(owner, "Adult@Example.com"));
            var invitation = households.view(owner).invitations().get(0);
            assertEquals("adult@example.com", invitation.email());
            var received = households.view(member).invitations().get(0);
            assertEquals(invitation.id(), received.id());
            assertEquals("owner@example.com", received.email());
            assertTrue(households.view(outsider).invitations().isEmpty());
            assertFalse(entitlements.status(member, enrolled.get(3).installationId()).orElseThrow().canRepair());
            assertEquals(404, assertThrows(ResponseStatusException.class, () ->
                    tx.executeWithoutResult(t -> households.accept(outsider, invitation.id()))).getStatusCode().value());
            tx.executeWithoutResult(t -> households.accept(member, invitation.id()));
            assertTrue(households.view(member).invitations().get(0).accepted());
            assertTrue(entitlements.preview(member, enrolled.get(3).installationId()).orElseThrow().canRepair());
            assertEquals(0, db.queryForObject("SELECT COUNT(*) FROM docks_subscription_seat", Integer.class));
            assertFalse(entitlements.preview(outsider, outsiderDevice.installationId()).orElseThrow().canRepair());

            reports.setEnabled(owner, true);
            reports.setEnabled(member, true);
            assertEquals(DocksReports.Upload.SAVED, reports.upload(member, enrolled.get(3).installationId(),
                    OffsetDateTime.now(), 12, 34));
            assertTrue(reports.read(owner).reports().isEmpty());
            assertEquals(1, reports.read(member).reports().size());
            assertFalse(devices.removeOwnedBy(owner, enrolled.get(3).id()));

            var start = new CountDownLatch(1);
            var attempts = java.util.stream.IntStream.range(0, enrolled.size()).mapToObj(i -> workers.submit(() -> {
                start.await();
                return entitlements.status(i < 3 ? owner : member, enrolled.get(i).installationId())
                        .orElseThrow().canRepair();
            })).toList();
            start.countDown();
            var results = new ArrayList<Boolean>();
            for (var pending : attempts) results.add(pending.get(10, TimeUnit.SECONDS));
            assertEquals(5L, results.stream().filter(Boolean::booleanValue).count());
            int unseated = results.indexOf(false);
            assertFalse(entitlements.preview(unseated < 3 ? owner : member, enrolled.get(unseated).installationId()).orElseThrow().canRepair());
            tx.executeWithoutResult(t -> households.remove(owner, invitation.id()));
            assertFalse(entitlements.status(member, enrolled.get(3).installationId()).orElseThrow().canRepair());
            assertEquals(1, reports.read(member).reports().size());
            var replacement = devices.enrol(owner, UUID.randomUUID(), "Replacement PC");
            assertTrue(entitlements.status(owner, replacement.installationId()).orElseThrow().canRepair());

            db.update("UPDATE docks_subscription_status SET paid_until_epoch = ?", Instant.now().getEpochSecond() - 1);
            assertFalse(entitlements.status(owner, replacement.installationId()).orElseThrow().canRepair());
        } finally {
            workers.shutdownNow();
            database.shutdown();
        }
    }
}
