package com.crystalpower.website.service;

import java.time.Instant;
import java.util.EnumMap;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DocksSubscriptions {
    public enum Plan {
        SINGLE_MONTHLY(1), SINGLE_ANNUAL(1), HOUSEHOLD_MONTHLY(5), HOUSEHOLD_ANNUAL(5);

        private final int deviceLimit;

        Plan(int deviceLimit) {
            this.deviceLimit = deviceLimit;
        }

        int deviceLimit() {
            return deviceLimit;
        }
    }
    public record Link(String url, boolean testMode) {}
    public record TestStatus(Plan plan, String state, Long paidUntilEpoch) {}
    private record Attempt(UUID id, String price, Plan plan, long expiry, String session, String url) {}

    private final JdbcTemplate db;
    private final TransactionTemplate tx;
    private final StripeGateway stripe;
    private final boolean enabled;
    private final EnumMap<Plan, String> prices = new EnumMap<>(Plan.class);

    public DocksSubscriptions(JdbcTemplate db, TransactionTemplate tx, StripeGateway stripe,
            @Value("${app.docks.stripe-test-enabled:false}") boolean enabled,
            @Value("${app.docks.price-single-monthly:}") String singleMonthly,
            @Value("${app.docks.price-single-annual:}") String singleAnnual,
            @Value("${app.docks.price-household-monthly:}") String householdMonthly,
            @Value("${app.docks.price-household-annual:}") String householdAnnual) {
        this.db = db;
        this.tx = tx;
        this.stripe = stripe;
        this.enabled = enabled;
        prices.put(Plan.SINGLE_MONTHLY, singleMonthly);
        prices.put(Plan.SINGLE_ANNUAL, singleAnnual);
        prices.put(Plan.HOUSEHOLD_MONTHLY, householdMonthly);
        prices.put(Plan.HOUSEHOLD_ANNUAL, householdAnnual);
    }

    public List<Plan> availablePlans() {
        if (!enabled || stripe.liveMode() || !stripe.connected()) return List.of();
        return prices.entrySet().stream().filter(entry -> entry.getValue().matches("price_[A-Za-z0-9]{1,94}"))
                .map(java.util.Map.Entry::getKey).toList();
    }

    public java.util.Optional<TestStatus> latestStatus(UUID account) {
        if (!enabled || stripe.liveMode() || !stripe.connected()) return java.util.Optional.empty();
        return db.query("""
                SELECT a.plan, s.provider_state, s.paid_until_epoch
                FROM docks_subscription_status s
                JOIN docks_subscription_checkout a ON a.attempt_id = s.attempt_id
                WHERE a.account_id = ?
                ORDER BY CASE WHEN s.provider_state IN ('canceled', 'incomplete_expired') THEN 1 ELSE 0 END,
                         a.expires_at_epoch DESC, s.updated_at_epoch DESC, s.stripe_subscription_id
                LIMIT 1
                """, (row, i) -> new TestStatus(Plan.valueOf(row.getString(1)), row.getString(2),
                    row.getObject(3, Long.class)), account).stream().findFirst();
    }

    public Link checkout(UUID account, Plan selected) {
        if (!availablePlans().contains(selected))
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "That test plan is unavailable.");
        var attempt = tx.execute(status -> reserve(account, selected));
        if (attempt.url() != null) return new Link(attempt.url(), true);

        // Stripe retries use the same immutable input and idempotency key.
        if (attempt.expiry() <= Instant.now().plusSeconds(1800).getEpochSecond())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The earlier checkout has not expired yet. Try again after it expires.");
        var checkout = stripe.docksTestCheckout(account, attempt.id(), attempt.price(), attempt.expiry());
        int updated = db.update("""
                UPDATE docks_subscription_checkout SET stripe_session = ?, checkout_url = ?
                WHERE account_id = ? AND attempt_id = ?
                """, checkout.id(), checkout.url(), account, attempt.id());
        if (updated != 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "The checkout changed. Open it again.");
        return new Link(checkout.url(), true);
    }

    private Attempt reserve(UUID account, Plan selected) {
        db.queryForObject("SELECT id FROM docks_account WHERE id = ? FOR UPDATE", UUID.class, account);
        var currentSubscriptions = db.queryForObject("""
                SELECT COUNT(*) FROM docks_subscription_status s
                JOIN docks_subscription_checkout a ON a.attempt_id = s.attempt_id
                WHERE a.account_id = ? AND s.provider_state NOT IN ('canceled', 'incomplete_expired')
                """, Integer.class, account);
        if (currentSubscriptions > 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Your account already has a Stripe test subscription.");
        var now = Instant.now().getEpochSecond();
        var previous = db.query("""
                SELECT attempt_id, stripe_price, plan, expires_at_epoch, stripe_session, checkout_url
                FROM docks_subscription_checkout a WHERE account_id = ?
                  AND NOT EXISTS (
                    SELECT 1 FROM docks_subscription_status s WHERE s.attempt_id = a.attempt_id
                  )
                ORDER BY expires_at_epoch DESC LIMIT 1
                """, (row, i) -> new Attempt(row.getObject(1, UUID.class), row.getString(2),
                        Plan.valueOf(row.getString(3)), row.getLong(4), row.getString(5), row.getString(6)), account);
        if (!previous.isEmpty() && previous.get(0).expiry() > now) {
            var current = previous.get(0);
            if (current.plan() != selected)
                throw new ResponseStatusException(HttpStatus.CONFLICT, "An earlier test checkout is still open for a different plan.");
            return current;
        }
        var attempt = new Attempt(UUID.randomUUID(), prices.get(selected), selected, now + 3600, null, null);
        db.update("""
                INSERT INTO docks_subscription_checkout (account_id, attempt_id, plan, stripe_price, expires_at_epoch)
                VALUES (?, ?, ?, ?, ?)
                """, account, attempt.id(), selected.name(), attempt.price(), attempt.expiry());
        return attempt;
    }
}
