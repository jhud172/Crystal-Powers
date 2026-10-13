package com.crystalpower.website.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class TeamChannelRepository {
    public record Channel(UUID id, String name, String description, String category, String audience, boolean archived, int version,UUID groupId) {}
    public record Message(long id, String author, UUID authorOwnerId, UUID authorTeamId, String body, int version, OffsetDateTime createdAt, OffsetDateTime editedAt,Long replyToId,String replyAuthor,String replyBody,boolean pinned) {}
    public record Submission(long id,UUID channelId,String fingerprint) {}
    private final JdbcTemplate db;
    private final RowMapper<Channel> channels = (row, index) -> new Channel(row.getObject("id", UUID.class), row.getString("name"), row.getString("description"), row.getString("category"), row.getString("audience"), row.getBoolean("archived"), row.getInt("version"),row.getObject("group_id",UUID.class));
    private final RowMapper<Message> messages = (row, index) -> new Message(row.getLong("id"), row.getString("author_name"), row.getObject("author_owner_id", UUID.class), row.getObject("author_team_id", UUID.class), row.getString("body"), row.getInt("version"), row.getObject("created_at", OffsetDateTime.class), row.getObject("edited_at", OffsetDateTime.class),row.getObject("reply_to_id",Long.class),row.getString("reply_author"),row.getString("reply_body"),row.getBoolean("pinned"));
    private static final String MESSAGE_SELECT = "SELECT m.*, COALESCE(a.display_name, 'James') AS author_name,CASE WHEN reply_target.id IS NULL THEN NULL ELSE COALESCE(reply_account.display_name,'James') END AS reply_author,SUBSTRING(reply_target.body,1,240) AS reply_body FROM team_message m LEFT JOIN team_account a ON a.id = m.author_team_id LEFT JOIN team_message reply_target ON reply_target.id=m.reply_to_id AND reply_target.channel_id=m.channel_id AND reply_target.deleted=FALSE LEFT JOIN team_account reply_account ON reply_account.id=reply_target.author_team_id ";
    public TeamChannelRepository(JdbcTemplate db) { this.db = db; }
    public void initialise(UUID workspace) {
        Boolean initialised = db.queryForObject("SELECT channels_initialised FROM team_workspace WHERE id = ? FOR UPDATE", Boolean.class, workspace);
        if (Boolean.TRUE.equals(initialised)) return;
        create(workspace, "general", "The team noticeboard and day-to-day conversation.", "Team", "TEAM");
        create(workspace, "support", "Discuss enquiries and customer updates.", "Operations", "SUPPORT");
        create(workspace, "upload-review", "Discuss files awaiting moderation.", "Operations", "MODERATION");
        db.update("UPDATE team_workspace SET channels_initialised = TRUE WHERE id = ?", workspace);
    }
    public List<Channel> channels(UUID workspace) { return db.query("SELECT * FROM team_channel WHERE workspace_id = ? AND archived = FALSE ORDER BY category, name", channels, workspace); }
    public List<Channel> archivedChannels(UUID workspace) { return db.query("SELECT * FROM team_channel WHERE workspace_id = ? AND archived = TRUE ORDER BY category, name", channels, workspace); }
    public Optional<Channel> channel(UUID workspace, UUID id, boolean lock) { return db.query("SELECT * FROM team_channel WHERE workspace_id = ? AND id = ?" + (lock ? " FOR UPDATE" : ""), channels, workspace, id).stream().findFirst(); }
    public Channel create(UUID workspace, String name, String description, String category, String audience) {
        return create(workspace,name,description,category,audience,null);
    }
    public Channel create(UUID workspace,String name,String description,String category,String audience,UUID groupId){UUID id=UUID.randomUUID();db.update("INSERT INTO team_channel(id,workspace_id,name,description,category,audience,group_id) VALUES (?,?,?,?,?,?,?)",id,workspace,name,description,category,audience,groupId);return channel(workspace,id,false).orElseThrow();}
    public int update(UUID workspace, UUID id, int version, String name, String description, String category, String audience, boolean archived) { return db.update("UPDATE team_channel SET name = ?, description = ?, category = ?, audience = ?, archived = ?, version = version + 1 WHERE workspace_id = ? AND id = ? AND version = ?", name, description, category, audience, archived, workspace, id, version); }
    public int update(UUID workspace,UUID id,int version,String name,String description,String category,String audience,boolean archived,UUID groupId){return db.update("UPDATE team_channel SET name=?,description=?,category=?,audience=?,archived=?,group_id=?,version=version+1 WHERE workspace_id=? AND id=? AND version=?",name,description,category,audience,archived,groupId,workspace,id,version);}
    public List<Message> latest(UUID channel, Long before) { var result = db.query(MESSAGE_SELECT + "WHERE m.channel_id = ? AND m.deleted = FALSE AND m.id < ? ORDER BY m.id DESC LIMIT 50", messages, channel, before == null ? Long.MAX_VALUE : before); java.util.Collections.reverse(result); return result; }
    public Message post(UUID channel, UUID owner, UUID member, String body) {
        return post(channel,owner,member,body,null,null,null);
    }
    public Message post(UUID channel,UUID owner,UUID member,String body,UUID key,String fingerprint,Long replyTo) {
        var holder = new org.springframework.jdbc.support.GeneratedKeyHolder();
        db.update(connection -> { var statement = connection.prepareStatement("INSERT INTO team_message (channel_id, author_owner_id, author_team_id, body,submission_key,submission_fingerprint,reply_to_id) VALUES (?, ?, ?, ?,?,?,?)", new String[]{"id"}); statement.setObject(1, channel); statement.setObject(2, owner); statement.setObject(3, member); statement.setString(4, body);statement.setObject(5,key);statement.setString(6,fingerprint);statement.setObject(7,replyTo); return statement; }, holder);
        bump(channel);
        return message(channel, holder.getKey().longValue(), false).orElseThrow();
    }
    public Optional<Submission> submission(UUID key){return db.query("SELECT id,channel_id,submission_fingerprint FROM team_message WHERE submission_key=?",(r,n)->new Submission(r.getLong("id"),r.getObject("channel_id",UUID.class),r.getString("submission_fingerprint")),key).stream().findFirst();}
    public Optional<Message> message(UUID channel, long id, boolean lock) { return db.query(MESSAGE_SELECT + "WHERE m.channel_id = ? AND m.id = ? AND m.deleted = FALSE" + (lock ? " FOR UPDATE OF m" : ""), messages, channel, id).stream().findFirst(); }
    public int edit(UUID channel, long id, int version, String body, boolean deleted) { int changed=db.update("UPDATE team_message SET body = ?, deleted = ?, edited_at = CURRENT_TIMESTAMP, version = version + 1 WHERE channel_id = ? AND id = ? AND version = ? AND deleted = FALSE", body, deleted, channel, id, version);if(changed==1)bump(channel);return changed; }
    public List<Message> pins(UUID channel){return db.query(MESSAGE_SELECT+"WHERE m.channel_id=? AND m.pinned=TRUE AND m.deleted=FALSE ORDER BY m.id DESC LIMIT 50",messages,channel);}
    public int pin(UUID channel,long id,int version,boolean pinned){int changed=db.update("UPDATE team_message SET pinned=?,version=version+1 WHERE channel_id=? AND id=? AND version=? AND deleted=FALSE",pinned,channel,id,version);if(changed==1)bump(channel);return changed;}
    public long conversationVersion(UUID channel){return db.queryForObject("SELECT conversation_version FROM team_channel WHERE id=?",Long.class,channel);}
    private void bump(UUID channel){db.update("UPDATE team_channel SET conversation_version=conversation_version+1 WHERE id=?",channel);}
    public List<Message> window(UUID channel,Long floor){var result=floor==null ? latest(channel,null) : db.query(MESSAGE_SELECT+"WHERE m.channel_id=? AND m.deleted=FALSE AND m.id>=? ORDER BY m.id DESC LIMIT 500",messages,channel,floor);if(floor!=null)java.util.Collections.reverse(result);return result;}
    public boolean hasEarlier(UUID channel,long first){return Boolean.TRUE.equals(db.queryForObject("SELECT EXISTS(SELECT 1 FROM team_message WHERE channel_id=? AND deleted=FALSE AND id<?)",Boolean.class,channel,first));}
    public boolean hasLater(UUID channel,long last){return Boolean.TRUE.equals(db.queryForObject("SELECT EXISTS(SELECT 1 FROM team_message WHERE channel_id=? AND deleted=FALSE AND id>?)",Boolean.class,channel,last));}
    public void audit(UUID workspace, UUID owner, UUID member, String event, UUID resource) { db.update("INSERT INTO team_audit(id, workspace_id, actor_owner_id, actor_team_id, event, resource_id) VALUES (?, ?, ?, ?, ?, ?)", UUID.randomUUID(), workspace, owner, member, event, resource); }
}
