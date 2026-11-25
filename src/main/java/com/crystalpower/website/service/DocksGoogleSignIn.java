package com.crystalpower.website.service;

import java.net.URI;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class DocksGoogleSignIn {
    private enum Destination { BROWSER, DESKTOP }
    public record Start(URI authorisation, String browserToken) {}
    private final JdbcTemplate db;
    private final TransactionTemplate tx;
    private final DocksEmailSignIn accounts;
    private final GoogleDocksProvider google;

    public DocksGoogleSignIn(JdbcTemplate db, TransactionTemplate tx, DocksEmailSignIn accounts, GoogleDocksProvider google) {
        this.db = db;
        this.tx = tx;
        this.accounts = accounts;
        this.google = google;
    }

    public boolean enabled() { return accounts.pilotAvailable() && google.enabled(); }
    public boolean acceptsOrigin(String origin) { return enabled() && google.acceptsOrigin(origin); }

    public Start start() {
        String state = DocksEmailSignIn.randomToken();
        String browser = DocksEmailSignIn.randomToken();
        String nonce = DocksEmailSignIn.randomToken();
        var now = now();
        db.update("DELETE FROM docks_google_challenge WHERE expires_at <= ?", now);
        db.update("DELETE FROM docks_google_ticket WHERE expires_at <= ?", now);
        db.update("INSERT INTO docks_google_challenge(state_hash, browser_hash, nonce, expires_at) VALUES (?, ?, ?, ?)",
                hash(state), hash(browser), nonce, now.plusMinutes(10));
        return new Start(google.authorise(state, nonce), browser);
    }

    public Optional<String> complete(String state, String browser, String code) {
        if (!enabled() || !token(state) || !token(browser)) return Optional.empty();
        var nonce = tx.execute(status -> {
            var match = db.query("""
                    SELECT nonce FROM docks_google_challenge
                    WHERE state_hash = ? AND browser_hash = ? AND expires_at > ? FOR UPDATE
                    """, (row, i) -> row.getString(1), hash(state), hash(browser), now());
            if (match.isEmpty()) return Optional.<String>empty();
            db.update("DELETE FROM docks_google_challenge WHERE state_hash = ?", hash(state));
            return Optional.of(match.get(0));
        });
        if (nonce.isEmpty() || code == null) return Optional.empty();
        return google.exchange(code, nonce.get()).filter(accounts::allowsGoogleIdentity).map(identity -> {
            UUID account = accounts.googleIdentity(identity);
            return issueTicket(account, Destination.BROWSER);
        });
    }

    public String desktopCode(UUID account) {
        return tx.execute(status -> {
            db.queryForObject("SELECT id FROM docks_account WHERE id = ? FOR UPDATE", UUID.class, account);
            db.update("DELETE FROM docks_google_ticket WHERE account_id = ? AND destination = 'DESKTOP'", account);
            return issueTicket(account, Destination.DESKTOP);
        });
    }

    private String issueTicket(UUID account, Destination destination) {
        String ticket = DocksEmailSignIn.randomToken();
        db.update("INSERT INTO docks_google_ticket(token_hash, account_id, destination, expires_at) VALUES (?, ?, ?, ?)",
                hash(ticket), account, destination.name(), now().plusMinutes(2));
        return ticket;
    }

    public Optional<DocksEmailSignIn.Session> exchange(String ticket) {
        return exchange(ticket, Destination.BROWSER);
    }

    public Optional<DocksEmailSignIn.Session> exchangeDesktop(String ticket) {
        return exchange(ticket, Destination.DESKTOP);
    }

    private Optional<DocksEmailSignIn.Session> exchange(String ticket, Destination destination) {
        if (!enabled() || !token(ticket)) return Optional.empty();
        return tx.execute(status -> {
            var match = db.query("""
                    SELECT account_id FROM docks_google_ticket
                    WHERE token_hash = ? AND destination = ? AND expires_at > ? FOR UPDATE
                    """, (row, i) -> row.getObject(1, UUID.class), hash(ticket), destination.name(), now());
            if (match.isEmpty()) return Optional.empty();
            db.update("DELETE FROM docks_google_ticket WHERE token_hash = ?", hash(ticket));
            UUID account = match.get(0);
            return accounts.pilotAllowsAccount(account) ? Optional.of(accounts.issueSession(account)) : Optional.empty();
        });
    }

    private static boolean token(String value) { return value != null && value.matches("[A-Za-z0-9_-]{43}"); }
    private static String hash(String value) { return DocksEmailSignIn.digest(value); }
    private static OffsetDateTime now() { return OffsetDateTime.now(ZoneOffset.UTC); }
}
