package com.crystalpower.website.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DocksHouseholds {
    public record Invitation(UUID id, String email, boolean sentByYou, boolean accepted, boolean active) {}
    public record View(boolean available, boolean canInvite, List<Invitation> invitations) {}
    private record Entry(String subscription, String email, UUID owner, UUID member, long expires) {}

    private final JdbcTemplate db;
    private final DocksSubscriptionSeats seats;

    public DocksHouseholds(JdbcTemplate db, DocksSubscriptionSeats seats) {
        this.db = db;
        this.seats = seats;
    }

    public View view(UUID account) {
        if (!seats.enabled()) return new View(false, false, List.of());
        long now = Instant.now().getEpochSecond();
        var items = db.query("""
                SELECT h.id, CASE WHEN a.account_id = ? THEN h.invited_email ELSE
                    (SELECT MIN(i.subject) FROM docks_identity i WHERE i.account_id = a.account_id AND i.issuer = ?)
                    END, a.account_id = ?, h.member_account_id IS NOT NULL,
                       s.provider_state = 'paid' AND s.paid_until_epoch > ?
                FROM docks_household_invitation h
                JOIN docks_subscription_status s ON s.stripe_subscription_id = h.stripe_subscription_id
                JOIN docks_subscription_checkout a ON a.attempt_id = s.attempt_id
                WHERE h.member_account_id = ?
                    OR (a.account_id = ? AND (h.member_account_id IS NOT NULL OR h.expires_at_epoch > ?))
                    OR (h.member_account_id IS NULL AND h.expires_at_epoch > ?
                        AND s.provider_state = 'paid' AND s.paid_until_epoch > ?
                        AND EXISTS (SELECT 1 FROM docks_identity i
                            WHERE i.account_id = ? AND i.issuer = ? AND i.subject = h.invited_email))
                ORDER BY h.expires_at_epoch DESC, h.id
                """, (row, i) -> new Invitation(row.getObject(1, UUID.class), row.getString(2), row.getBoolean(3),
                    row.getBoolean(4), row.getBoolean(5)),
                account, DocksEmailSignIn.ISSUER, account, now, account, account, now, now, now, account, DocksEmailSignIn.ISSUER);
        return new View(true, householdSubscription(account) != null, items);
    }

    @Transactional
    public void invite(UUID account, String address) {
        requireEnabled();
        String email = DocksEmailSignIn.normaliseEmail(address);
        if (ownsEmail(account, email))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use the other adult's email address.");
        String subscription = householdSubscription(account);
        if (subscription == null || seats.lockPaid(subscription).isEmpty())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A paid household subscription is required.");

        long now = Instant.now().getEpochSecond();
        db.update("""
                DELETE FROM docks_household_invitation
                WHERE stripe_subscription_id = ? AND member_account_id IS NULL AND expires_at_epoch <= ?
                """, subscription, now);
        int duplicate = db.queryForObject("""
                SELECT COUNT(*) FROM docks_household_invitation
                WHERE stripe_subscription_id = ? AND invited_email = ?
                """, Integer.class, subscription, email);
        if (duplicate != 0) return;
        int count = db.queryForObject("SELECT COUNT(*) FROM docks_household_invitation WHERE stripe_subscription_id = ?",
                Integer.class, subscription);
        if (count >= DocksSubscriptions.Plan.HOUSEHOLD_MONTHLY.deviceLimit() - 1)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Remove an invitation or member before inviting another adult.");
        db.update("""
                INSERT INTO docks_household_invitation (id, stripe_subscription_id, invited_email, expires_at_epoch)
                VALUES (?, ?, ?, ?)
                """, UUID.randomUUID(), subscription, email, now + 7 * 86400L);
    }

    @Transactional
    public void accept(UUID account, UUID id) {
        requireEnabled();
        db.queryForObject("SELECT id FROM docks_account WHERE id = ? FOR UPDATE", UUID.class, account);
        var before = entry(id);
        if (!ownsEmail(account, before.email()) || account.equals(before.owner())) throw unavailable();
        if (seats.lockPaid(before.subscription()).isEmpty()) throw unavailable();
        var invite = entry(id);
        if (account.equals(invite.member())) return;
        long now = Instant.now().getEpochSecond();
        if (invite.member() != null || invite.expires() <= now) throw unavailable();
        int existing = db.queryForObject("SELECT COUNT(*) FROM docks_household_invitation WHERE member_account_id = ?",
                Integer.class, account);
        if (existing > 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Leave your current household before joining another.");
        db.update("UPDATE docks_household_invitation SET member_account_id = ? WHERE id = ?", account, id);
    }

    @Transactional
    public void remove(UUID account, UUID id) {
        requireEnabled();
        var before = entry(id);
        if (!mayRemove(account, before) || !seats.lock(before.subscription())) throw unavailable();
        var invite = entry(id);
        if (!mayRemove(account, invite)) throw unavailable();
        if (invite.member() != null) {
            db.update("""
                    DELETE FROM docks_subscription_seat WHERE stripe_subscription_id = ?
                    AND device_id IN (SELECT id FROM docks_device WHERE account_id = ?)
                    """, invite.subscription(), invite.member());
        }
        db.update("DELETE FROM docks_household_invitation WHERE id = ?", id);
    }

    private boolean mayRemove(UUID account, Entry invite) {
        return account.equals(invite.owner()) || account.equals(invite.member())
                || (invite.member() == null && ownsEmail(account, invite.email()));
    }

    private boolean ownsEmail(UUID account, String email) {
        return Boolean.TRUE.equals(db.queryForObject("""
                SELECT COUNT(*) > 0 FROM docks_identity WHERE account_id = ? AND issuer = ? AND subject = ?
                """, Boolean.class, account, DocksEmailSignIn.ISSUER, email));
    }

    private String householdSubscription(UUID account) {
        return db.query("""
                SELECT s.stripe_subscription_id FROM docks_subscription_status s
                JOIN docks_subscription_checkout a ON a.attempt_id = s.attempt_id
                WHERE a.account_id = ? AND a.plan IN ('HOUSEHOLD_MONTHLY', 'HOUSEHOLD_ANNUAL')
                    AND s.provider_state = 'paid' AND s.paid_until_epoch > ?
                ORDER BY a.expires_at_epoch DESC, s.stripe_subscription_id LIMIT 1
                """, (row, i) -> row.getString(1), account, Instant.now().getEpochSecond())
                .stream().findFirst().orElse(null);
    }

    private Entry entry(UUID id) {
        return db.query("""
                SELECT h.stripe_subscription_id, h.invited_email, a.account_id, h.member_account_id, h.expires_at_epoch
                FROM docks_household_invitation h
                JOIN docks_subscription_status s ON s.stripe_subscription_id = h.stripe_subscription_id
                JOIN docks_subscription_checkout a ON a.attempt_id = s.attempt_id
                WHERE h.id = ?
                """, (row, i) -> new Entry(row.getString(1), row.getString(2), row.getObject(3, UUID.class),
                    row.getObject(4, UUID.class), row.getLong(5)), id).stream().findFirst().orElseThrow(DocksHouseholds::unavailable);
    }

    private void requireEnabled() {
        if (!seats.enabled()) throw unavailable();
    }

    private static ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Household invitation unavailable.");
    }
}
