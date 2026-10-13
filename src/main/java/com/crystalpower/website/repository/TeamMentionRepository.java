package com.crystalpower.website.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Repository
public class TeamMentionRepository {
    public record Mention(long id,UUID channelId,String channelName,String author,String preview,OffsetDateTime createdAt) {}
    private final JdbcTemplate db;
    private final TeamSettingsRepository settings;
    public TeamMentionRepository(JdbcTemplate db,TeamSettingsRepository settings){this.db=db;this.settings=settings;}
    public void add(long message,UUID channel,String key){if(!settings.mentionEnabled(key,channel))return;boolean owner=key.startsWith("OWNER:");UUID account=UUID.fromString(key.substring(key.indexOf(':')+1));db.update("INSERT INTO team_mention(message_id,channel_id,recipient_key,recipient_owner_id,recipient_team_id) VALUES (?,?,?,?,?)",message,channel,key,owner ? account : null,owner ? null : account);}
    public List<Mention> inbox(String key,Set<UUID> channels,Long before){
        if(channels.isEmpty())return List.of();var args=new java.util.ArrayList<Object>();args.add(key);args.add(before==null ? Long.MAX_VALUE : before);args.addAll(channels);
        String placeholders=String.join(",",java.util.Collections.nCopies(channels.size(),"?"));
        return db.query("SELECT m.id,n.channel_id,c.name AS channel_name,COALESCE(a.display_name,'James') AS author,SUBSTRING(m.body,1,240) AS preview,m.created_at FROM team_mention n JOIN team_message m ON m.id=n.message_id AND m.channel_id=n.channel_id JOIN team_channel c ON c.id=n.channel_id LEFT JOIN team_account a ON a.id=m.author_team_id WHERE n.recipient_key=? AND n.acknowledged_at IS NULL AND m.deleted=FALSE AND c.archived=FALSE AND m.id<? AND n.channel_id IN ("+placeholders+") ORDER BY m.id DESC LIMIT 51",(r,i)->new Mention(r.getLong("id"),r.getObject("channel_id",UUID.class),r.getString("channel_name"),r.getString("author"),r.getString("preview"),r.getObject("created_at",OffsetDateTime.class)),args.toArray());
    }
    public int acknowledge(String key,UUID channel,long message){return db.update("UPDATE team_mention SET acknowledged_at=COALESCE(acknowledged_at,CURRENT_TIMESTAMP) WHERE recipient_key=? AND channel_id=? AND message_id=?",key,channel,message);}
}
