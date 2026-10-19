package com.crystalpower.website.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class SupportRepository {
    public record Request(UUID id, UUID workspaceId, UUID submissionKey, String fingerprint, String clientName, String clientEmail, String intent, String subject, String sourceLabel, String payload, String state, int progress, String nextStep, UUID assignedMemberId, String notificationState, int version, OffsetDateTime createdAt, OffsetDateTime updatedAt) {}
    public record Message(UUID id, UUID requestId, UUID submissionKey, UUID authorOwnerId, UUID authorTeamId, String author, String kind, String body, String deliveryState, OffsetDateTime createdAt, boolean portalVisible, OffsetDateTime deliveryStartedAt) {}
    public record Event(UUID id, String event, String detail, boolean customerVisible, OffsetDateTime createdAt) {}
    public record Attachment(UUID id, String filename, String contentType, long sizeBytes, String reviewState, String reviewNote, int version, String scanState, OffsetDateTime scannedAt, OffsetDateTime removedAt) {}
    public record FileContent(Attachment attachment, byte[] content) {}
    public record ModerationFile(UUID requestId, Attachment attachment, OffsetDateTime createdAt) {}
    private final JdbcTemplate db;
    private final RowMapper<Request> requests = (r, i) -> new Request(r.getObject("id", UUID.class), r.getObject("workspace_id", UUID.class), r.getObject("submission_key", UUID.class), r.getString("fingerprint"), r.getString("client_name"), r.getString("client_email"), r.getString("intent"), r.getString("subject"), r.getString("source_label"), r.getString("payload"), r.getString("state"), r.getInt("progress"), r.getString("next_step"), r.getObject("assigned_member_id", UUID.class), r.getString("notification_state"), r.getInt("version"), r.getObject("created_at", OffsetDateTime.class), r.getObject("updated_at", OffsetDateTime.class));
    private final RowMapper<Message> messages = (r, i) -> new Message(r.getObject("id", UUID.class), r.getObject("request_id", UUID.class), r.getObject("submission_key", UUID.class), r.getObject("author_owner_id", UUID.class), r.getObject("author_team_id", UUID.class), r.getString("author_name"), r.getString("kind"), r.getString("body"), r.getString("delivery_state"), r.getObject("created_at", OffsetDateTime.class), r.getBoolean("portal_visible"),r.getObject("delivery_started_at",OffsetDateTime.class));
    private final RowMapper<Attachment> attachments = (r, i) -> new Attachment(r.getObject("id", UUID.class), r.getString("filename"), r.getString("content_type"), r.getLong("size_bytes"), r.getString("review_state"), r.getString("review_note"), r.getInt("version"), r.getString("scan_state"), r.getObject("scanned_at", OffsetDateTime.class), r.getObject("removed_at", OffsetDateTime.class));
    private static final String MESSAGE_SELECT = "SELECT m.*, COALESCE(a.display_name, 'James') AS author_name FROM support_message m LEFT JOIN team_account a ON a.id = m.author_team_id ";
    public SupportRepository(JdbcTemplate db) { this.db = db; }
    public Optional<UUID> publicWorkspace() { return db.query("SELECT id FROM team_workspace ORDER BY created_at LIMIT 1", (r, i) -> r.getObject("id", UUID.class)).stream().findFirst(); }
    public void claimUnassigned(UUID workspace) { db.update("UPDATE support_request SET workspace_id = ? WHERE workspace_id IS NULL", workspace); }
    public Optional<Request> submission(UUID key) { return db.query("SELECT * FROM support_request WHERE submission_key = ?", requests, key).stream().findFirst(); }
    public Request create(UUID key, String fingerprint, UUID workspace, String name, String email, String intent, String subject, String source, String payload) {
        UUID id = UUID.randomUUID();
        db.update("INSERT INTO support_request(id, submission_key, fingerprint, workspace_id, client_name, client_email, intent, subject, source_label, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", id, key, fingerprint, workspace, name, email, intent, subject, source, payload);
        return submission(key).orElseThrow();
    }
    public void attach(UUID request, String filename, String type, byte[] content) { db.update("INSERT INTO support_attachment(id, request_id, filename, content_type, size_bytes, content) VALUES (?, ?, ?, ?, ?, ?)", UUID.randomUUID(), request, filename, type, content.length, content); }
    public boolean claimNotification(UUID id,UUID token,OffsetDateTime staleBefore) { return db.update("UPDATE support_request SET notification_state='SENDING',notification_started_at=CURRENT_TIMESTAMP,notification_attempt_token=? WHERE id=? AND (notification_state IN ('PENDING','FAILED') OR (notification_state='SENDING' AND notification_started_at<?))",token,id,staleBefore)==1; }
    public boolean finishNotification(UUID id,UUID token,String state,OffsetDateTime earliest) { return db.update("UPDATE support_request SET notification_state=?,notification_attempt_token=NULL WHERE id=? AND notification_state='SENDING' AND notification_attempt_token=? AND notification_started_at>=?",state,id,token,earliest)==1; }
    public Optional<Request> request(UUID workspace, UUID id, boolean lock) { return db.query("SELECT * FROM support_request WHERE workspace_id = ? AND id = ?" + (lock ? " FOR UPDATE" : ""), requests, workspace, id).stream().findFirst(); }
    public List<Request> list(UUID workspace, String state, Request before) {
        return requestRows(workspace,state,before,50);
    }
    public List<Request> requestPage(UUID workspace,String state,Request before) { return requestRows(workspace,state,before,51); }
    private List<Request> requestRows(UUID workspace,String state,Request before,int limit) {
        String filter = state == null ? "" : " AND state = ?";
        String cursor = before == null ? "" : " AND (created_at < ? OR (created_at = ? AND id < ?))";
        var args = new java.util.ArrayList<Object>(); args.add(workspace); if (state != null) args.add(state); if (before != null) { args.add(before.createdAt()); args.add(before.createdAt()); args.add(before.id()); }
        args.add(limit);return db.query("SELECT * FROM support_request WHERE workspace_id = ?" + filter + cursor + " ORDER BY created_at DESC, id DESC LIMIT ?", requests, args.toArray());
    }
    public int update(UUID workspace, UUID id, int version, String state, int progress, String nextStep, UUID assigned) { return db.update("UPDATE support_request SET state = ?, progress = ?, next_step = ?, assigned_member_id = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ? AND id = ? AND version = ?", state, progress, nextStep, assigned, workspace, id, version); }
    public List<Message> messages(UUID request) { return db.query(MESSAGE_SELECT + "WHERE m.request_id = ? ORDER BY m.created_at DESC, m.id DESC LIMIT 100", messages, request); }
    public Optional<Message> message(UUID request, UUID id) { return db.query(MESSAGE_SELECT + "WHERE m.request_id = ? AND m.id = ?", messages, request, id).stream().findFirst(); }
    public List<Message> messagePage(UUID request,Message before) {
        var args=new java.util.ArrayList<Object>();args.add(request);String where="";
        if(before!=null){where=" AND (m.created_at<? OR (m.created_at=? AND m.id<?))";args.add(before.createdAt());args.add(before.createdAt());args.add(before.id());}
        return db.query(MESSAGE_SELECT+"WHERE m.request_id=?"+where+" ORDER BY m.created_at DESC,m.id DESC LIMIT 51",messages,args.toArray());
    }
    public Optional<Message> messageSubmission(UUID key) { return db.query(MESSAGE_SELECT + "WHERE m.submission_key = ?", messages, key).stream().findFirst(); }
    public Message addMessage(UUID request, UUID key, UUID owner, UUID member, String kind, String body) { UUID id = UUID.randomUUID(); db.update("INSERT INTO support_message(id, request_id, submission_key, author_owner_id, author_team_id, kind, body) VALUES (?, ?, ?, ?, ?, ?, ?)", id, request, key, owner, member, kind, body); db.update("UPDATE support_request SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", request); return message(request, id).orElseThrow(); }
    public boolean claimDelivery(UUID request, UUID id, UUID token, OffsetDateTime staleBefore) { return db.update("UPDATE support_message SET delivery_state='SENDING',delivery_started_at=CURRENT_TIMESTAMP,delivery_attempt_token=? WHERE request_id=? AND id=? AND kind='CLIENT' AND (delivery_state IN ('SAVED','FAILED') OR (delivery_state='SENDING' AND delivery_started_at<?))",token,request,id,staleBefore)==1; }
    public boolean finishDelivery(UUID request,UUID id,UUID token,String state,OffsetDateTime earliest) { return db.update("UPDATE support_message SET delivery_state=?,delivery_attempt_token=NULL WHERE request_id=? AND id=? AND delivery_state='SENDING' AND delivery_attempt_token=? AND delivery_started_at>=?",state,request,id,token,earliest)==1; }
    public void event(UUID request, UUID owner, UUID member, String event, String detail, boolean visible) { db.update("INSERT INTO support_event(id, request_id, actor_owner_id, actor_team_id, event, detail, customer_visible) VALUES (?, ?, ?, ?, ?, ?, ?)", UUID.randomUUID(), request, owner, member, event, detail, visible); }
    public List<Event> events(UUID request) { return db.query("SELECT * FROM support_event WHERE request_id = ? ORDER BY created_at DESC, id DESC LIMIT 100", (r, i) -> new Event(r.getObject("id", UUID.class), r.getString("event"), r.getString("detail"), r.getBoolean("customer_visible"), r.getObject("created_at", OffsetDateTime.class)), request); }
    private final RowMapper<Event> eventRows=(r,i)->new Event(r.getObject("id",UUID.class),r.getString("event"),r.getString("detail"),r.getBoolean("customer_visible"),r.getObject("created_at",OffsetDateTime.class));
    public Optional<Event> event(UUID request,UUID id) { return db.query("SELECT * FROM support_event WHERE request_id=? AND id=?",eventRows,request,id).stream().findFirst(); }
    public List<Event> eventPage(UUID request,Event before) {
        var args=new java.util.ArrayList<Object>();args.add(request);String where="";
        if(before!=null){where=" AND (created_at<? OR (created_at=? AND id<?))";args.add(before.createdAt());args.add(before.createdAt());args.add(before.id());}
        return db.query("SELECT * FROM support_event WHERE request_id=?"+where+" ORDER BY created_at DESC,id DESC LIMIT 51",eventRows,args.toArray());
    }
    public List<Attachment> attachments(UUID request) { return db.query("SELECT id, filename, content_type, size_bytes, review_state, review_note, version, scan_state, scanned_at, removed_at FROM support_attachment WHERE request_id = ? ORDER BY created_at, id", attachments, request); }
    public Optional<FileContent> file(UUID workspace, UUID id) { return db.query("SELECT a.* FROM support_attachment a JOIN support_request r ON r.id = a.request_id WHERE r.workspace_id = ? AND a.id = ? AND a.removed_at IS NULL", (r, i) -> new FileContent(attachments.mapRow(r, i), r.getBytes("content")), workspace, id).stream().findFirst(); }
    public List<ModerationFile> moderationFiles(UUID workspace, String state) { return db.query("SELECT a.id, a.request_id, a.filename, a.content_type, a.size_bytes, a.review_state, a.review_note, a.version, a.scan_state, a.scanned_at, a.removed_at, a.created_at FROM support_attachment a JOIN support_request r ON r.id = a.request_id WHERE r.workspace_id = ? AND a.review_state = ? AND a.removed_at IS NULL ORDER BY a.created_at, a.id LIMIT 100", (r, i) -> new ModerationFile(r.getObject("request_id", UUID.class), attachments.mapRow(r, i), r.getObject("created_at", OffsetDateTime.class)), workspace, state); }
    public Optional<ModerationFile> moderationFile(UUID workspace, UUID id) { return db.query("SELECT a.id, a.request_id, a.filename, a.content_type, a.size_bytes, a.review_state, a.review_note, a.version, a.scan_state, a.scanned_at, a.removed_at, a.created_at FROM support_attachment a JOIN support_request r ON r.id = a.request_id WHERE r.workspace_id = ? AND a.id = ?", (r, i) -> new ModerationFile(r.getObject("request_id", UUID.class), attachments.mapRow(r, i), r.getObject("created_at", OffsetDateTime.class)), workspace, id).stream().findFirst(); }
    public int review(UUID workspace, UUID id, int version, String state, String note) { return db.update("UPDATE support_attachment SET review_state = ?, review_note = ?, version = version + 1 WHERE id = ? AND version = ? AND removed_at IS NULL AND EXISTS (SELECT 1 FROM support_request r WHERE r.id = support_attachment.request_id AND r.workspace_id = ?)", state, note, id, version, workspace); }
    public List<ModerationFile> moderationPage(UUID workspace,String state,ModerationFile after) {
        String condition=state.equals("REMOVED") ? "a.removed_at IS NOT NULL" : "a.removed_at IS NULL AND a.review_state=?";
        var args=new java.util.ArrayList<Object>();args.add(workspace);if(!state.equals("REMOVED"))args.add(state);
        if(after!=null){condition+=" AND (a.created_at>? OR (a.created_at=? AND a.id>?))";args.add(after.createdAt());args.add(after.createdAt());args.add(after.attachment().id());}
        return db.query("SELECT a.id,a.request_id,a.filename,a.content_type,a.size_bytes,a.review_state,a.review_note,a.version,a.scan_state,a.scanned_at,a.removed_at,a.created_at FROM support_attachment a JOIN support_request r ON r.id=a.request_id WHERE r.workspace_id=? AND "+condition+" ORDER BY a.created_at,a.id LIMIT 51",(r,i)->new ModerationFile(r.getObject("request_id",UUID.class),attachments.mapRow(r,i),r.getObject("created_at",OffsetDateTime.class)),args.toArray());
    }
    public java.util.Map<String,Long> moderationTotals(UUID workspace) {
        var result=new java.util.HashMap<String,Long>();for(String state:List.of("PENDING","APPROVED","REJECTED","REMOVED"))result.put(state,0L);
        db.query("SELECT CASE WHEN a.removed_at IS NOT NULL THEN 'REMOVED' ELSE a.review_state END AS state,COUNT(*) AS total FROM support_attachment a JOIN support_request r ON r.id=a.request_id WHERE r.workspace_id=? GROUP BY CASE WHEN a.removed_at IS NOT NULL THEN 'REMOVED' ELSE a.review_state END",(org.springframework.jdbc.core.RowCallbackHandler)row->result.put(row.getString("state"),row.getLong("total")),workspace);return java.util.Map.copyOf(result);
    }
    public int remove(UUID workspace,UUID id,int version) { return db.update("UPDATE support_attachment SET content=?,removed_at=CURRENT_TIMESTAMP,review_state='REJECTED',scan_token=NULL,scan_started_at=NULL,version=version+1 WHERE id=? AND version=? AND removed_at IS NULL AND EXISTS(SELECT 1 FROM support_request r WHERE r.id=support_attachment.request_id AND r.workspace_id=?)",new byte[0],id,version,workspace); }
}
