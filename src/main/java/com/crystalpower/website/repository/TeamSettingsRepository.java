package com.crystalpower.website.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public class TeamSettingsRepository {
    public record Branding(String name,String tagline,int version) {}
    public record Preferences(boolean compact,boolean unreadBadges,boolean mentionAlerts,int version) {}
    public record ChannelPreference(UUID channelId,boolean unreadBadges,boolean mentionAlerts,boolean favourite,int version) {}
    private final JdbcTemplate db;
    public TeamSettingsRepository(JdbcTemplate db) { this.db=db; }
    public Branding branding(UUID workspace) { return db.queryForObject("SELECT name,tagline,settings_version FROM team_workspace WHERE id=?",(row,index)->new Branding(row.getString("name"),row.getString("tagline"),row.getInt("settings_version")),workspace); }
    public Preferences preferences(UUID workspace,String key) { return db.query("SELECT * FROM team_preferences WHERE workspace_id=? AND actor_key=?",(row,index)->new Preferences(row.getBoolean("compact"),row.getBoolean("unread_badges"),row.getBoolean("mention_alerts"),row.getInt("version")),workspace,key).stream().findFirst().orElse(new Preferences(false,true,true,0)); }
    public boolean mentionEnabled(String key,UUID channel) {
        boolean global=db.query("SELECT mention_alerts FROM team_preferences WHERE actor_key=?",(row,index)->row.getBoolean(1),key).stream().findFirst().orElse(true);
        return global && db.query("SELECT mention_alerts FROM team_channel_preferences WHERE actor_key=? AND channel_id=?",(row,index)->row.getBoolean(1),key,channel).stream().findFirst().orElse(true);
    }
    public java.util.List<ChannelPreference> channels(UUID workspace,String key) { return db.query("SELECT * FROM team_channel_preferences WHERE workspace_id=? AND actor_key=?",(row,index)->new ChannelPreference(row.getObject("channel_id",UUID.class),row.getBoolean("unread_badges"),row.getBoolean("mention_alerts"),row.getBoolean("favourite"),row.getInt("version")),workspace,key); }
    public ChannelPreference channel(UUID workspace,String key,UUID channel) { return channels(workspace,key).stream().filter(value->value.channelId().equals(channel)).findFirst().orElse(new ChannelPreference(channel,true,true,false,0)); }
    public int channel(UUID workspace,String key,UUID owner,UUID member,ChannelPreference input) {
        int changed=db.update("UPDATE team_channel_preferences SET unread_badges=?,mention_alerts=?,favourite=?,version=version+1 WHERE workspace_id=? AND actor_key=? AND channel_id=? AND version=?",input.unreadBadges(),input.mentionAlerts(),input.favourite(),workspace,key,input.channelId(),input.version());
        if(changed==1)return 1;
        Integer exists=db.queryForObject("SELECT COUNT(*) FROM team_channel_preferences WHERE actor_key=? AND channel_id=?",Integer.class,key,input.channelId());
        if(input.version()!=0 || exists!=0)return 0;
        return db.update("INSERT INTO team_channel_preferences(actor_key,channel_id,workspace_id,owner_id,member_id,unread_badges,mention_alerts,favourite,version) VALUES(?,?,?,?,?,?,?,?,1)",key,input.channelId(),workspace,owner,member,input.unreadBadges(),input.mentionAlerts(),input.favourite());
    }
    public int branding(UUID workspace,int version,String name,String tagline) { return db.update("UPDATE team_workspace SET name=?,tagline=?,settings_version=settings_version+1 WHERE id=? AND settings_version=?",name,tagline,workspace,version); }
    public int preferences(UUID workspace,String key,UUID owner,UUID member,Preferences input) {
        int changed=db.update("UPDATE team_preferences SET compact=?,unread_badges=?,mention_alerts=?,version=version+1 WHERE workspace_id=? AND actor_key=? AND version=?",input.compact(),input.unreadBadges(),input.mentionAlerts(),workspace,key,input.version());
        if(changed==1)return 1;
        Integer exists=db.queryForObject("SELECT COUNT(*) FROM team_preferences WHERE actor_key=?",Integer.class,key);
        if(input.version()!=0 || exists!=0)return 0;
        return db.update("INSERT INTO team_preferences(actor_key,workspace_id,owner_id,member_id,compact,unread_badges,mention_alerts,version) VALUES(?,?,?,?,?,?,?,1)",key,workspace,owner,member,input.compact(),input.unreadBadges(),input.mentionAlerts());
    }
    public void displayName(UUID workspace,UUID member,String name) {
        int changed=db.update("UPDATE team_account SET display_name=?,updated_at=CURRENT_TIMESTAMP WHERE workspace_id=? AND id=? AND display_name<>?",name,workspace,member,name);
        if(changed==1)db.update("UPDATE team_channel SET conversation_version=conversation_version+1 WHERE workspace_id=?",workspace);
    }
}
