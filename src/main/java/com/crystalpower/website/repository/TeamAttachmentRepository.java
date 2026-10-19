package com.crystalpower.website.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class TeamAttachmentRepository {
    public record File(UUID id,UUID channelId,long messageId,UUID authorOwnerId,UUID authorTeamId,String filename,String contentType,long sizeBytes,String reviewState,String reviewNote,String scanState,OffsetDateTime scannedAt,OffsetDateTime removedAt,int version) {}
    public record QueueFile(File attachment,String channelName,boolean channelArchived,boolean groupArchived,boolean messageRemoved,OffsetDateTime createdAt) {}
    public record Submission(UUID id,String fingerprint) {}
    private static final String METADATA="id,channel_id,message_id,author_owner_id,author_team_id,filename,content_type,size_bytes,review_state,review_note,scan_state,scanned_at,removed_at,version";
    private final JdbcTemplate db;
    private final RowMapper<File> row=(r,n)->new File(r.getObject("id",UUID.class),r.getObject("channel_id",UUID.class),r.getLong("message_id"),r.getObject("author_owner_id",UUID.class),r.getObject("author_team_id",UUID.class),r.getString("filename"),r.getString("content_type"),r.getLong("size_bytes"),r.getString("review_state"),r.getString("review_note"),r.getString("scan_state"),r.getObject("scanned_at",OffsetDateTime.class),r.getObject("removed_at",OffsetDateTime.class),r.getInt("version"));
    public TeamAttachmentRepository(JdbcTemplate db){this.db=db;}
    public List<File> list(UUID channel,long message){return db.query("SELECT "+METADATA+" FROM team_message_attachment WHERE channel_id=? AND message_id=? ORDER BY created_at,id LIMIT 50",row,channel,message);}
    public Optional<File> file(UUID channel,long message,UUID id){return db.query("SELECT "+METADATA+" FROM team_message_attachment WHERE channel_id=? AND message_id=? AND id=? FOR UPDATE",row,channel,message,id).stream().findFirst();}
    public Optional<Submission> submission(UUID key){return db.query("SELECT id,fingerprint FROM team_message_attachment WHERE submission_key=?",(r,n)->new Submission(r.getObject("id",UUID.class),r.getString("fingerprint")),key).stream().findFirst();}
    private String queueWhere(List<UUID> visible,String state,boolean inactive,List<Object> args){
        args.addAll(visible);String where=" WHERE a.channel_id IN ("+String.join(",",java.util.Collections.nCopies(visible.size(),"?"))+")";
        if(state.equals("REMOVED"))where+=" AND a.removed_at IS NOT NULL";else{where+=" AND a.removed_at IS NULL AND a.review_state=?";args.add(state);}
        if(inactive)where+=" AND (c.archived=TRUE OR m.deleted=TRUE OR EXISTS (SELECT 1 FROM team_group g WHERE g.id=c.group_id AND g.workspace_id=c.workspace_id AND g.archived=TRUE))";
        return where;
    }
    private String queueSelect(){return "SELECT "+java.util.Arrays.stream(METADATA.split(",")).map(name->"a."+name).collect(java.util.stream.Collectors.joining(","))+",c.name AS channel_name,c.archived AS channel_archived,EXISTS (SELECT 1 FROM team_group g WHERE g.id=c.group_id AND g.workspace_id=c.workspace_id AND g.archived=TRUE) AS group_archived,m.deleted AS message_removed,a.created_at FROM team_message_attachment a JOIN team_channel c ON c.id=a.channel_id JOIN team_message m ON m.channel_id=a.channel_id AND m.id=a.message_id";}
    private final RowMapper<QueueFile> queueRow=(r,n)->new QueueFile(row.mapRow(r,n),r.getString("channel_name"),r.getBoolean("channel_archived"),r.getBoolean("group_archived"),r.getBoolean("message_removed"),r.getObject("created_at",OffsetDateTime.class));
    public Optional<QueueFile> queueAnchor(List<UUID> visible,String state,boolean inactive,UUID id){if(visible.isEmpty())return Optional.empty();var args=new java.util.ArrayList<Object>();String where=queueWhere(visible,state,inactive,args)+" AND a.id=?";args.add(id);return db.query(queueSelect()+where,queueRow,args.toArray()).stream().findFirst();}
    public List<QueueFile> queue(List<UUID> visible,String state,boolean inactive,QueueFile after){if(visible.isEmpty())return List.of();var args=new java.util.ArrayList<Object>();String where=queueWhere(visible,state,inactive,args);if(after!=null){where+=" AND (a.created_at>? OR (a.created_at=? AND a.id>?))";args.add(after.createdAt());args.add(after.createdAt());args.add(after.attachment().id());}return db.query(queueSelect()+where+" ORDER BY a.created_at,a.id LIMIT 51",queueRow,args.toArray());}
    public boolean rename(UUID id,int version,String name){return db.update("UPDATE team_message_attachment SET filename=?,version=version+1 WHERE id=? AND version=? AND removed_at IS NULL AND scan_state<>'SCANNING'",name,id,version)==1;}
    public byte[] content(UUID id){return db.queryForObject("SELECT content FROM team_message_attachment WHERE id=?",byte[].class,id);}
    public long workspaceBytes(UUID workspace){return db.queryForObject("SELECT COALESCE(SUM(a.size_bytes),0) FROM team_message_attachment a JOIN team_channel c ON c.id=a.channel_id WHERE c.workspace_id=? AND a.removed_at IS NULL",Long.class,workspace);}
    public UUID create(UUID channel,long message,UUID owner,UUID member,UUID key,String fingerprint,String filename,String type,byte[] bytes){UUID id=UUID.randomUUID();db.update("INSERT INTO team_message_attachment(id,channel_id,message_id,author_owner_id,author_team_id,submission_key,fingerprint,filename,content_type,size_bytes,content) VALUES (?,?,?,?,?,?,?,?,?,?,?)",id,channel,message,owner,member,key,fingerprint,filename,type,bytes.length,bytes);return id;}
    public boolean review(UUID id,int version,String state,String note){return db.update("UPDATE team_message_attachment SET review_state=?,review_note=?,version=version+1 WHERE id=? AND version=? AND removed_at IS NULL",state,note,id,version)==1;}
    public boolean remove(UUID id,int version){return db.update("UPDATE team_message_attachment SET content=NULL,removed_at=CURRENT_TIMESTAMP,scan_token=NULL,scan_started_at=NULL,version=version+1 WHERE id=? AND version=? AND removed_at IS NULL",id,version)==1;}
    public boolean scanBegin(UUID id,int version,UUID token,OffsetDateTime expired){return db.update("UPDATE team_message_attachment SET scan_state='SCANNING',scan_token=?,scan_started_at=CURRENT_TIMESTAMP,scanned_at=NULL,review_state='PENDING',version=version+1 WHERE id=? AND version=? AND removed_at IS NULL AND (scan_state IN ('UNSCANNED','ERROR') OR (scan_state='SCANNING' AND scan_started_at<?))",token,id,version,expired)==1;}
    public boolean scanFinish(UUID id,int version,UUID token,String state){return db.update("UPDATE team_message_attachment SET scan_state=?,scanned_at=CURRENT_TIMESTAMP,scan_started_at=NULL,scan_token=NULL,review_state=?,version=version+1 WHERE id=? AND version=? AND removed_at IS NULL AND scan_state='SCANNING' AND scan_token=? AND scan_started_at>=?",state,state.equals("INFECTED") ? "REJECTED" : "PENDING",id,version,token,OffsetDateTime.now(java.time.ZoneOffset.UTC).minusMinutes(5))==1;}
}
