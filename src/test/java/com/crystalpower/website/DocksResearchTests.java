package com.crystalpower.website;

import static com.crystalpower.website.service.DocksResearch.Band.*;
import static org.junit.jupiter.api.Assertions.*;

import com.crystalpower.website.service.DocksResearch;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.transaction.support.TransactionTemplate;

class DocksResearchTests {
    @Test
    void independentConsentControlsTheLatestContributionAndGroupTotals() {
        var database = new EmbeddedDatabaseBuilder().generateUniqueName(true).setType(EmbeddedDatabaseType.H2)
                .addScripts("classpath:db/migration/V87__docks_accounts_and_devices.sql",
                        "classpath:db/migration/V91__docks_report_sync.sql",
                        "classpath:db/migration/V98__docks_diagnostic_research.sql").build();
        try {
            var db = new JdbcTemplate(database);
            var research = new DocksResearch(db, new TransactionTemplate(new DataSourceTransactionManager(database)));
            var accounts = new UUID[5];
            for (int i = 0; i < accounts.length; i++) {
                accounts[i] = UUID.randomUUID();
                db.update("INSERT INTO docks_account(id, display_name) VALUES (?, 'Fixture')", accounts[i]);
            }
            UUID owner = accounts[0];
            db.update("INSERT INTO docks_report_consent(account_id, granted_at) VALUES (?, ?)", owner, OffsetDateTime.now());
            assertFalse(research.state(owner).enabled());
            assertFalse(research.submit(owner, LOW, HIGH).enabled());
            research.setEnabled(owner, true);
            assertNull(research.state(owner).submittedAt());
            assertEquals(0, db.queryForObject("SELECT COUNT(*) FROM docks_research_contribution", Integer.class));

            research.submit(owner, LOW, HIGH);
            assertNotNull(research.submit(owner, MEDIUM, LOW).submittedAt());
            assertEquals(1, db.queryForObject("SELECT COUNT(*) FROM docks_research_contribution", Integer.class));
            for (int i = 1; i < accounts.length; i++) {
                research.setEnabled(accounts[i], true);
                research.submit(accounts[i], HIGH, UNAVAILABLE);
                assertEquals(i == 4 ? 5 : 0, research.totals().total());
            }
            var totals = research.totals();
            assertEquals(1L, totals.cpu().get(MEDIUM));
            assertEquals(4L, totals.cpu().get(HIGH));
            assertEquals(4L, totals.memory().get(UNAVAILABLE));

            var expired = OffsetDateTime.now().minusDays(31);
            db.update("UPDATE docks_research_contribution SET submitted_at = ? WHERE account_id = ?", expired, accounts[1]);
            assertNull(research.state(accounts[1]).submittedAt());
            assertEquals(0, research.totals().total());
            assertEquals(1, research.purgeExpired());
            assertTrue(research.state(accounts[1]).enabled());
            research.setEnabled(owner, false);
            assertFalse(research.state(owner).enabled());
            assertEquals(0, db.queryForObject("SELECT COUNT(*) FROM docks_research_contribution WHERE account_id = ?", Integer.class, owner));
            assertEquals(1, db.queryForObject("SELECT COUNT(*) FROM docks_report_consent WHERE account_id = ?", Integer.class, owner));
        } finally {
            database.shutdown();
        }
    }
}
