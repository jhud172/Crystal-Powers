package com.crystalpower.website;

import static org.junit.jupiter.api.Assertions.*;

import com.crystalpower.website.service.DocksDiagnosticLogs;
import com.crystalpower.website.service.DocksReports;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.transaction.support.TransactionTemplate;

class DocksDiagnosticLogsTests {
    @Test
    void logsRequireFreshApprovalAndOwnershipAndExpireOrDeleteIndependently() {
        var database = new EmbeddedDatabaseBuilder().generateUniqueName(true).setType(EmbeddedDatabaseType.H2)
                .addScripts("classpath:db/migration/V87__docks_accounts_and_devices.sql",
                        "classpath:db/migration/V91__docks_report_sync.sql",
                        "classpath:db/migration/V97__docks_report_support_access.sql",
                        "classpath:db/migration/V101__docks_diagnostic_log_sharing.sql").build();
        try {
            var db = new JdbcTemplate(database);
            var tx = new TransactionTemplate(new DataSourceTransactionManager(database));
            var logs = new DocksDiagnosticLogs(db, tx, new ObjectMapper());
            var reports = new DocksReports(db, tx);
            UUID account = UUID.randomUUID(), other = UUID.randomUUID(), owner = UUID.randomUUID();
            UUID installation = UUID.randomUUID(), device = UUID.randomUUID();
            for (UUID id : List.of(account, other))
                db.update("INSERT INTO docks_account(id, display_name) VALUES (?, 'Fixture')", id);
            db.update("INSERT INTO docks_device(id, account_id, installation_id, label) VALUES (?, ?, ?, 'Private label')",
                    device, account, installation);
            var checked = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1).withNano(0);
            var readings = new DocksDiagnosticLogs.Readings(0, 40, null, 8, 5120L, null, 140,
                    DocksDiagnosticLogs.DriveStatus.UNKNOWN);
            var approved = new DocksDiagnosticLogs.Request(installation, checked, readings, true);
            assertTrue(logs.share(other, approved).isEmpty());
            assertTrue(logs.share(account, new DocksDiagnosticLogs.Request(installation, checked, readings, false)).isEmpty());
            assertTrue(logs.share(account, new DocksDiagnosticLogs.Request(installation, checked.minusDays(8), readings, true)).isEmpty());
            var first = logs.share(account, approved).orElseThrow();
            assertFalse(reports.read(account).enabled());
            assertNull(logs.state(other).grant());
            assertTrue(reports.openForSupport(owner, first.reference()).isEmpty());
            assertTrue(reports.supportState(account).activity().isEmpty());
            assertEquals(readings, logs.open(owner, first.reference()).orElseThrow().readings());
            assertEquals("VIEWED", logs.state(account).activity().get(0).action());
            assertEquals(owner, db.queryForObject("SELECT owner_actor FROM docks_report_support_audit WHERE action='VIEWED'", UUID.class));
            reports.clear(account);
            assertEquals(first.reference(), logs.state(account).grant().reference());
            var second = logs.share(account, approved).orElseThrow();
            assertTrue(logs.open(owner, first.reference()).isEmpty());
            logs.revoke(other);
            assertEquals(second.reference(), logs.state(account).grant().reference());
            logs.revoke(account);
            assertTrue(logs.open(owner, second.reference()).isEmpty());
            assertEquals(0, db.queryForObject("SELECT COUNT(*) FROM docks_support_diagnostic_log", Integer.class));
            var expiring = logs.share(account, approved).orElseThrow();
            db.update("UPDATE docks_support_diagnostic_log SET expires_at = ? WHERE account_id = ?", checked, account);
            assertNull(logs.state(account).grant());
            assertTrue(logs.open(owner, expiring.reference()).isEmpty());
            assertEquals(1, logs.purgeExpired());
            logs.share(account, approved).orElseThrow();
            db.update("DELETE FROM docks_device WHERE id = ?", device);
            assertNull(logs.state(account).grant());
        } finally {
            database.shutdown();
        }
    }
}
