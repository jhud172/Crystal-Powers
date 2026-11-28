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
    public record Status(boolean canRepair, boolean canStartTrial, OffsetDateTime trialExpiresAt,
                         OffsetDateTime accessKeyExpiresAt, OffsetDateTime subscriptionExpiresAt) {}

    private final JdbcTemplate db;
    private final TransactionTemplate transactions;
    private final DocksSubscriptionSeats subscriptions;

    public DocksEntitlements(JdbcTemplate db, TransactionTemplate transactions, DocksSubscriptionSeats subscriptions) {
        this.db = db;
        this.transactions = transactions;
        this.subscriptions = subscriptions;
    }

    public Optional<Status> status(UUID accountId, UUID installationId) {
        return evaluate(accountId, installationId, false, true);
    }

    public Optional<Status> preview(UUID accountId, UUID installationId) {
        return evaluate(accountId, installationId, false, false);
    }

    public Optional<Status> startTrial(UUID accountId, UUID installationId) {
        return evaluate(accountId, installationId, true, true);
    }

    private Optional<Status> evaluate(UUID accountId, UUID installationId, boolean activate, boolean claimSeat) {
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
            OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
            var grant = db.query("""
                    SELECT k.expires_at FROM docks_access_key k
                    JOIN docks_access_key_device s ON s.key_id = k.id
                    WHERE k.account_id = ? AND s.device_id = ? AND k.state = 'ACTIVE' AND k.expires_at > ?
                    ORDER BY k.expires_at DESC LIMIT 1
                    """, (row, i) -> row.getObject(1, OffsetDateTime.class), accountId, deviceId, now);
            if (!grant.isEmpty()) return Optional.of(new Status(true, false, null, grant.get(0), null));

            var subscription = claimSeat ? subscriptions.claim(accountId, deviceId) : subscriptions.preview(accountId, deviceId);
            if (subscription.isPresent()) return Optional.of(new Status(true, false, null, null, subscription.get()));

            var trials = db.query("""
                    SELECT device_id, expires_at FROM docks_trial WHERE account_id = ?
                    """, (row, i) -> new Trial(row.getObject(1, UUID.class),
                        row.getObject(2, OffsetDateTime.class)), accountId);
            if (!trials.isEmpty()) {
                var existing = trials.get(0);
                boolean usable = existing.deviceId().equals(deviceId) && existing.expiresAt().isAfter(now);
                return Optional.of(new Status(usable, false, existing.expiresAt(), null, null));
            }

            if (!activate) return Optional.of(new Status(false, true, null, null, null));
            var expiresAt = now.plusDays(7);
            db.update("""
                    INSERT INTO docks_trial (account_id, device_id, started_at, expires_at)
                    VALUES (?, ?, ?, ?)
                    """, accountId, deviceId, now, expiresAt);
            // Return the stored precision so a retry receives the same expiry.
            var storedExpiry = db.queryForObject("SELECT expires_at FROM docks_trial WHERE account_id = ?",
                    (row, i) -> row.getObject(1, OffsetDateTime.class), accountId);
            return Optional.of(new Status(true, false, storedExpiry, null, null));
        });
    }

    private record Trial(UUID deviceId, OffsetDateTime expiresAt) {}
}
