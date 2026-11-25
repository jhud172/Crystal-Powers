package com.crystalpower.website;

import static org.junit.jupiter.api.Assertions.*;
import com.crystalpower.website.repository.DocksDeviceRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;

class DocksDeviceRepositoryTests {
    @Test
    void ownersCanListAndRemoveOnlyTheirOwnDevices() {
        var database = new EmbeddedDatabaseBuilder()
                .generateUniqueName(true)
                .setType(EmbeddedDatabaseType.H2)
                .addScript("classpath:db/migration/V87__docks_accounts_and_devices.sql")
                .build();
        try {
            var jdbc = new JdbcTemplate(database);
            var repository = new DocksDeviceRepository(jdbc);
            UUID owner = UUID.randomUUID(), other = UUID.randomUUID(), device = UUID.randomUUID();
            jdbc.update("INSERT INTO docks_account (id, display_name) VALUES (?, ?)", owner, "Owner");
            jdbc.update("INSERT INTO docks_account (id, display_name) VALUES (?, ?)", other, "Other");
            jdbc.update("INSERT INTO docks_device (id, account_id, installation_id, label) VALUES (?, ?, ?, ?)",
                    device, owner, UUID.randomUUID(), "Test PC");

            assertTrue(repository.listOwnedBy(other).isEmpty());
            assertFalse(repository.removeOwnedBy(other, device));
            assertEquals(device, repository.listOwnedBy(owner).get(0).id());
            assertTrue(repository.removeOwnedBy(owner, device));
            assertTrue(repository.listOwnedBy(owner).isEmpty());
        } finally {
            database.shutdown();
        }
    }
}
