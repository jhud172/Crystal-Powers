package com.crystalpower.website.service;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DocksStripeEvents {
    private final JdbcTemplate db;
    private final TransactionTemplate tx;
    private final StripeGateway stripe;
    private final boolean enabled;
    private final String signingSecret;

    private record Reference(String subscriptionId, UUID attemptId, String sessionId) {}
    private record Attempt(UUID id, UUID account, String price, String plan, String sessionId) {}
    private record Status(String providerState, Long paidUntil) {}

    public DocksStripeEvents(JdbcTemplate db, TransactionTemplate tx, StripeGateway stripe,
            @Value("${app.docks.stripe-test-enabled:false}") boolean enabled,
            @Value("${app.docks.stripe-webhook-secret:}") String signingSecret) {
        this.db = db;
        this.tx = tx;
        this.stripe = stripe;
        this.enabled = enabled;
        this.signingSecret = signingSecret;
    }

    public void receive(byte[] raw, String signature) {
        if (!enabled || stripe.liveMode()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        if (signingSecret.isBlank())
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Docks sandbox events are disabled.");
        var event = stripe.verifyDocksTestEvent(raw, signature, signingSecret);
        String eventId = event.path("id").asText();
        if (!eventId.matches("evt_[A-Za-z0-9]{1,96}"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid Stripe event ID.");
        var reference = reference(event);
        if (reference == null) return;

        var attempt = resolveAttempt(reference);
        if (attempt.isEmpty()) return;
        tx.executeWithoutResult(status -> reconcile(attempt.get(), reference, eventId));
    }

    private void reconcile(Attempt attempt, Reference reference, String eventId) {
        // Serialize provider reads for each Docks account, so an overlapping event cannot
        // reapply a state it fetched before a newer cancellation completed.
        db.queryForObject("SELECT id FROM docks_account WHERE id = ? FOR UPDATE", UUID.class, attempt.account());
        int duplicate = db.queryForObject("SELECT COUNT(*) FROM docks_subscription_event WHERE stripe_event_id = ?",
                Integer.class, eventId);
        if (duplicate != 0) return;

        var existing = db.query("SELECT stripe_subscription_id FROM docks_subscription_status WHERE attempt_id = ?",
                (row, i) -> row.getString(1), attempt.id());
        if (!existing.isEmpty() && !existing.get(0).equals(reference.subscriptionId())) return;
        var subscription = stripe.subscription(reference.subscriptionId());
        if (!reference.subscriptionId().equals(subscription.path("id").asText())
                || !"subscription".equals(subscription.path("object").asText())
                || !subscription.path("livemode").isBoolean() || subscription.path("livemode").asBoolean())
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unexpected Stripe subscription.");

        var metadata = subscription.path("metadata");
        boolean matched = attempt.id().toString().equals(metadata.path("docks_checkout_attempt").asText())
                && attempt.account().toString().equals(metadata.path("docks_account_id").asText());
        if (!matched && existing.isEmpty()) return;

        var now = Instant.now().getEpochSecond();
        var state = matched ? readStatus(subscription, attempt, now) : new Status("unverified", null);
        if (existing.isEmpty()) {
            db.update("""
                    INSERT INTO docks_subscription_status
                        (stripe_subscription_id, attempt_id, provider_state, paid_until_epoch, updated_at_epoch)
                    VALUES (?, ?, ?, ?, ?)
                    """, reference.subscriptionId(), attempt.id(), state.providerState(), state.paidUntil(), now);
        } else {
            db.update("""
                    UPDATE docks_subscription_status SET provider_state = ?, paid_until_epoch = ?, updated_at_epoch = ?
                    WHERE stripe_subscription_id = ? AND attempt_id = ?
                    """, state.providerState(), state.paidUntil(), now, reference.subscriptionId(), attempt.id());
        }
        db.update("INSERT INTO docks_subscription_event (stripe_event_id, attempt_id, handled_at_epoch) VALUES (?, ?, ?)",
                eventId, attempt.id(), now);
    }

    private Optional<Attempt> resolveAttempt(Reference reference) {
        String fields = """
                SELECT a.attempt_id, a.account_id, a.stripe_price, a.plan, a.stripe_session
                FROM docks_subscription_checkout a
                """;
        var bySubscription = db.query(fields + """
                JOIN docks_subscription_status s ON s.attempt_id = a.attempt_id
                WHERE s.stripe_subscription_id = ?
                """, this::readAttempt, reference.subscriptionId());
        if (!bySubscription.isEmpty()) return Optional.of(bySubscription.get(0));
        if (reference.attemptId() == null) return Optional.empty();
        return db.query(fields + " WHERE a.attempt_id = ?", this::readAttempt, reference.attemptId()).stream()
                .filter(attempt -> reference.sessionId() == null || attempt.sessionId() == null
                        || reference.sessionId().equals(attempt.sessionId())).findFirst();
    }

    private Attempt readAttempt(java.sql.ResultSet row, int index) throws java.sql.SQLException {
        return new Attempt(row.getObject(1, UUID.class), row.getObject(2, UUID.class),
                row.getString(3), row.getString(4), row.getString(5));
    }

    private static Status readStatus(JsonNode subscription, Attempt attempt, long now) {
        String state = subscription.path("status").asText("unverified");
        if (!state.matches("[a-z_]{1,24}")) state = "unverified";
        if (!"active".equals(state)) return new Status(state, null);

        var items = subscription.path("items");
        var data = items.path("data");
        if (!data.isArray() || data.size() != 1 || !items.path("has_more").isBoolean() || items.path("has_more").asBoolean())
            return new Status("unverified", null);
        var item = data.path(0);
        var price = item.path("price");
        String interval = attempt.plan().endsWith("_ANNUAL") ? "year" : "month";
        if (!attempt.price().equals(price.path("id").asText()) || item.path("quantity").asInt(-1) != 1
                || !"gbp".equals(price.path("currency").asText())
                || !interval.equals(price.path("recurring").path("interval").asText())
                || price.path("recurring").path("interval_count").asInt(-1) != 1)
            return new Status("unverified", null);

        var invoice = subscription.path("latest_invoice");
        if (!"paid".equals(invoice.path("status").asText())
                || !subscription.path("customer").asText().matches("cus_[A-Za-z0-9]{1,96}")
                || !subscription.path("customer").asText().equals(invoice.path("customer").asText())
                || !subscription.path("id").asText().equals(invoice.path("parent").path("subscription_details").path("subscription").asText())
                || !invoice.path("amount_paid").isIntegralNumber() || invoice.path("amount_paid").asLong() <= 0)
            return new Status("unverified", null);
        long end = item.path("current_period_end").asLong(-1);
        boolean paidPeriod = false;
        for (var line : invoice.path("lines").path("data")) {
            var parent = line.path("parent");
            var details = parent.path("subscription_item_details");
            if ("subscription_item_details".equals(parent.path("type").asText())
                    && details.path("proration").isBoolean() && !details.path("proration").asBoolean()
                    && subscription.path("id").asText().equals(details.path("subscription").asText())
                    && attempt.price().equals(line.path("pricing").path("price_details").path("price").asText())
                    && line.path("period").path("end").asLong(-1) == end) {
                paidPeriod = true;
                break;
            }
        }
        return paidPeriod && end > now && end <= now + 400L * 86400
                ? new Status("paid", end) : new Status("unverified", null);
    }

    private static Reference reference(JsonNode event) {
        var object = event.path("data").path("object");
        String subscription;
        String attempt;
        String session = null;
        switch (event.path("type").asText()) {
            case "checkout.session.completed" -> {
                subscription = object.path("subscription").asText();
                attempt = object.path("client_reference_id").asText();
                session = object.path("id").asText();
                if (!session.matches("cs_test_[A-Za-z0-9]{1,90}")) return null;
            }
            case "customer.subscription.updated", "customer.subscription.deleted" -> {
                subscription = object.path("id").asText();
                attempt = object.path("metadata").path("docks_checkout_attempt").asText();
            }
            case "invoice.paid", "invoice.payment_failed" -> {
                var parent = object.path("parent").path("subscription_details");
                subscription = parent.path("subscription").asText();
                attempt = parent.path("metadata").path("docks_checkout_attempt").asText();
            }
            default -> { return null; }
        }
        if (!subscription.matches("sub_[A-Za-z0-9]{1,96}")) return null;
        UUID attemptId = null;
        try {
            if (!attempt.isBlank()) attemptId = UUID.fromString(attempt);
        } catch (IllegalArgumentException ignored) { }
        return new Reference(subscription, attemptId, session);
    }
}
