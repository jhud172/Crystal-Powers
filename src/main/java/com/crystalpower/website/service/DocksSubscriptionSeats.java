package com.crystalpower.website.service;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DocksSubscriptionSeats {
    private record Subscription(String id, DocksSubscriptions.Plan plan, boolean ownPlan) {}
    private record Payment(String state, Long until) {}

    private final JdbcTemplate db;
    private final DocksBillingMode mode;

    public DocksSubscriptionSeats(JdbcTemplate db, DocksBillingMode mode) {
        this.db = db;
        this.mode = mode;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public Optional<OffsetDateTime> claim(UUID accountId, UUID deviceId) {
        if (!enabled()) return Optional.empty();
        if (!Boolean.TRUE.equals(db.queryForObject(
                "SELECT COUNT(*) > 0 FROM docks_device WHERE id = ? AND account_id = ?",
                Boolean.class, deviceId, accountId))) return Optional.empty();

        var subscriptions = db.query("""
                SELECT s.stripe_subscription_id, a.plan, a.account_id = ?
                FROM docks_subscription_status s
                JOIN docks_subscription_checkout a ON a.attempt_id = s.attempt_id
                WHERE a.live_mode = ? AND s.provider_state = 'paid' AND s.paid_until_epoch > ?
                  AND (a.account_id = ? OR (a.plan IN ('HOUSEHOLD_MONTHLY', 'HOUSEHOLD_ANNUAL')
                      AND EXISTS (SELECT 1 FROM docks_household_invitation h
                          WHERE h.stripe_subscription_id = s.stripe_subscription_id AND h.member_account_id = ?)))
                ORDER BY CASE WHEN a.account_id = ? THEN 0 ELSE 1 END,
                         a.expires_at_epoch DESC, s.stripe_subscription_id
                LIMIT 1
                """, (row, i) -> new Subscription(row.getString(1), DocksSubscriptions.Plan.valueOf(row.getString(2)),
                    row.getBoolean(3)), accountId, mode.live(), Instant.now().getEpochSecond(), accountId, accountId, accountId);
        if (subscriptions.isEmpty()) return Optional.empty();
        var subscription = subscriptions.get(0);
        // Re-read membership after acquiring the shared lock. A concurrent removal
        // may have committed while this device was waiting for the lock.
        var expiry = lockPaid(subscription.id());
        if (expiry.isEmpty() || (!subscription.ownPlan() && !isMember(subscription.id(), accountId)))
            return Optional.empty();

        var seats = db.query("SELECT device_id FROM docks_subscription_seat WHERE stripe_subscription_id = ?",
                (row, i) -> row.getObject(1, UUID.class), subscription.id());
        if (seats.contains(deviceId)) return expiry;
        if (seats.size() >= subscription.plan().deviceLimit()) return Optional.empty();

        db.update("INSERT INTO docks_subscription_seat (stripe_subscription_id, device_id) VALUES (?, ?)",
                subscription.id(), deviceId);
        return expiry;
    }

    boolean enabled() {
        return mode.seatsEnabled();
    }

    boolean live() { return mode.live(); }

    boolean isMember(String subscription, UUID account) {
        return Boolean.TRUE.equals(db.queryForObject("""
                SELECT COUNT(*) > 0 FROM docks_household_invitation
                WHERE stripe_subscription_id = ? AND member_account_id = ?
                """, Boolean.class, subscription, account));
    }

    Optional<OffsetDateTime> lockPaid(String subscription) {
        return lockPayment(subscription).filter(payment -> "paid".equals(payment.state()) && payment.until() != null
                && payment.until() > Instant.now().getEpochSecond())
                .map(payment -> OffsetDateTime.ofInstant(Instant.ofEpochSecond(payment.until()), ZoneOffset.UTC));
    }

    boolean lock(String subscription) {
        return lockPayment(subscription).isPresent();
    }

    private Optional<Payment> lockPayment(String subscription) {
        return db.query("""
                SELECT s.provider_state, s.paid_until_epoch FROM docks_subscription_status s
                WHERE s.stripe_subscription_id = ? AND EXISTS (
                    SELECT 1 FROM docks_subscription_checkout a WHERE a.attempt_id = s.attempt_id AND a.live_mode = ?
                ) FOR UPDATE
                """, (row, i) -> new Payment(row.getString(1), row.getObject(2, Long.class)), subscription, mode.live())
                .stream().findFirst();
    }
}
