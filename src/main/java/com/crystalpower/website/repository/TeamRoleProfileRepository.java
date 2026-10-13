package com.crystalpower.website.repository;

import com.crystalpower.website.security.TeamPermission;
import com.crystalpower.website.security.TeamRole;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public class TeamRoleProfileRepository {
    public record Profile(UUID id, UUID workspaceId, String name, TeamRole baseRole, Set<TeamPermission> permissions, boolean archived, int version) {}
    public record Assignment(UUID memberId, UUID profileId, int credentialsVersion) {}
    private final JdbcTemplate database;
    private final RowMapper<Profile> mapper = (row,index) -> new Profile(row.getObject("id",UUID.class),row.getObject("workspace_id",UUID.class),row.getString("name"),TeamRole.valueOf(row.getString("base_role")),decode(row.getString("permissions")),row.getBoolean("archived"),row.getInt("version"));
    public TeamRoleProfileRepository(JdbcTemplate database) { this.database=database; }
    private static Set<TeamPermission> decode(String value) { if(value.isBlank())return Set.of();return Arrays.stream(value.split(",")).map(TeamPermission::valueOf).collect(java.util.stream.Collectors.toUnmodifiableSet()); }
    private static String encode(Set<TeamPermission> values) { return values.stream().map(Enum::name).sorted().collect(java.util.stream.Collectors.joining(",")); }
    public List<Profile> profiles(UUID workspace) { return database.query("SELECT * FROM team_role_profile WHERE workspace_id=? ORDER BY name,id",mapper,workspace); }
    public Optional<Profile> profile(UUID workspace,UUID id) { return database.query("SELECT * FROM team_role_profile WHERE workspace_id=? AND id=?",mapper,workspace,id).stream().findFirst(); }
    public Optional<UUID> assigned(UUID member) { return database.query("SELECT role_profile_id FROM team_account WHERE id=?",(row,index)->row.getObject("role_profile_id",UUID.class),member).stream().filter(Objects::nonNull).findFirst(); }
    public List<Assignment> assignments(UUID workspace) { return database.query("SELECT id,role_profile_id,credentials_version FROM team_account WHERE workspace_id=?",(row,index)->new Assignment(row.getObject("id",UUID.class),row.getObject("role_profile_id",UUID.class),row.getInt("credentials_version")),workspace); }
    public Profile create(UUID workspace,String name,TeamRole base,Set<TeamPermission> permissions) { UUID id=UUID.randomUUID();database.update("INSERT INTO team_role_profile(id,workspace_id,name,base_role,permissions) VALUES(?,?,?,?,?)",id,workspace,name,base.name(),encode(permissions));return profile(workspace,id).orElseThrow(); }
    public int update(UUID workspace,UUID id,int version,String name,Set<TeamPermission> permissions,boolean archived) { return database.update("UPDATE team_role_profile SET name=?,permissions=?,archived=?,version=version+1 WHERE workspace_id=? AND id=? AND version=?",name,encode(permissions),archived,workspace,id,version); }
    public void revokeAssigned(UUID workspace,UUID profile) { database.update("UPDATE team_account SET credentials_version=credentials_version+1,updated_at=CURRENT_TIMESTAMP WHERE workspace_id=? AND role_profile_id=?",workspace,profile); }
    public int assign(UUID workspace,UUID member,int version,UUID profile) { return database.update("UPDATE team_account SET role_profile_id=?,credentials_version=credentials_version+1,updated_at=CURRENT_TIMESTAMP WHERE workspace_id=? AND id=? AND credentials_version=?",profile,workspace,member,version); }
}
