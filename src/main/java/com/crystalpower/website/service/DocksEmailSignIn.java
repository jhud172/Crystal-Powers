package com.crystalpower.website.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class DocksEmailSignIn {
    private static final SecureRandom RANDOM = new SecureRandom();
    static final String ISSUER = "crystal-powers-email";
    private final JdbcTemplate db;
    private final TransactionTemplate transaction;
    private final EmailTransport mail;
    private final boolean enabled;
    private final DocksPilotAccess pilot;

    public record Session(String accessToken, OffsetDateTime expiresAt, UUID accountId) {}

    public DocksEmailSignIn(JdbcTemplate db, TransactionTemplate transaction, EmailTransport mail,
            @Value("${app.docks.email-enabled:false}") boolean enabled, DocksPilotAccess pilot) {
        this.db = db;
        this.transaction = transaction;
        this.mail = mail;
        this.enabled = enabled;
        this.pilot = pilot;
    }

    public boolean available() {
        return enabled && pilot.available() && mail.configured();
    }

    /** Returns quietly when rate limited, so the response never identifies registered addresses. */
    public void request(String address) {
        String email = normaliseEmail(address);
        if (!pilot.allows(email)) return;
        String code = randomToken();
        String hash = digest(code);
        var now = now();
        Boolean reserved = transaction.execute(status -> {
            lockGate();
            db.update("DELETE FROM docks_email_rate WHERE sent_at <= ?", now.minusHours(1));
            db.update("DELETE FROM docks_email_challenge WHERE expires_at <= ?", now);
            var recent = db.queryForObject("SELECT COUNT(*) FROM docks_email_rate", Integer.class);
            String bucket = digest(email);
            var last = db.query("SELECT sent_at FROM docks_email_rate WHERE bucket = ?",
                    (row, i) -> row.getObject(1, OffsetDateTime.class), bucket);
            if (recent >= 50 || (!last.isEmpty() && last.get(0).isAfter(now.minusMinutes(2)))) return false;
            // Count every admitted request, including repeats to the same address.
            db.update("INSERT INTO docks_email_rate(bucket, sent_at) VALUES (?, ?)", digest(randomToken()), now);
            if (last.isEmpty()) db.update("INSERT INTO docks_email_rate(bucket, sent_at) VALUES (?, ?)", bucket, now);
            else db.update("UPDATE docks_email_rate SET sent_at = ? WHERE bucket = ?", now, bucket);
            db.update("DELETE FROM docks_email_challenge WHERE email = ?", email);
            db.update("INSERT INTO docks_email_challenge(token_hash, email, expires_at) VALUES (?, ?, ?)",
                    hash, email, now.plusMinutes(10));
            return true;
        });
        if (!Boolean.TRUE.equals(reserved)) return;

        try {
            mail.send(new EmailTransport.Message(email, null, "Your Crystal Docks sign-in code",
                    "<p>Paste this code into Crystal Docks to sign in. It expires in 10 minutes.</p><p><strong>"
                            + code + "</strong></p><p>If you did not request this code, you can ignore this email.</p>",
                    List.of()));
        } catch (EmailTransport.DeliveryException error) {
            db.update("DELETE FROM docks_email_challenge WHERE token_hash = ?", hash);
            throw error;
        }
    }

    public Optional<Session> exchange(String code) {
        String hash = digest(code);
        var now = now();
        return transaction.execute(status -> {
            lockGate();
            var addresses = db.query("SELECT email FROM docks_email_challenge WHERE token_hash = ? AND expires_at > ?",
                    (row, i) -> row.getString(1), hash, now);
            if (addresses.isEmpty()) return Optional.empty();
            db.update("DELETE FROM docks_email_challenge WHERE token_hash = ?", hash);
            String email = addresses.get(0);
            if (!pilot.allows(email)) return Optional.empty();
            UUID account = identity(ISSUER, email).orElseGet(() -> {
                var created = newAccount();
                addIdentity(ISSUER, email, created);
                return created;
            });
            return Optional.of(issueSession(account));
        });
    }

    boolean pilotAvailable() { return pilot.available(); }
    boolean allowsGoogleIdentity(GoogleDocksProvider.Identity identity) { return pilot.allows(identity); }

    boolean pilotAllowsAccount(UUID account) {
        if (!pilot.restricted()) return true;
        if (!pilot.available()) return false;
        return db.query("SELECT subject FROM docks_identity WHERE account_id = ? AND issuer = ?",
                (row, i) -> row.getString(1), account, ISSUER).stream().anyMatch(pilot::allows);
    }

    UUID googleIdentity(GoogleDocksProvider.Identity verified) {
        String issuer = "https://accounts.google.com";
        return transaction.execute(status -> {
            lockGate();
            return identity(issuer, verified.subject()).orElseGet(() -> {
                UUID account;
                if (verified.authoritativeEmail()) {
                    String email = normaliseEmail(verified.email());
                    account = identity(ISSUER, email).orElseGet(() -> {
                        var created = newAccount();
                        addIdentity(ISSUER, email, created);
                        return created;
                    });
                } else {
                    account = newAccount();
                }
                addIdentity(issuer, verified.subject(), account);
                return account;
            });
        });
    }

    private Optional<UUID> identity(String issuer, String subject) {
        return db.query("SELECT account_id FROM docks_identity WHERE issuer = ? AND subject = ?",
                (row, i) -> row.getObject(1, UUID.class), issuer, subject).stream().findFirst();
    }

    private UUID newAccount() {
        var account = UUID.randomUUID();
        db.update("INSERT INTO docks_account(id, display_name) VALUES (?, ?)", account, "Crystal Docks customer");
        return account;
    }

    private void addIdentity(String issuer, String subject, UUID account) {
        db.update("INSERT INTO docks_identity(issuer, subject, account_id) VALUES (?, ?, ?)", issuer, subject, account);
    }

    Session issueSession(UUID account) {
        var now = now();
        db.update("DELETE FROM docks_session WHERE expires_at <= ?", now);
        var access = randomToken();
        var expires = now.plusDays(7);
        db.update("INSERT INTO docks_session(token_hash, account_id, expires_at, issued_at) VALUES (?, ?, ?, ?)",
                digest(access), account, expires, now);
        return new Session(access, expires, account);
    }

    static String normaliseEmail(String address) {
        return address.trim().toLowerCase(Locale.ROOT);
    }

    public Optional<UUID> account(String authorization) {
        String token = bearer(authorization);
        if (token == null) return Optional.empty();
        return db.query("SELECT account_id FROM docks_session WHERE token_hash = ? AND expires_at > ?",
                (row, i) -> row.getObject(1, UUID.class), digest(token), now()).stream().filter(this::pilotAllowsAccount).findFirst();
    }

    Optional<UUID> recentlyVerifiedAccount(String authorization) {
        String token = bearer(authorization);
        if (token == null) return Optional.empty();
        var time = now();
        return db.query("""
                SELECT account_id FROM docks_session WHERE token_hash = ? AND expires_at > ? AND issued_at > ?
                """, (row, i) -> row.getObject(1, UUID.class), digest(token), time, time.minusMinutes(10))
                .stream().filter(this::pilotAllowsAccount).findFirst();
    }

    public void signOut(String authorization) {
        String token = bearer(authorization);
        if (token != null) db.update("DELETE FROM docks_session WHERE token_hash = ?", digest(token));
    }

    private void lockGate() {
        db.queryForObject("SELECT id FROM docks_email_gate WHERE id = 1 FOR UPDATE", Integer.class);
    }

    private static String bearer(String authorization) {
        if (authorization == null || !authorization.matches("Bearer [A-Za-z0-9_-]{43}")) return null;
        return authorization.substring(7);
    }

    static String randomToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String digest(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 unavailable", error);
        }
    }

    private static OffsetDateTime now() { return Instant.now().atOffset(ZoneOffset.UTC); }
}
