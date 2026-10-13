package com.crystalpower.website.repository;

import com.crystalpower.website.security.TeamRole;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class TeamIdentityRepository {
    public record Member(UUID id, UUID workspaceId, String email, String displayName, TeamRole role, String state, int credentialsVersion) {}
    public record Invitation(UUID accountId, Instant expiresAt) {}
    public record Credentials(Member member, String passwordHash, String encryptedTotp, boolean mfaEnabled, long lastTotpStep) {}
    private final JdbcTemplate database;
    private final RowMapper<Member> mapper = (row, index) -> new Member(row.getObject("id", UUID.class), row.getObject("workspace_id", UUID.class), row.getString("email"), row.getString("display_name"), TeamRole.valueOf(row.getString("role")), row.getString("state"), row.getInt("credentials_version"));
    public TeamIdentityRepository(JdbcTemplate database) { this.database = database; }
    private final RowMapper<Credentials> credentialsMapper = (row, index) -> new Credentials(mapper.mapRow(row, index), row.getString("password_hash"), row.getString("encrypted_totp"), row.getBoolean("mfa_enabled"), row.getLong("last_totp_step"));
    public Optional<Credentials> credentials(String email) { return database.query("SELECT * FROM team_account WHERE email = ?", credentialsMapper, email).stream().findFirst(); }
    public Optional<Credentials> credentials(UUID id, boolean lock) { return database.query("SELECT * FROM team_account WHERE id = ?" + (lock ? " FOR UPDATE" : ""), credentialsMapper, id).stream().findFirst(); }
    public void setAuthenticator(UUID id, String encrypted) { database.update("UPDATE team_account SET encrypted_totp = ? WHERE id = ?", encrypted, id); }
    public void acceptAuthenticator(UUID id, long step, int nextVersion) { database.update("UPDATE team_account SET mfa_enabled = TRUE, last_totp_step = ?, credentials_version = ? WHERE id = ?", step, nextVersion, id); }
    public void auditMember(UUID account, String event) { database.update("INSERT INTO team_audit (id, workspace_id, actor_team_id, event, resource_id) SELECT ?, workspace_id, ?, ?, ? FROM team_account WHERE id = ?", UUID.randomUUID(), account, event, account, account); }
    public Optional<UUID> workspace(UUID owner) { return database.query("SELECT id FROM team_workspace WHERE owner_id = ?", (row, index) -> row.getObject("id", UUID.class), owner).stream().findFirst(); }
    public UUID workspaceOwner(UUID workspace) { return database.queryForObject("SELECT owner_id FROM team_workspace WHERE id = ?", UUID.class, workspace); }
    public void lockWorkspace(UUID workspace) { database.queryForObject("SELECT id FROM team_workspace WHERE id = ? FOR UPDATE", UUID.class, workspace); }
    public UUID createWorkspace(UUID owner) {
        UUID id = UUID.randomUUID();
        database.update("INSERT INTO team_workspace (id, owner_id, name) VALUES (?, ?, ?)", id, owner, "Crystal Powers");
        return id;
    }
    public List<Member> members(UUID workspace) { return database.query("SELECT * FROM team_account WHERE workspace_id = ? ORDER BY display_name, created_at", mapper, workspace); }
    public Optional<Member> member(UUID workspace, UUID id) { return database.query("SELECT * FROM team_account WHERE workspace_id = ? AND id = ?", mapper, workspace, id).stream().findFirst(); }
    public Member create(UUID workspace, String email, String name, TeamRole role) {
        UUID id = UUID.randomUUID();
        database.update("INSERT INTO team_account (id, workspace_id, email, display_name, role) VALUES (?, ?, ?, ?, ?)", id, workspace, email, name, role.name());
        return member(workspace, id).orElseThrow();
    }
    public void invite(UUID account, UUID owner, String hash, Instant expires) {
        invite(account, owner, null, hash, expires);
    }
    public void invite(UUID account, UUID owner, UUID actorTeam, String hash, Instant expires) {
        database.update("UPDATE team_invitation SET used_at = CURRENT_TIMESTAMP WHERE account_id = ? AND used_at IS NULL", account);
        database.update("INSERT INTO team_invitation (token_hash, account_id, created_by_owner, created_by_team, expires_at) VALUES (?, ?, ?, ?, ?)", hash, account, owner, actorTeam, OffsetDateTime.ofInstant(expires, ZoneOffset.UTC));
    }
    public Optional<Invitation> invitation(String hash) { return database.query("SELECT account_id, expires_at FROM team_invitation WHERE token_hash=? AND used_at IS NULL",(r,n)->new Invitation(r.getObject("account_id",UUID.class),r.getObject("expires_at",OffsetDateTime.class).toInstant()),hash).stream().findFirst(); }
    public Optional<Invitation> lockInvitation(String hash) { return database.query("SELECT account_id, expires_at FROM team_invitation WHERE token_hash = ? AND used_at IS NULL FOR UPDATE", (row, index) -> new Invitation(row.getObject("account_id", UUID.class), row.getObject("expires_at", OffsetDateTime.class).toInstant()), hash).stream().findFirst(); }
    public int activate(UUID account, String passwordHash) { return database.update("UPDATE team_account SET password_hash = ?, state = 'ACTIVE', credentials_version = credentials_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND state = 'INVITED'", passwordHash, account); }
    public void consume(String hash) { database.update("UPDATE team_invitation SET used_at = CURRENT_TIMESTAMP WHERE token_hash = ?", hash); }
    public int change(UUID workspace, UUID account, int expectedVersion, TeamRole role, String state) { return database.update("UPDATE team_account SET role_profile_id = CASE WHEN role = ? THEN role_profile_id ELSE NULL END, role = ?, state = ?, credentials_version = credentials_version + 1, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ? AND id = ? AND credentials_version = ?", role.name(), role.name(), state, workspace, account, expectedVersion); }
    public void audit(UUID workspace, UUID owner, String event, UUID resource) { database.update("INSERT INTO team_audit (id, workspace_id, actor_owner_id, event, resource_id) VALUES (?, ?, ?, ?, ?)", UUID.randomUUID(), workspace, owner, event, resource); }
    public void auditActor(UUID workspace, UUID owner, UUID member, String event, UUID resource) { database.update("INSERT INTO team_audit(id, workspace_id, actor_owner_id, actor_team_id, event, resource_id) VALUES (?, ?, ?, ?, ?, ?)", UUID.randomUUID(), workspace, owner, member, event, resource); }
    public int cancelInvitation(UUID workspace, UUID account, int version) {
        int changed = database.update("UPDATE team_account SET state = 'SUSPENDED', credentials_version = credentials_version + 1, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ? AND id = ? AND credentials_version = ? AND state = 'INVITED'", workspace, account, version);
        if (changed == 1) database.update("UPDATE team_invitation SET used_at = CURRENT_TIMESTAMP WHERE account_id = ? AND used_at IS NULL", account); return changed;
    }
    public int resetCredentials(UUID workspace, UUID account, int version) { return database.update("UPDATE team_account SET state = 'INVITED', password_hash = NULL, encrypted_totp = NULL, mfa_enabled = FALSE, last_totp_step = -1, credentials_version = credentials_version + 1, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ? AND id = ? AND credentials_version = ?", workspace, account, version); }
}
