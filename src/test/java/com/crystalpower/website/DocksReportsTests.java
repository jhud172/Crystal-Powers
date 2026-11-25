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
    void reportsRequireConsentAndOwnershipAndAreRemovedOnWithdrawal() {
        var database = new EmbeddedDatabaseBuilder().generateUniqueName(true).setType(EmbeddedDatabaseType.H2)
                .addScripts("classpath:db/migration/V87__docks_accounts_and_devices.sql",
                            "classpath:db/migration/V91__docks_report_sync.sql").build();
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
        } finally {
            database.shutdown();
        }
    }
}
