package com.crystalpower.website.service;

import org.springframework.beans.factory.annotation.Qualifier;

import java.time.Instant;
import java.util.EnumMap;
import java.util.List;
import java.util.Optional;
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

        String interval() { return name().endsWith("_ANNUAL") ? "year" : "month"; }
    }
    public record Link(String url, boolean testMode) {}
    public record SubscriptionStatus(Plan plan, String state, Long paidUntilEpoch) {}
    private record Subscription(UUID attemptId, String stripeId, SubscriptionStatus status) {}
    private record Attempt(UUID id, String price, Plan plan, long expiry, String session, String url) {}

    private final JdbcTemplate db;
    private final TransactionTemplate tx;
    private final StripeGateway stripe;
    private final DocksBillingMode mode;
    private final String livePortalConfiguration;
    private final String testPortalConfiguration;
    private final EnumMap<Plan, String> prices = new EnumMap<>(Plan.class);

    public DocksSubscriptions(JdbcTemplate db, TransactionTemplate tx,
            @Qualifier("docksStripeGateway") StripeGateway stripe, DocksBillingMode mode,
            @Value("${app.docks.stripe-live-portal:}") String portalConfiguration,
            @Value("${app.docks.stripe-test-portal:}") String testPortalConfiguration,
            @Value("${app.docks.price-single-monthly:}") String singleMonthly,
            @Value("${app.docks.price-single-annual:}") String singleAnnual,
            @Value("${app.docks.price-household-monthly:}") String householdMonthly,
            @Value("${app.docks.price-household-annual:}") String householdAnnual) {
        this.db = db;
        this.tx = tx;
        this.stripe = stripe;
        this.mode = mode;
        this.livePortalConfiguration = portalConfiguration;
        this.testPortalConfiguration = testPortalConfiguration;
        prices.put(Plan.SINGLE_MONTHLY, singleMonthly);
        prices.put(Plan.SINGLE_ANNUAL, singleAnnual);
        prices.put(Plan.HOUSEHOLD_MONTHLY, householdMonthly);
        prices.put(Plan.HOUSEHOLD_ANNUAL, householdAnnual);
    }

    public List<Plan> availablePlans() {
        if (!mode.enabled()) return List.of();
        var offered = prices.entrySet().stream().filter(entry -> entry.getValue().matches("price_[A-Za-z0-9]{1,94}"))
                .map(java.util.Map.Entry::getKey).toList();
        if (mode.live() && (!portalConfigured() || offered.size() != Plan.values().length
                || prices.values().stream().distinct().count() != offered.size())) return List.of();
        return offered;
    }

    public boolean testMode() { return !mode.live(); }
    public boolean portalConfigured() { return portalConfiguration().matches("bpc_[A-Za-z0-9]{1,96}"); }

    private String portalConfiguration() { return mode.live() ? livePortalConfiguration : testPortalConfiguration; }

    public Optional<SubscriptionStatus> latestStatus(UUID account) {
        return latest(account).map(Subscription::status);
    }

    private Optional<Subscription> latest(UUID account) {
        if (!mode.enabled()) return Optional.empty();
        return db.query("""
                SELECT a.attempt_id, s.stripe_subscription_id, a.plan, s.provider_state, s.paid_until_epoch
                FROM docks_subscription_status s
                JOIN docks_subscription_checkout a ON a.attempt_id = s.attempt_id
                WHERE a.account_id = ? AND a.live_mode = ?
                ORDER BY CASE WHEN s.provider_state IN ('canceled', 'incomplete_expired') THEN 1 ELSE 0 END,
                         a.expires_at_epoch DESC, s.updated_at_epoch DESC, s.stripe_subscription_id
                LIMIT 1
                """, (row, i) -> new Subscription(row.getObject(1, UUID.class), row.getString(2),
                    new SubscriptionStatus(Plan.valueOf(row.getString(3)), row.getString(4), row.getObject(5, Long.class))),
                account, mode.live()).stream().findFirst();
    }

    public Link portal(UUID account) {
        if (!portalConfigured()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Subscription management is unavailable.");
        var stored = latest(account).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No subscription is linked to this account."));
        var provider = stripe.subscription(stored.stripeId());
        var metadata = provider.path("metadata");
        String customer = provider.path("customer").asText();
        if (!stored.stripeId().equals(provider.path("id").asText()) || !"subscription".equals(provider.path("object").asText())
                || !provider.path("livemode").isBoolean() || provider.path("livemode").asBoolean() != mode.live()
                || !account.toString().equals(metadata.path("docks_account_id").asText())
                || !stored.attemptId().toString().equals(metadata.path("docks_checkout_attempt").asText())
                || !customer.matches("cus_[A-Za-z0-9]{1,96}"))
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not verify the customer for this subscription.");
        return new Link(stripe.docksPortal(customer, portalConfiguration()), testMode());
    }

    public Link checkout(UUID account, Plan selected) {
        if (!availablePlans().contains(selected))
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "That Premium plan is unavailable.");
        var attempt = tx.execute(status -> reserve(account, selected));
        if (attempt.url() != null) return new Link(attempt.url(), testMode());

        // Stripe retries use the same immutable input and idempotency key.
        if (attempt.expiry() <= Instant.now().plusSeconds(1800).getEpochSecond())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The earlier checkout has not expired yet. Try again after it expires.");
        if (mode.live()) stripe.verifyDocksPrice(attempt.price(), selected);
        var checkout = stripe.docksCheckout(account, attempt.id(), attempt.price(), attempt.expiry());
        int updated = db.update("""
                UPDATE docks_subscription_checkout SET stripe_session = ?, checkout_url = ?
                WHERE account_id = ? AND attempt_id = ? AND live_mode = ?
                """, checkout.id(), checkout.url(), account, attempt.id(), mode.live());
        if (updated != 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "The checkout changed. Open it again.");
        return new Link(checkout.url(), testMode());
    }

    private Attempt reserve(UUID account, Plan selected) {
        db.queryForObject("SELECT id FROM docks_account WHERE id = ? FOR UPDATE", UUID.class, account);
        var currentSubscriptions = db.queryForObject("""
                SELECT COUNT(*) FROM docks_subscription_status s
                JOIN docks_subscription_checkout a ON a.attempt_id = s.attempt_id
                WHERE a.account_id = ? AND a.live_mode = ? AND s.provider_state NOT IN ('canceled', 'incomplete_expired')
                """, Integer.class, account, mode.live());
        if (currentSubscriptions > 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Your account already has a Premium subscription.");
        var now = Instant.now().getEpochSecond();
        var previous = db.query("""
                SELECT attempt_id, stripe_price, plan, expires_at_epoch, stripe_session, checkout_url
                FROM docks_subscription_checkout a WHERE account_id = ? AND live_mode = ?
                  AND NOT EXISTS (
                    SELECT 1 FROM docks_subscription_status s WHERE s.attempt_id = a.attempt_id
                  )
                ORDER BY expires_at_epoch DESC LIMIT 1
                """, (row, i) -> new Attempt(row.getObject(1, UUID.class), row.getString(2),
                        Plan.valueOf(row.getString(3)), row.getLong(4), row.getString(5), row.getString(6)), account, mode.live());
        if (!previous.isEmpty() && previous.get(0).expiry() > now) {
            var current = previous.get(0);
            if (current.plan() != selected)
                throw new ResponseStatusException(HttpStatus.CONFLICT, "An earlier checkout is still open for a different plan.");
            return current;
        }
        if (mode.live() && !previous.isEmpty() && previous.get(0).session() != null) {
            var old = previous.get(0);
            var provider = stripe.session(old.session());
            if (!old.session().equals(provider.path("id").asText())
                    || !old.id().toString().equals(provider.path("client_reference_id").asText())
                    || !"expired".equals(provider.path("status").asText()))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Your earlier checkout is awaiting confirmation.");
        }
        var attempt = new Attempt(UUID.randomUUID(), prices.get(selected), selected, now + 3600, null, null);
        db.update("""
                INSERT INTO docks_subscription_checkout (account_id, attempt_id, plan, stripe_price, expires_at_epoch, live_mode)
                VALUES (?, ?, ?, ?, ?, ?)
                """, account, attempt.id(), selected.name(), attempt.price(), attempt.expiry(), mode.live());
        return attempt;
    }
}
