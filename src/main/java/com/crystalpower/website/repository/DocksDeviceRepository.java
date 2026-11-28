package com.crystalpower.website.repository;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class DocksDeviceRepository {
    private final JdbcTemplate database;

    public DocksDeviceRepository(JdbcTemplate database) {
        this.database = database;
    }

    public record Device(UUID id, UUID installationId, String label, OffsetDateTime enrolledAt) {}
    private static final RowMapper<Device> READ_DEVICE = (row, index) -> new Device(row.getObject("id", UUID.class),
            row.getObject("installation_id", UUID.class), row.getString("label"),
            row.getObject("enrolled_at", OffsetDateTime.class));

    @Transactional
    public Device enrol(UUID accountId, UUID installationId, String label) {
        database.queryForObject("SELECT id FROM docks_account WHERE id = ? FOR UPDATE",
                UUID.class, accountId);
        var existing = database.query("""
                SELECT id, installation_id, label, enrolled_at FROM docks_device
                WHERE account_id = ? AND installation_id = ?
                """, READ_DEVICE, accountId, installationId).stream().findFirst();
        if (existing.isPresent()) return existing.get();
        UUID id = UUID.randomUUID();
        var enrolledAt = OffsetDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MICROS);
        database.update("INSERT INTO docks_device (id, account_id, installation_id, label, enrolled_at) VALUES (?, ?, ?, ?, ?)",
                id, accountId, installationId, label, enrolledAt);
        return new Device(id, installationId, label, enrolledAt);
    }

    public List<Device> listOwnedBy(UUID accountId) {
        return database.query("""
                SELECT id, installation_id, label, enrolled_at FROM docks_device
                WHERE account_id = ? ORDER BY enrolled_at, id
                """, READ_DEVICE, accountId);
    }

    public boolean removeOwnedBy(UUID accountId, UUID deviceId) {
        return database.update("DELETE FROM docks_device WHERE account_id = ? AND id = ?",
                accountId, deviceId) == 1;
    }
}
