package com.crystalpower.website.service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DocksStripeDeliveryQueue {
    private static final int MAX_ATTEMPTS = 8;
    private static final int LEASE_SECONDS = 600;
    private static final String DELIVERY_COLUMNS = """
            event_id, event_type, live_mode, subscription_id, checkout_attempt_id, session_id, risk_id, charge_id
            """;
    private static final org.slf4j.Logger log = LoggerFactory.getLogger(DocksStripeDeliveryQueue.class);

    public record Pending(String eventId, String type, int attempts, String state, long nextAttemptEpoch,
                          Long lastRetryEpoch) {}
    private record Claim(DocksStripeEvents.Delivery delivery, UUID lease, int attempts) {}

    private final JdbcTemplate db;
    private final DocksStripeEvents events;
    private final DocksBillingMode mode;
    private final Clock clock;
    private ScheduledExecutorService worker;
    private long nextPurge;

    @Autowired
    public DocksStripeDeliveryQueue(JdbcTemplate db, DocksStripeEvents events, DocksBillingMode mode) {
        this(db, events, mode, Clock.systemUTC());
    }

    DocksStripeDeliveryQueue(JdbcTemplate db, DocksStripeEvents events, DocksBillingMode mode, Clock clock) {
        this.db = db;
        this.events = events;
        this.mode = mode;
        this.clock = clock;
    }

    @PostConstruct
    void start() {
        if (!mode.enabled()) return;
        worker = Executors.newSingleThreadScheduledExecutor(task -> {
            var thread = new Thread(task, "docks-stripe-delivery");
            thread.setDaemon(true);
            return thread;
        });
        worker.scheduleWithFixedDelay(this::cycle, 3, 3, TimeUnit.SECONDS);
    }

    @PreDestroy
    void stop() {
        if (worker != null) worker.shutdownNow();
    }

    public void receive(byte[] raw, String signature) {
        events.authenticate(raw, signature).ifPresent(this::accept);
    }

    private void accept(DocksStripeEvents.Delivery delivery) {
        var previous = db.query("SELECT " + DELIVERY_COLUMNS + " FROM docks_stripe_delivery WHERE event_id = ?",
                this::readDelivery, delivery.id());
        if (!previous.isEmpty()) {
            requireSame(previous.get(0), delivery);
            return;
        }
        var subscription = delivery.subscription();
        var risk = delivery.risk();
        long time = now();
        try {
            db.update("""
                    INSERT INTO docks_stripe_delivery
                    (event_id, event_type, live_mode, subscription_id, checkout_attempt_id, session_id, risk_id, charge_id,
                     received_at_epoch, next_attempt_epoch)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, delivery.id(), delivery.type(), delivery.live(),
                    subscription == null ? null : subscription.subscriptionId(),
                    subscription == null ? null : subscription.attemptId(),
                    subscription == null ? null : subscription.sessionId(), risk == null ? null : risk.id(),
                    risk == null ? null : risk.chargeId(), time, time);
        } catch (DuplicateKeyException raced) {
            var stored = db.queryForObject("SELECT " + DELIVERY_COLUMNS + " FROM docks_stripe_delivery WHERE event_id = ?",
                    this::readDelivery, delivery.id());
            requireSame(stored, delivery);
        }
    }

    private static void requireSame(DocksStripeEvents.Delivery stored, DocksStripeEvents.Delivery received) {
        if (!received.equals(stored))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Stripe event conflicts with its stored reference.");
    }

    public List<Pending> pending() {
        long now = now();
        return db.query("""
                SELECT event_id, event_type, attempts, next_attempt_epoch, lease_until_epoch, retried_at_epoch
                FROM docks_stripe_delivery WHERE live_mode = ? AND finished_at_epoch IS NULL
                ORDER BY CASE WHEN attempts >= ? THEN 0 ELSE 1 END, next_attempt_epoch, event_id LIMIT 50
                """, (row, i) -> {
                    long leaseUntil = row.getLong(5);
                    int attempts = row.getInt(3);
                    String state = leaseUntil > now ? "processing" : attempts >= MAX_ATTEMPTS ? "review" : "pending";
                    return new Pending(row.getString(1), row.getString(2), attempts, state, row.getLong(4),
                            row.getObject(6, Long.class));
                }, mode.live(), MAX_ATTEMPTS);
    }

    public void retry(String eventId, UUID owner) {
        if (!mode.enabled() || !eventId.matches("evt_[A-Za-z0-9]{1,96}"))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "This delivery is unavailable.");
        long time = now();
        int changed = db.update("""
                UPDATE docks_stripe_delivery SET attempts = 0, next_attempt_epoch = ?, lease_id = NULL,
                                                lease_until_epoch = NULL, retried_by = ?, retried_at_epoch = ?
                WHERE event_id = ? AND live_mode = ? AND finished_at_epoch IS NULL
                  AND (lease_until_epoch IS NULL OR lease_until_epoch <= ?)
                """, time, owner, time, eventId, mode.live(), time);
        if (changed != 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "Refresh the queue. This delivery is processing or unavailable.");
    }

    private void cycle() {
        try {
            recoverDue();
            long time = now();
            if (time >= nextPurge) {
                nextPurge = time + 3600;
                db.update("""
                        DELETE FROM docks_stripe_delivery WHERE event_id IN (
                            SELECT event_id FROM docks_stripe_delivery WHERE finished_at_epoch < ? LIMIT 500
                        )
                        """, time - 30L * 86400);
            }
        } catch (RuntimeException unavailable) {
            log.warn("Docks Stripe delivery queue could not complete a processing cycle");
        }
    }

    void recoverDue() {
        if (!mode.enabled()) return;
        long time = now();
        var due = db.query("""
                SELECT event_id FROM docks_stripe_delivery
                WHERE live_mode = ? AND finished_at_epoch IS NULL AND attempts < ? AND next_attempt_epoch <= ?
                    AND (lease_until_epoch IS NULL OR lease_until_epoch <= ?)
                ORDER BY next_attempt_epoch, event_id LIMIT 4
                """, (row, i) -> row.getString(1), mode.live(), MAX_ATTEMPTS, time, time);
        for (String id : due) {
            if (Thread.currentThread().isInterrupted()) return;
            var claim = claim(id);
            if (claim != null) process(claim);
        }
    }

    private Claim claim(String eventId) {
        var lease = UUID.randomUUID();
        long time = now();
        int changed = db.update("""
                UPDATE docks_stripe_delivery SET lease_id = ?, lease_until_epoch = ?, attempts = attempts + 1
                WHERE event_id = ? AND live_mode = ? AND finished_at_epoch IS NULL AND attempts < ? AND next_attempt_epoch <= ?
                    AND (lease_until_epoch IS NULL OR lease_until_epoch <= ?)
                """, lease, time + LEASE_SECONDS, eventId, mode.live(), MAX_ATTEMPTS, time, time);
        if (changed != 1) return null;
        return db.query("SELECT " + DELIVERY_COLUMNS + ", attempts FROM docks_stripe_delivery WHERE event_id = ? AND lease_id = ?",
                (row, i) -> new Claim(readDelivery(row, i), lease, row.getInt("attempts")), eventId, lease)
                .stream().findFirst().orElse(null);
    }

    private void process(Claim claim) {
        try {
            events.process(claim.delivery());
        } catch (RuntimeException retryable) {
            long delay = Math.min(3600, 30L << Math.min(claim.attempts() - 1, 7));
            db.update("""
                    UPDATE docks_stripe_delivery SET lease_id = NULL, lease_until_epoch = NULL, next_attempt_epoch = ?
                    WHERE event_id = ? AND lease_id = ?
                    """, now() + delay, claim.delivery().id(), claim.lease());
            return;
        }
        db.update("""
                UPDATE docks_stripe_delivery SET lease_id = NULL, lease_until_epoch = NULL, finished_at_epoch = ?
                WHERE event_id = ? AND lease_id = ?
                """, now(), claim.delivery().id(), claim.lease());
    }

    private DocksStripeEvents.Delivery readDelivery(ResultSet row, int index) throws SQLException {
        String subscriptionId = row.getString("subscription_id");
        var subscription = subscriptionId == null ? null : new DocksStripeEvents.Reference(subscriptionId,
                row.getObject("checkout_attempt_id", UUID.class), row.getString("session_id"));
        String riskId = row.getString("risk_id");
        var risk = riskId == null ? null : new DocksStripeRisk.Pointer(riskId, row.getString("charge_id"));
        return new DocksStripeEvents.Delivery(row.getString("event_id"), row.getString("event_type"),
                row.getBoolean("live_mode"), subscription, risk);
    }

    private long now() { return clock.instant().getEpochSecond(); }
}
