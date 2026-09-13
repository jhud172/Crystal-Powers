package com.crystalpower.website.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public class OwnerRepository {
    public record Owner(UUID id, String email, String passwordHash, String encryptedTotp,
            boolean mfaEnabled, long lastTotpStep, int credentialsVersion) {}
    private final JdbcTemplate database;
    private final RowMapper<Owner> mapper = (row, index) -> new Owner(row.getObject("id", UUID.class), row.getString("email"),
            row.getString("password_hash"), row.getString("encrypted_totp"), row.getBoolean("mfa_enabled"),
            row.getLong("last_totp_step"), row.getInt("credentials_version"));

    public OwnerRepository(JdbcTemplate database) { this.database = database; }
    public boolean exists() { return database.queryForObject("SELECT COUNT(*) FROM admin_account", Integer.class) > 0; }
    public Optional<Owner> byEmail(String email) { return database.query("SELECT * FROM admin_account WHERE email = ?", mapper, email).stream().findFirst(); }
    public Optional<Owner> byId(UUID id) { return database.query("SELECT * FROM admin_account WHERE id = ?", mapper, id).stream().findFirst(); }
    public Optional<Owner> lock(UUID id) { return database.query("SELECT * FROM admin_account WHERE id = ? FOR UPDATE", mapper, id).stream().findFirst(); }
    public Owner create(String email, String hash, String encryptedSecret) {
        UUID id = UUID.randomUUID();
        database.update("INSERT INTO admin_account (id, email, password_hash, encrypted_totp) VALUES (?, ?, ?, ?)", id, email, hash, encryptedSecret);
        return byId(id).orElseThrow();
    }
    public void acceptTotp(UUID id, long step) { database.update("UPDATE admin_account SET last_totp_step = ?, mfa_enabled = TRUE WHERE id = ?", step, id); }
    public boolean useRecovery(UUID id, String codeHash) {
        return database.update("UPDATE recovery_code SET used_at = CURRENT_TIMESTAMP WHERE account_id = ? AND code_hash = ? AND used_at IS NULL", id, codeHash) == 1;
    }
    public void addRecovery(UUID id, String hash) {
        database.update("INSERT INTO recovery_code (id, account_id, code_hash) VALUES (?, ?, ?)", UUID.randomUUID(), id, hash);
    }
    public void clearRecovery(UUID id) { database.update("DELETE FROM recovery_code WHERE account_id = ?", id); }
    public void replaceAuthenticator(UUID id, String encryptedSecret, long step) {
        database.update("UPDATE admin_account SET encrypted_totp = ?, last_totp_step = ?, mfa_enabled = TRUE, credentials_version = credentials_version + 1 WHERE id = ?", encryptedSecret, step, id);
    }
    public void invalidateSessions(UUID id) { database.update("UPDATE admin_account SET credentials_version = credentials_version + 1 WHERE id = ?", id); }
    public void audit(UUID id, String event) { database.update("INSERT INTO admin_audit (id, account_id, event) VALUES (?, ?, ?)", UUID.randomUUID(), id, event); }
}
