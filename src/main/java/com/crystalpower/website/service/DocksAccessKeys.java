package com.crystalpower.website.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class DocksAccessKeys {
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String FIELDS = "id, code_suffix, duration_days, device_limit, state, account_id, expires_at";
    private final JdbcTemplate db;
    private final TransactionTemplate tx;

    public record Key(UUID id, String codeSuffix, int durationDays, int deviceLimit, State state,
                      UUID accountId, OffsetDateTime expiresAt) {}
    public record Issued(Key key, String code) {}
    public enum State { ACTIVE, SUSPENDED, REVOKED }
    public enum Redemption { GRANTED, NOT_AVAILABLE, DEVICE_LIMIT }

    public DocksAccessKeys(JdbcTemplate db, TransactionTemplate tx) {
        this.db = db;
        this.tx = tx;
    }

    public Issued issue(UUID actor, int duration, int limit) {
        if (duration < 1 || duration > 3650 || (limit != 1 && limit != 5))
            throw new IllegalArgumentException("Invalid duration or device limit.");
        return tx.execute(status -> {
            var raw = new StringBuilder(16);
            for (int i = 0; i < 16; i++) raw.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
            String code = raw.toString();
            var key = new Key(UUID.randomUUID(), code.substring(12), duration, limit, State.ACTIVE, null, null);
            db.update("""
                    INSERT INTO docks_access_key(id, code_hash, code_suffix, duration_days, device_limit, state, created_at)
                    VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)
                    """, key.id(), hash(code), key.codeSuffix(), duration, limit, now());
            audit(key.id(), actor, "CREATED");
            return new Issued(key, String.join("-", code.substring(0, 4), code.substring(4, 8),
                    code.substring(8, 12), key.codeSuffix()));
        });
    }

    public List<Key> recent() {
        return db.query("SELECT " + FIELDS + " FROM docks_access_key ORDER BY created_at DESC, id LIMIT 100", this::read);
    }

    public boolean setState(UUID id, UUID actor, State state) {
        return Boolean.TRUE.equals(tx.execute(status -> {
            int rows = db.update("UPDATE docks_access_key SET state = ? WHERE id = ? AND state <> 'REVOKED'",
                    state.name(), id);
            if (rows > 0) audit(id, actor, state.name());
            return rows > 0;
        }));
    }

    public boolean extend(UUID id, UUID actor, int days) {
        if (days < 1 || days > 3650) throw new IllegalArgumentException("Invalid extension.");
        return Boolean.TRUE.equals(tx.execute(status -> {
            var keys = db.query("SELECT " + FIELDS + " FROM docks_access_key WHERE id = ? FOR UPDATE", this::read, id);
            if (keys.isEmpty() || keys.get(0).state() == State.REVOKED) return false;
            var key = keys.get(0);
            if (key.accountId() == null) {
                if (key.durationDays() + days > 3650) return false;
                db.update("UPDATE docks_access_key SET duration_days = ? WHERE id = ?", key.durationDays() + days, id);
            } else {
                var now = now();
                var from = key.expiresAt().isAfter(now) ? key.expiresAt() : now;
                var extended = from.plusDays(days);
                if (extended.isAfter(now.plusDays(3650))) return false;
                db.update("UPDATE docks_access_key SET expires_at = ? WHERE id = ?", extended, id);
            }
            audit(id, actor, "EXTENDED");
            return true;
        }));
    }

    public Redemption redeem(UUID account, UUID installation, String supplied) {
        String code = supplied.replace("-", "").strip().toUpperCase(Locale.ROOT);
        if (code.length() != 16 || code.chars().anyMatch(c -> ALPHABET.indexOf(c) < 0))
            return Redemption.NOT_AVAILABLE;
        return tx.execute(status -> {
            var devices = db.query("""
                    SELECT id FROM docks_device WHERE account_id = ? AND installation_id = ? FOR UPDATE
                    """, (row, i) -> row.getObject(1, UUID.class), account, installation);
            if (devices.isEmpty()) return Redemption.NOT_AVAILABLE;
            UUID device = devices.get(0);
            var keys = db.query("SELECT " + FIELDS + " FROM docks_access_key WHERE code_hash = ? FOR UPDATE",
                    this::read, hash(code));
            if (keys.isEmpty()) return Redemption.NOT_AVAILABLE;
            var key = keys.get(0);
            var now = now();
            if (key.state() != State.ACTIVE || (key.accountId() != null &&
                    (!key.accountId().equals(account) || !key.expiresAt().isAfter(now))))
                return Redemption.NOT_AVAILABLE;

            var seats = db.query("SELECT device_id FROM docks_access_key_device WHERE key_id = ?",
                    (row, i) -> row.getObject(1, UUID.class), key.id());
            if (seats.contains(device)) return Redemption.GRANTED;
            if (seats.size() >= key.deviceLimit()) return Redemption.DEVICE_LIMIT;
            if (key.accountId() == null) {
                db.update("""
                        UPDATE docks_access_key SET account_id = ?, redeemed_at = ?, expires_at = ? WHERE id = ?
                        """, account, now, now.plusDays(key.durationDays()), key.id());
            }
            db.update("INSERT INTO docks_access_key_device(key_id, device_id) VALUES (?, ?)", key.id(), device);
            audit(key.id(), account, "DEVICE_GRANTED");
            return Redemption.GRANTED;
        });
    }

    private Key read(ResultSet row, int index) throws SQLException {
        return new Key(row.getObject("id", UUID.class), row.getString("code_suffix"), row.getInt("duration_days"),
                row.getInt("device_limit"), State.valueOf(row.getString("state")),
                row.getObject("account_id", UUID.class), row.getObject("expires_at", OffsetDateTime.class));
    }

    private void audit(UUID key, UUID actor, String action) {
        db.update("INSERT INTO docks_access_key_audit(id, key_id, actor_id, action, created_at) VALUES (?, ?, ?, ?, ?)",
                UUID.randomUUID(), key, actor, action, now());
    }

    private static OffsetDateTime now() { return OffsetDateTime.now(ZoneOffset.UTC); }

    private static String hash(String raw) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 unavailable", error);
        }
    }
}
