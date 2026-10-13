package com.crystalpower.website.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class TeamGroupRepository {
    public record Group(UUID id,String name,String description,boolean archived,int version) {}
    private final JdbcTemplate db;
    private final RowMapper<Group> row=(r,n)->new Group(r.getObject("id",UUID.class),r.getString("name"),r.getString("description"),r.getBoolean("archived"),r.getInt("version"));
    public TeamGroupRepository(JdbcTemplate db){this.db=db;}
    public List<Group> list(UUID workspace){return db.query("SELECT * FROM team_group WHERE workspace_id=? ORDER BY name_key,id LIMIT 100",row,workspace);}
    public Optional<Group> group(UUID workspace,UUID id,boolean lock){return db.query("SELECT * FROM team_group WHERE workspace_id=? AND id=?"+(lock ? " FOR UPDATE" : ""),row,workspace,id).stream().findFirst();}
    public List<UUID> members(UUID id){return db.query("SELECT member_id FROM team_group_member WHERE group_id=? ORDER BY member_id",(r,n)->r.getObject(1,UUID.class),id);}
    public java.util.Set<UUID> visibleIds(UUID workspace,UUID member,boolean admin){String sql=admin ? "SELECT id FROM team_group WHERE workspace_id=? AND archived=FALSE" : "SELECT g.id FROM team_group g JOIN team_group_member gm ON gm.group_id=g.id JOIN team_account a ON a.id=gm.member_id WHERE g.workspace_id=? AND g.archived=FALSE AND gm.member_id=? AND a.state='ACTIVE'";return new java.util.HashSet<>(admin ? db.query(sql,(r,n)->r.getObject(1,UUID.class),workspace) : db.query(sql,(r,n)->r.getObject(1,UUID.class),workspace,member));}
    public boolean member(UUID group,UUID account){return Boolean.TRUE.equals(db.queryForObject("SELECT EXISTS (SELECT 1 FROM team_group_member gm JOIN team_account a ON a.id=gm.member_id WHERE gm.group_id=? AND gm.member_id=? AND a.state='ACTIVE')",Boolean.class,group,account));}
    public Group create(UUID workspace,String name,String key,String description){UUID id=UUID.randomUUID();db.update("INSERT INTO team_group(id,workspace_id,name,name_key,description) VALUES (?,?,?,?,?)",id,workspace,name,key,description);return group(workspace,id,false).orElseThrow();}
    public int update(UUID workspace,UUID id,int version,String name,String key,String description,boolean archived){return db.update("UPDATE team_group SET name=?,name_key=?,description=?,archived=?,version=version+1 WHERE workspace_id=? AND id=? AND version=?",name,key,description,archived,workspace,id,version);}
    public void replaceMembers(UUID group,List<UUID> members){db.update("DELETE FROM team_group_member WHERE group_id=?",group);for(UUID member:members)db.update("INSERT INTO team_group_member(group_id,member_id) VALUES (?,?)",group,member);}
}
