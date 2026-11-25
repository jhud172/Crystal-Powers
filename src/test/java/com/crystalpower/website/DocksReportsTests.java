package com.crystalpower.website;

import static org.junit.jupiter.api.Assertions.*;
import com.crystalpower.website.service.DocksReports;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.transaction.support.TransactionTemplate;

class DocksReportsTests {
    @Test
    void reportsRequireOwnershipAndConsentAndRespectClearingAndRetention() {
        var database = new EmbeddedDatabaseBuilder().generateUniqueName(true).setType(EmbeddedDatabaseType.H2)
                .addScripts("classpath:db/migration/V87__docks_accounts_and_devices.sql",
                            "classpath:db/migration/V91__docks_report_sync.sql",
                            "classpath:db/migration/V96__docks_report_retention.sql",
                            "classpath:db/migration/V97__docks_report_support_access.sql",
                            "classpath:db/migration/V101__docks_diagnostic_log_sharing.sql").build();
        try {
            var jdbc = new JdbcTemplate(database);
            var reports = new DocksReports(jdbc, new TransactionTemplate(new DataSourceTransactionManager(database)));
            UUID owner = UUID.randomUUID(), unrelated = UUID.randomUUID(), installation = UUID.randomUUID();
            jdbc.update("INSERT INTO docks_account (id, display_name) VALUES (?, ?)", owner, "Owner");
            jdbc.update("INSERT INTO docks_account (id, display_name) VALUES (?, ?)", unrelated, "Other");
            jdbc.update("INSERT INTO docks_device (id, account_id, installation_id, label) VALUES (?, ?, ?, ?)",
                    UUID.randomUUID(), owner, installation, "Test PC");

            var checked = OffsetDateTime.now(ZoneOffset.UTC).withNano(0).minusMinutes(2);
            assertFalse(reports.read(owner).enabled());
            assertTrue(reports.grantSupport(owner).isEmpty());
            assertEquals(DocksReports.Upload.DISABLED, reports.upload(owner, installation, checked, 17, 30));
            reports.setEnabled(owner, true);
            reports.setEnabled(owner, true);
            reports.setEnabled(unrelated, true);
            assertEquals(DocksReports.Upload.DEVICE_UNKNOWN, reports.upload(unrelated, installation, checked, 17, 30));
            assertEquals(DocksReports.Upload.INVALID, reports.upload(owner, installation, checked, -1, 80));
            assertEquals(DocksReports.Upload.INVALID, reports.upload(owner, installation, checked, null, null));
            assertEquals(DocksReports.Upload.SAVED, reports.upload(owner, installation, checked, 17, 30));
            assertEquals(DocksReports.Upload.SAVED, reports.upload(owner, installation, checked.plusMinutes(1), null, 35));
            assertEquals(DocksReports.Upload.UNCHANGED, reports.upload(owner, installation, checked, 70, 80));
            assertTrue(reports.read(unrelated).reports().isEmpty());
            assertEquals(1, reports.read(owner).reports().size());
            assertNull(reports.read(owner).reports().get(0).cpuPercent());
            assertEquals(35, reports.read(owner).reports().get(0).memoryPercent());

            reports.setEnabled(owner, false);
            assertFalse(reports.read(owner).enabled());
            assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM docks_device_report", Integer.class));
            assertEquals(DocksReports.Upload.DISABLED, reports.upload(owner, installation, checked, 10, 25));
            reports.setEnabled(owner, true);
            assertTrue(reports.read(owner).reports().isEmpty());

            UUID otherDevice = UUID.randomUUID(), otherInstallation = UUID.randomUUID();
            jdbc.update("INSERT INTO docks_device (id, account_id, installation_id, label) VALUES (?, ?, ?, ?)",
                    otherDevice, unrelated, otherInstallation, "Other PC");
            assertEquals(DocksReports.Upload.SAVED, reports.upload(unrelated, otherInstallation, checked, 10, 25));
            assertEquals(DocksReports.Upload.SAVED, reports.upload(owner, installation, checked, 10, 25));
            var actor = UUID.randomUUID();
            var grant = reports.grantSupport(owner).orElseThrow();
            assertEquals(grant.reference(), reports.grantSupport(owner).orElseThrow().reference());
            assertNull(reports.supportState(unrelated).grant());
            assertTrue(reports.openForSupport(actor, UUID.randomUUID()).isEmpty());
            var opened = reports.openForSupport(actor, grant.reference()).orElseThrow();
            assertEquals(1, opened.reports().size());
            assertEquals("Test PC", opened.reports().get(0).deviceLabel());
            assertEquals("VIEWED", reports.supportState(owner).activity().get(0).action());
            assertEquals(actor, jdbc.queryForObject("SELECT owner_actor FROM docks_report_support_audit WHERE action = 'VIEWED'", UUID.class));
            assertTrue(reports.supportState(unrelated).activity().isEmpty());
            reports.revokeSupport(unrelated);
            assertEquals(grant.reference(), reports.supportState(owner).grant().reference());
            reports.clear(owner);
            reports.clear(owner);
            assertTrue(reports.openForSupport(actor, grant.reference()).isEmpty());
            assertEquals("REVOKED", reports.supportState(owner).activity().get(0).action());
            assertTrue(reports.read(owner).enabled());
            assertTrue(reports.read(owner).reports().isEmpty());
            assertEquals(1, reports.read(unrelated).reports().size());

            var expired = checked.minusDays(31);
            jdbc.update("UPDATE docks_device_report SET checked_at = ? WHERE device_id = ?", expired, otherDevice);
            assertTrue(reports.read(unrelated).reports().isEmpty(), "Expired reports are hidden before the purge runs.");
            assertEquals(DocksReports.Upload.INVALID, reports.upload(unrelated, otherInstallation, expired, 10, 25));
            assertEquals(DocksReports.Upload.SAVED, reports.upload(owner, installation, checked, 10, 25));
            var secondGrant = reports.grantSupport(owner).orElseThrow();
            assertNotEquals(grant.reference(), secondGrant.reference());
            jdbc.update("UPDATE docks_report_support_grant SET expires_at = ? WHERE account_id = ?", checked, owner);
            assertTrue(reports.openForSupport(actor, secondGrant.reference()).isEmpty());
            reports.purgeExpiredSupport();
            assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM docks_report_support_grant", Integer.class));
            assertEquals(1, reports.purgeExpired());
            assertEquals(0, reports.purgeExpired());
            assertEquals(1, reports.read(owner).reports().size());
            assertTrue(reports.read(unrelated).enabled());
        } finally {
            database.shutdown();
        }
    }
}
