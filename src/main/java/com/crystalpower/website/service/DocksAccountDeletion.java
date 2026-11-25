package com.crystalpower.website.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class DocksAccountDeletion {
    public enum Result { DELETED, UNAUTHORISED, SIGN_IN_AGAIN, BILLING_OPEN }
    private record UnsettledCheckout(UUID attempt, String session, boolean live, long expiresAt, String state) {}

    private final JdbcTemplate db;
    private final TransactionTemplate tx;
    private final DocksEmailSignIn signIn;
    private final StripeGateway stripe;

    public DocksAccountDeletion(JdbcTemplate db, TransactionTemplate tx, DocksEmailSignIn signIn, StripeGateway stripe) {
        this.db = db;
        this.tx = tx;
        this.signIn = signIn;
        this.stripe = stripe;
    }

    public Result delete(String token) {
        var verified = signIn.recentlyVerifiedAccount(token);
        if (verified.isEmpty()) return authenticationResult(token);
        UUID account = verified.get();
        var unsettled = unsettledCheckouts(account);
        long now = Instant.now().getEpochSecond();
        if (unsettled.size() > 8 || unsettled.stream().anyMatch(entry -> entry.state() != null || entry.expiresAt() > now)
                || unsettled.stream().anyMatch(entry -> !checkoutExpired(entry))) return Result.BILLING_OPEN;
        return tx.execute(status -> {
            // This matches email sign-in's order. Stripe calls are made before these locks.
            db.queryForObject("SELECT id FROM docks_email_gate WHERE id = 1 FOR UPDATE", Integer.class);
            var present = db.query("SELECT id FROM docks_account WHERE id = ? FOR UPDATE",
                    (row, i) -> row.getObject(1, UUID.class), account);
            if (present.isEmpty() || signIn.recentlyVerifiedAccount(token).filter(account::equals).isEmpty())
                return authenticationResult(token);
            if (!unsettled.equals(unsettledCheckouts(account))) return Result.BILLING_OPEN;
            deleteAccount(account);
            return Result.DELETED;
        });
    }

    private Result authenticationResult(String token) {
        return signIn.account(token).isPresent() ? Result.SIGN_IN_AGAIN : Result.UNAUTHORISED;
    }

    private List<UnsettledCheckout> unsettledCheckouts(UUID account) {
        return db.query("""
                SELECT a.attempt_id, a.stripe_session, a.live_mode, a.expires_at_epoch, s.provider_state
                FROM docks_subscription_checkout a
                LEFT JOIN docks_subscription_status s ON s.attempt_id = a.attempt_id
                WHERE a.account_id = ? AND (s.provider_state IS NULL OR s.provider_state NOT IN ('canceled', 'incomplete_expired'))
                ORDER BY a.attempt_id LIMIT 9
                """, (row, i) -> new UnsettledCheckout(row.getObject(1, UUID.class), row.getString(2),
                    row.getBoolean(3), row.getLong(4), row.getString(5)), account);
    }

    private boolean checkoutExpired(UnsettledCheckout checkout) {
        if (checkout.session() == null) return true;
        if (!stripe.connected() || stripe.liveMode() != checkout.live()) return false;
        var session = stripe.session(checkout.session());
        return checkout.session().equals(session.path("id").asText()) && "checkout.session".equals(session.path("object").asText())
                && session.path("livemode").isBoolean() && session.path("livemode").asBoolean() == checkout.live()
                && checkout.attempt().toString().equals(session.path("client_reference_id").asText())
                && "expired".equals(session.path("status").asText()) && session.path("subscription").isNull()
                && !session.path("after_expiration").path("recovery").path("enabled").asBoolean();
    }

    private void deleteAccount(UUID account) {
        var addresses = db.query("SELECT subject FROM docks_identity WHERE account_id = ? AND issuer = ?",
                (row, i) -> row.getString(1), account, DocksEmailSignIn.ISSUER);
        for (String address : addresses)
            db.update("DELETE FROM docks_email_rate WHERE bucket = ?", DocksEmailSignIn.digest(address));
        db.update("""
                DELETE FROM docks_email_challenge WHERE email IN (
                    SELECT subject FROM docks_identity WHERE account_id = ? AND issuer = ?
                )
                """, account, DocksEmailSignIn.ISSUER);
        db.update("""
                DELETE FROM docks_household_invitation WHERE invited_email IN (
                    SELECT subject FROM docks_identity WHERE account_id = ? AND issuer = ?
                ) OR stripe_subscription_id IN (
                    SELECT s.stripe_subscription_id FROM docks_subscription_status s
                    JOIN docks_subscription_checkout a ON a.attempt_id = s.attempt_id WHERE a.account_id = ?
                )
                """, account, DocksEmailSignIn.ISSUER, account);
        db.update("""
                DELETE FROM docks_subscription_seat WHERE stripe_subscription_id IN (
                    SELECT s.stripe_subscription_id FROM docks_subscription_status s
                    JOIN docks_subscription_checkout a ON a.attempt_id = s.attempt_id WHERE a.account_id = ?
                )
                """, account);
        db.update("""
                UPDATE docks_subscription_checkout SET account_id = NULL, checkout_url = NULL
                WHERE account_id = ? AND attempt_id IN (SELECT attempt_id FROM docks_subscription_status)
                """, account);
        db.update("DELETE FROM docks_access_key_audit WHERE actor_id = ?", account);
        db.update("DELETE FROM docks_account WHERE id = ?", account);
    }
}
