package com.crystalpower.website;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import com.crystalpower.website.repository.DocksDeviceRepository;
import com.crystalpower.website.service.DocksAccessKeys;
import com.crystalpower.website.service.DocksEntitlements;
import com.crystalpower.website.service.DocksSubscriptionSeats;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.transaction.support.TransactionTemplate;

class DocksAccessKeysTests {
    @Test
    void accountBindingSeatTransferAndOwnerChangesApplyToOnlineEntitlement() {
        var database = new EmbeddedDatabaseBuilder().generateUniqueName(true).setType(EmbeddedDatabaseType.H2)
                .addScripts("classpath:db/migration/V87__docks_accounts_and_devices.sql",
                            "classpath:db/migration/V89__docks_trial.sql",
                            "classpath:db/migration/V90__docks_access_keys.sql").build();
        try {
            var db = new JdbcTemplate(database);
            var tx = new TransactionTemplate(new DataSourceTransactionManager(database));
            var keys = new DocksAccessKeys(db, tx);
            var entitlements = new DocksEntitlements(db, tx, mock(DocksSubscriptionSeats.class));
            var devices = new DocksDeviceRepository(db);
            UUID owner = UUID.randomUUID(), customer = UUID.randomUUID(), other = UUID.randomUUID();
            for (var account : new UUID[] {customer, other})
                db.update("INSERT INTO docks_account(id, display_name) VALUES (?, 'Test')", account);
            UUID first = UUID.randomUUID(), next = UUID.randomUUID(), foreign = UUID.randomUUID();
            var original = devices.enrol(customer, first, "First");
            devices.enrol(customer, next, "Replacement");
            devices.enrol(other, foreign, "Other");
            var issued = keys.issue(owner, 30, 1);
            assertTrue(issued.code().matches("[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}"));
            assertNull(keys.recent().get(0).expiresAt());
            assertFalse(db.queryForObject("SELECT code_hash FROM docks_access_key", String.class).contains(issued.code().replace("-", "")));

            assertEquals(DocksAccessKeys.Redemption.GRANTED, keys.redeem(customer, first, issued.code()));
            var active = entitlements.status(customer, first).orElseThrow();
            assertTrue(active.canRepair());
            assertNotNull(active.accessKeyExpiresAt());
            assertEquals(DocksAccessKeys.Redemption.NOT_AVAILABLE, keys.redeem(other, foreign, issued.code()));
            assertEquals(DocksAccessKeys.Redemption.DEVICE_LIMIT, keys.redeem(customer, next, issued.code()));

            assertTrue(devices.removeOwnedBy(customer, original.id()));
            assertTrue(entitlements.status(customer, first).isEmpty());
            assertEquals(DocksAccessKeys.Redemption.GRANTED, keys.redeem(customer, next, issued.code()));
            assertEquals(active.accessKeyExpiresAt(), entitlements.status(customer, next).orElseThrow().accessKeyExpiresAt());
            assertTrue(keys.setState(issued.key().id(), owner, DocksAccessKeys.State.SUSPENDED));
            assertFalse(entitlements.status(customer, next).orElseThrow().canRepair());
            assertTrue(keys.extend(issued.key().id(), owner, 14));
            assertTrue(keys.setState(issued.key().id(), owner, DocksAccessKeys.State.ACTIVE));
            assertTrue(entitlements.status(customer, next).orElseThrow().accessKeyExpiresAt().isAfter(active.accessKeyExpiresAt()));
            assertTrue(keys.setState(issued.key().id(), owner, DocksAccessKeys.State.REVOKED));
            assertFalse(keys.setState(issued.key().id(), owner, DocksAccessKeys.State.ACTIVE));
            assertFalse(entitlements.status(customer, next).orElseThrow().canRepair());
            assertEquals(7, db.queryForObject("SELECT COUNT(*) FROM docks_access_key_audit", Integer.class));

            var fiveDeviceKey = keys.issue(owner, 30, 5);
            for (int i = 0; i < 6; i++) {
                var installation = UUID.randomUUID();
                devices.enrol(customer, installation, "Device " + i);
                assertEquals(i < 5 ? DocksAccessKeys.Redemption.GRANTED : DocksAccessKeys.Redemption.DEVICE_LIMIT,
                        keys.redeem(customer, installation, fiveDeviceKey.code()));
                assertEquals(i < 5, entitlements.status(customer, installation).orElseThrow().canRepair());
            }
        } finally {
            database.shutdown();
        }
    }
}
