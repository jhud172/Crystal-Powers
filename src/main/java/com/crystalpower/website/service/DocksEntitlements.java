package com.crystalpower.website.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class DocksEntitlements {
    public record Status(boolean canRepair, boolean canStartTrial, OffsetDateTime trialExpiresAt) {}

    private final JdbcTemplate db;
    private final TransactionTemplate transactions;

    public DocksEntitlements(JdbcTemplate db, TransactionTemplate transactions) {
        this.db = db;
        this.transactions = transactions;
    }

    public Optional<Status> status(UUID accountId, UUID installationId) {
        return evaluate(accountId, installationId, false);
    }

    public Optional<Status> startTrial(UUID accountId, UUID installationId) {
        return evaluate(accountId, installationId, true);
    }

    private Optional<Status> evaluate(UUID accountId, UUID installationId, boolean activate) {
        return transactions.execute(transaction -> {
            var owners = db.query("SELECT id FROM docks_account WHERE id = ? FOR UPDATE",
                    (row, i) -> row.getObject(1, UUID.class), accountId);
            if (owners.isEmpty()) return Optional.empty();

            var devices = db.query("""
                    SELECT id FROM docks_device
                    WHERE account_id = ? AND installation_id = ? FOR UPDATE
                    """, (row, i) -> row.getObject(1, UUID.class), accountId, installationId);
            if (devices.isEmpty()) return Optional.empty();
            UUID deviceId = devices.get(0);

            var trials = db.query("""
                    SELECT device_id, expires_at FROM docks_trial WHERE account_id = ?
                    """, (row, i) -> new Trial(row.getObject(1, UUID.class),
                        row.getObject(2, OffsetDateTime.class)), accountId);
            OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
            if (!trials.isEmpty()) {
                var existing = trials.get(0);
                boolean usable = existing.deviceId().equals(deviceId) && existing.expiresAt().isAfter(now);
                return Optional.of(new Status(usable, false, existing.expiresAt()));
            }

            if (!activate) return Optional.of(new Status(false, true, null));
            var expiresAt = now.plusDays(7);
            db.update("""
                    INSERT INTO docks_trial (account_id, device_id, started_at, expires_at)
                    VALUES (?, ?, ?, ?)
                    """, accountId, deviceId, now, expiresAt);
            // Return the stored precision so a retry receives the same expiry.
            var storedExpiry = db.queryForObject("SELECT expires_at FROM docks_trial WHERE account_id = ?",
                    (row, i) -> row.getObject(1, OffsetDateTime.class), accountId);
            return Optional.of(new Status(true, false, storedExpiry));
        });
    }

    private record Trial(UUID deviceId, OffsetDateTime expiresAt) {}
}
