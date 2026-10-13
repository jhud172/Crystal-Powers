package com.crystalpower.website.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public class TeamReadRepository {
    public record Unread(UUID channelId,long count,long lastReadId,long latestId) {}
    private final JdbcTemplate db;
    public TeamReadRepository(JdbcTemplate db){this.db=db;}
    public List<Unread> summary(UUID workspace,String key,UUID owner,UUID member){
        String author=member==null ? "m.author_owner_id" : "m.author_team_id";
        String sql="SELECT c.id,COALESCE(r.last_read_id,0) AS last_read_id,COALESCE(MAX(m.id),0) AS latest_id,COALESCE(SUM(CASE WHEN m.id>COALESCE(r.last_read_id,0) AND ("+author+" IS NULL OR "+author+"<>?) THEN 1 ELSE 0 END),0) AS unread_count FROM team_channel c LEFT JOIN team_channel_read r ON r.channel_id=c.id AND r.reader_key=? LEFT JOIN team_message m ON m.channel_id=c.id AND m.deleted=FALSE WHERE c.workspace_id=? AND c.archived=FALSE GROUP BY c.id,r.last_read_id";
        return db.query(sql,(r,n)->new Unread(r.getObject("id",UUID.class),r.getLong("unread_count"),r.getLong("last_read_id"),r.getLong("latest_id")),member==null ? owner : member,key,workspace);
    }
    public boolean markerExists(UUID channel,long id){return id==0 || Boolean.TRUE.equals(db.queryForObject("SELECT EXISTS (SELECT 1 FROM team_message WHERE channel_id=? AND id=?)",Boolean.class,channel,id));}
    public void mark(UUID channel,String key,UUID owner,UUID member,long through){
        int updated=db.update("UPDATE team_channel_read SET last_read_id=CASE WHEN last_read_id<? THEN ? ELSE last_read_id END,updated_at=CURRENT_TIMESTAMP WHERE channel_id=? AND reader_key=?",through,through,channel,key);
        if(updated==0)db.update("INSERT INTO team_channel_read(channel_id,reader_key,reader_owner_id,reader_team_id,last_read_id) VALUES (?,?,?,?,?)",channel,key,owner,member,through);
    }
}
