package com.crystalpower.website.service;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DocksSubscriptionSeats {
    private record Subscription(String id, DocksSubscriptions.Plan plan, long paidUntil) {}

    private final JdbcTemplate db;
    private final StripeGateway stripe;
    private final boolean sandboxEntitlements;

    public DocksSubscriptionSeats(JdbcTemplate db, StripeGateway stripe,
            @Value("${app.docks.stripe-test-enabled:false}") boolean sandboxBilling,
            @Value("${app.docks.stripe-test-entitlements:false}") boolean sandboxEntitlements) {
        this.db = db;
        this.stripe = stripe;
        this.sandboxEntitlements = sandboxBilling && sandboxEntitlements;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public Optional<OffsetDateTime> claim(UUID accountId, UUID deviceId) {
        if (!sandboxEntitlements || stripe.liveMode() || !stripe.connected()) return Optional.empty();

        // Lock the subscription while counting and assigning devices. The entitlement
        // caller already holds the requesting account and device locks.
        var subscriptions = db.query("""
                SELECT s.stripe_subscription_id, a.plan, s.paid_until_epoch
                FROM docks_subscription_status s
                JOIN docks_subscription_checkout a ON a.attempt_id = s.attempt_id
                JOIN docks_device d ON d.account_id = a.account_id
                WHERE a.account_id = ? AND d.id = ?
                  AND s.provider_state = 'paid' AND s.paid_until_epoch > ?
                ORDER BY a.expires_at_epoch DESC, s.stripe_subscription_id
                LIMIT 1 FOR UPDATE
                """, (row, i) -> new Subscription(row.getString(1), DocksSubscriptions.Plan.valueOf(row.getString(2)),
                    row.getLong(3)), accountId, deviceId, Instant.now().getEpochSecond());
        if (subscriptions.isEmpty()) return Optional.empty();
        var subscription = subscriptions.get(0);
        if (subscription.paidUntil() <= Instant.now().getEpochSecond()) return Optional.empty();
        var expiry = OffsetDateTime.ofInstant(Instant.ofEpochSecond(subscription.paidUntil()), ZoneOffset.UTC);

        var seats = db.query("SELECT device_id FROM docks_subscription_seat WHERE stripe_subscription_id = ?",
                (row, i) -> row.getObject(1, UUID.class), subscription.id());
        if (seats.contains(deviceId)) return Optional.of(expiry);
        if (seats.size() >= subscription.plan().deviceLimit()) return Optional.empty();

        db.update("INSERT INTO docks_subscription_seat (stripe_subscription_id, device_id) VALUES (?, ?)",
                subscription.id(), deviceId);
        return Optional.of(expiry);
    }
}
