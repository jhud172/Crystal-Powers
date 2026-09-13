package com.crystalpower.website.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public class RecoveryRepository {
    private final JdbcTemplate database;
    public RecoveryRepository(JdbcTemplate database) { this.database = database; }
    public void create(UUID owner, String hash, Instant expiry) {
        database.update("UPDATE password_reset SET used_at = CURRENT_TIMESTAMP WHERE account_id = ? AND used_at IS NULL", owner);
        database.update("INSERT INTO password_reset (token_hash, account_id, expires_at) VALUES (?, ?, ?)", hash, owner, Timestamp.from(expiry));
        database.update("DELETE FROM password_reset WHERE expires_at < ?", Timestamp.from(Instant.now().minusSeconds(86400)));
    }
    public Optional<UUID> owner(String hash) { return database.query("SELECT account_id FROM password_reset WHERE token_hash = ? AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP", (row, index) -> row.getObject("account_id", UUID.class), hash).stream().findFirst(); }
    public boolean consume(String hash) { return database.update("UPDATE password_reset SET used_at = CURRENT_TIMESTAMP WHERE token_hash = ? AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP", hash) == 1; }
    public void changePassword(UUID owner, String hash) { database.update("UPDATE admin_account SET password_hash = ?, credentials_version = credentials_version + 1 WHERE id = ?", hash, owner); }
    public void invalidateResets(UUID owner) { database.update("UPDATE password_reset SET used_at = CURRENT_TIMESTAMP WHERE account_id = ? AND used_at IS NULL", owner); }
}
