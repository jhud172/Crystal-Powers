package com.crystalpower.website;

import static org.junit.jupiter.api.Assertions.*;
import com.crystalpower.website.service.DocksEntitlements;
import java.time.OffsetDateTime;
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

class DocksEntitlementsTests {
    @Test
    void concurrentActivationHasOneWinnerAndAnExpiredTrialCannotRestart() throws Exception {
        var db = new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2).generateUniqueName(true)
                .addScripts("classpath:db/migration/V87__docks_accounts_and_devices.sql",
                            "classpath:db/migration/V89__docks_trial.sql",
                            "classpath:db/migration/V90__docks_access_keys.sql").build();
        var workers = Executors.newFixedThreadPool(2);
        try {
            var jdbc = new JdbcTemplate(db);
            var service = new DocksEntitlements(jdbc, new TransactionTemplate(new DataSourceTransactionManager(db)));
            UUID account = UUID.randomUUID(), first = UUID.randomUUID(), second = UUID.randomUUID();
            jdbc.update("INSERT INTO docks_account(id, display_name) VALUES (?, 'Owner')", account);
            for (var installation : new UUID[] {first, second}) {
                jdbc.update("INSERT INTO docks_device(id, account_id, installation_id, label) VALUES (?, ?, ?, 'PC')",
                        UUID.randomUUID(), account, installation);
            }
            assertTrue(service.status(account, first).orElseThrow().canStartTrial());
            assertTrue(service.startTrial(UUID.randomUUID(), first).isEmpty());
            assertTrue(service.status(account, UUID.randomUUID()).isEmpty());

            var start = new CountDownLatch(1);
            var a = workers.submit(() -> { start.await(); return service.startTrial(account, first).orElseThrow(); });
            var b = workers.submit(() -> { start.await(); return service.startTrial(account, second).orElseThrow(); });
            start.countDown();
            var x = a.get(5, TimeUnit.SECONDS);
            var y = b.get(5, TimeUnit.SECONDS);
            assertNotEquals(x.canRepair(), y.canRepair());
            assertEquals(x.trialExpiresAt(), y.trialExpiresAt());
            var winner = x.canRepair() ? first : second;
            assertTrue(service.startTrial(account, winner).orElseThrow().canRepair());
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM docks_trial", Integer.class));
            long hours = java.time.Duration.between(OffsetDateTime.now(), x.trialExpiresAt()).toHours();
            assertTrue(hours >= 167 && hours <= 168);

            var past = OffsetDateTime.now().minusDays(1);
            jdbc.update("UPDATE docks_trial SET started_at = ?, expires_at = ? WHERE account_id = ?",
                    past.minusDays(7), past, account);
            assertFalse(service.startTrial(account, winner).orElseThrow().canRepair());
            assertFalse(service.status(account, winner).orElseThrow().canStartTrial());
            jdbc.update("DELETE FROM docks_device WHERE account_id = ? AND installation_id = ?", account, winner);
            assertTrue(service.status(account, winner).isEmpty());
        } finally {
            workers.shutdownNow();
            db.shutdown();
        }
    }
}
