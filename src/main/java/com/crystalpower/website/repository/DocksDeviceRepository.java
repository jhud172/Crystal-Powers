package com.crystalpower.website.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class DocksDeviceRepository {
    private final JdbcTemplate database;

    public DocksDeviceRepository(JdbcTemplate database) {
        this.database = database;
    }

    public record Device(UUID id, UUID installationId, String label) {}

    @Transactional
    public Device enrol(UUID accountId, UUID installationId, String label) {
        database.queryForObject("SELECT id FROM docks_account WHERE id = ? FOR UPDATE",
                UUID.class, accountId);
        var existing = database.query("""
                SELECT id, installation_id, label FROM docks_device
                WHERE account_id = ? AND installation_id = ?
                """, (row, index) -> new Device(row.getObject("id", UUID.class),
                    row.getObject("installation_id", UUID.class), row.getString("label")),
                accountId, installationId).stream().findFirst();
        if (existing.isPresent()) return existing.get();
        UUID id = UUID.randomUUID();
        database.update("INSERT INTO docks_device (id, account_id, installation_id, label) VALUES (?, ?, ?, ?)",
                id, accountId, installationId, label);
        return new Device(id, installationId, label);
    }

    public List<Device> listOwnedBy(UUID accountId) {
        return database.query("""
                SELECT id, installation_id, label FROM docks_device
                WHERE account_id = ? ORDER BY enrolled_at, id
                """,
                (row, index) -> new Device(row.getObject("id", UUID.class),
                        row.getObject("installation_id", UUID.class), row.getString("label")),
                accountId);
    }

    public boolean removeOwnedBy(UUID accountId, UUID deviceId) {
        return database.update("DELETE FROM docks_device WHERE account_id = ? AND id = ?",
                accountId, deviceId) == 1;
    }
}
