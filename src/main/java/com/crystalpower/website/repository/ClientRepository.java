package com.crystalpower.website.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class ClientRepository {
    public record Account(UUID id, UUID workspaceId, String email, String displayName, String passwordHash, String state, int version) {}
    public record Preferences(UUID clientId, UUID workspaceId, String contactPreference, int version) {}
    public record Invitation(UUID accountId, OffsetDateTime expiresAt) {}
    public record Project(UUID id, String subject, String state, int progress, String nextStep, OffsetDateTime updatedAt) {}
    public record ProjectAnchor(UUID id,OffsetDateTime createdAt) {}
    public record Message(UUID id, String author, String body, String direction, OffsetDateTime createdAt) {}
    public record ReplySubmission(UUID id, UUID requestId, UUID accountId, String body) {}
    private final JdbcTemplate db;
    private final RowMapper<Account> accountRow = (r, n) -> new Account(r.getObject("id", UUID.class), r.getObject("workspace_id", UUID.class), r.getString("email"), r.getString("display_name"), r.getString("password_hash"), r.getString("state"), r.getInt("credentials_version"));
    private final RowMapper<Project> projectRow = (r,n) -> new Project(r.getObject("id", UUID.class), r.getString("subject"), r.getString("state"), r.getInt("progress"), r.getString("next_step"), r.getObject("updated_at", OffsetDateTime.class));
    private final RowMapper<Message> messageRow = (r,n) -> new Message(r.getObject("id", UUID.class), r.getString("author"), r.getString("body"), r.getString("direction"), r.getObject("created_at", OffsetDateTime.class));
    private static final String CONVERSATION="SELECT * FROM (SELECT m.id,'Crystal Powers' AS author,m.body,'TEAM' AS direction,m.created_at FROM support_message m WHERE m.request_id=? AND m.kind='CLIENT' AND m.portal_visible=TRUE UNION ALL SELECT cr.id,c.display_name AS author,cr.body,'CLIENT' AS direction,cr.created_at FROM client_reply cr JOIN client_account c ON c.id=cr.account_id WHERE cr.request_id=?) conversation ";
    public ClientRepository(JdbcTemplate db) { this.db = db; }
    public Optional<Account> account(UUID id, boolean lock) { return db.query("SELECT * FROM client_account WHERE id=?" + (lock ? " FOR UPDATE" : ""), accountRow, id).stream().findFirst(); }
    public Preferences preferences(UUID id) { return db.queryForObject("SELECT id,workspace_id,contact_preference,preferences_version FROM client_account WHERE id=?", (r,n) -> new Preferences(r.getObject("id",UUID.class),r.getObject("workspace_id",UUID.class),r.getString("contact_preference"),r.getInt("preferences_version")), id); }
    public boolean preferences(UUID id, int expectedVersion, String value) { return db.update("UPDATE client_account SET contact_preference=?,preferences_version=preferences_version+1 WHERE id=? AND preferences_version=?",value,id,expectedVersion)==1; }
    public Optional<Account> email(String email) { return db.query("SELECT * FROM client_account WHERE email=?", accountRow, email).stream().findFirst(); }
    public Account create(UUID workspace, String email, String name) { UUID id = UUID.randomUUID(); db.update("INSERT INTO client_account(id,workspace_id,email,display_name) VALUES (?,?,?,?)", id, workspace, email, name); return account(id, false).orElseThrow(); }
    public void bind(UUID account, UUID request) { db.update("INSERT INTO client_request(account_id,request_id) SELECT ?,? WHERE NOT EXISTS (SELECT 1 FROM client_request WHERE request_id=?)", account, request, request); }
    public Optional<Account> linked(UUID workspace, UUID request) { return db.query("SELECT c.* FROM client_account c JOIN client_request r ON r.account_id=c.id WHERE c.workspace_id=? AND r.request_id=?", accountRow, workspace, request).stream().findFirst(); }
    public void invite(UUID id, String hash, OffsetDateTime expires) { db.update("UPDATE client_invitation SET used_at=CURRENT_TIMESTAMP WHERE account_id=? AND used_at IS NULL", id); db.update("INSERT INTO client_invitation(token_hash,account_id,expires_at) VALUES (?,?,?)", hash, id, expires); }
    public Optional<Invitation> invitation(String hash) { return db.query("SELECT account_id,expires_at FROM client_invitation WHERE token_hash=? AND used_at IS NULL", (r,n) -> new Invitation(r.getObject("account_id", UUID.class), r.getObject("expires_at", OffsetDateTime.class)), hash).stream().findFirst(); }
    public void consume(String hash) { db.update("UPDATE client_invitation SET used_at=CURRENT_TIMESTAMP WHERE token_hash=? AND used_at IS NULL", hash); }
    public void password(UUID id, String password) { db.update("UPDATE client_account SET password_hash=?,state='ACTIVE',credentials_version=credentials_version+1 WHERE id=?", password, id); }
    public void reset(UUID id) { db.update("UPDATE client_account SET password_hash=NULL,state='INVITED',credentials_version=credentials_version+1 WHERE id=?", id); }
    public void suspend(UUID id) { db.update("UPDATE client_account SET state='SUSPENDED',credentials_version=credentials_version+1 WHERE id=?", id); db.update("UPDATE client_invitation SET used_at=CURRENT_TIMESTAMP WHERE account_id=? AND used_at IS NULL", id); }
    public List<Project> projects(UUID account, UUID workspace) { return db.query("SELECT r.* FROM support_request r JOIN client_request cr ON cr.request_id=r.id WHERE cr.account_id=? AND r.workspace_id=? ORDER BY r.updated_at DESC,r.id LIMIT 100", projectRow, account, workspace); }
    public Optional<ProjectAnchor> projectAnchor(UUID account,UUID workspace,UUID id) { return db.query("SELECT r.id,r.created_at FROM support_request r JOIN client_request cr ON cr.request_id=r.id WHERE cr.account_id=? AND r.workspace_id=? AND r.id=?",(row,index)->new ProjectAnchor(row.getObject("id",UUID.class),row.getObject("created_at",OffsetDateTime.class)),account,workspace,id).stream().findFirst(); }
    public List<Project> projectPage(UUID account,UUID workspace,ProjectAnchor before) {
        var args=new java.util.ArrayList<Object>();args.add(account);args.add(workspace);String where="";
        if(before!=null){where=" AND (r.created_at<? OR (r.created_at=? AND r.id<?))";args.add(before.createdAt());args.add(before.createdAt());args.add(before.id());}
        return db.query("SELECT r.* FROM support_request r JOIN client_request cr ON cr.request_id=r.id WHERE cr.account_id=? AND r.workspace_id=?"+where+" ORDER BY r.created_at DESC,r.id DESC LIMIT 51",projectRow,args.toArray());
    }
    public long projectTotal(UUID account,UUID workspace) { return db.queryForObject("SELECT COUNT(*) FROM support_request r JOIN client_request cr ON cr.request_id=r.id WHERE cr.account_id=? AND r.workspace_id=?",Long.class,account,workspace); }
    public Optional<Project> project(UUID account, UUID workspace, UUID request) { return db.query("SELECT r.* FROM support_request r JOIN client_request cr ON cr.request_id=r.id WHERE cr.account_id=? AND r.workspace_id=? AND r.id=? FOR UPDATE", projectRow, account, workspace, request).stream().findFirst(); }
    public List<Message> messages(UUID request) {
        return db.query("SELECT * FROM (SELECT m.id, 'Crystal Powers' AS author,m.body,'TEAM' AS direction,m.created_at FROM support_message m WHERE m.request_id=? AND m.kind='CLIENT' AND m.portal_visible=TRUE UNION ALL SELECT cr.id,c.display_name AS author,cr.body,'CLIENT' AS direction,cr.created_at FROM client_reply cr JOIN client_account c ON c.id=cr.account_id WHERE cr.request_id=?) conversation ORDER BY created_at DESC,id DESC LIMIT 100", messageRow, request, request);
    }
    public Optional<Message> messageCursor(UUID request,UUID id,String direction) { return db.query(CONVERSATION+"WHERE id=? AND direction=?",messageRow,request,request,id,direction).stream().findFirst(); }
    public List<Message> messagePage(UUID request,Message before) {
        var args=new java.util.ArrayList<Object>();args.add(request);args.add(request);String where="";
        if(before!=null){where="WHERE created_at<? OR (created_at=? AND id<?) OR (created_at=? AND id=? AND direction<?) ";args.add(before.createdAt());args.add(before.createdAt());args.add(before.id());args.add(before.createdAt());args.add(before.id());args.add(before.direction());}
        return db.query(CONVERSATION+where+"ORDER BY created_at DESC,id DESC,direction DESC LIMIT 51",messageRow,args.toArray());
    }
    private final RowMapper<SupportRepository.Event> eventRow=(r,n)->new SupportRepository.Event(r.getObject("id",UUID.class),r.getString("event"),r.getString("detail"),true,r.getObject("created_at",OffsetDateTime.class));
    public Optional<SupportRepository.Event> eventCursor(UUID request,UUID id) { return db.query("SELECT * FROM support_event WHERE request_id=? AND customer_visible=TRUE AND id=?",eventRow,request,id).stream().findFirst(); }
    public List<SupportRepository.Event> historyPage(UUID request,SupportRepository.Event before) {
        var args=new java.util.ArrayList<Object>();args.add(request);String where="";
        if(before!=null){where=" AND (created_at<? OR (created_at=? AND id<?))";args.add(before.createdAt());args.add(before.createdAt());args.add(before.id());}
        return db.query("SELECT * FROM support_event WHERE request_id=? AND customer_visible=TRUE"+where+" ORDER BY created_at DESC,id DESC LIMIT 51",eventRow,args.toArray());
    }
    public List<Message> replies(UUID request) { return db.query("SELECT r.id,c.display_name AS author,r.body,'CLIENT' AS direction,r.created_at FROM client_reply r JOIN client_account c ON c.id=r.account_id WHERE r.request_id=? ORDER BY r.created_at DESC,r.id DESC LIMIT 100", messageRow, request); }
    private static final String REPLIES="SELECT r.id,c.display_name AS author,r.body,'CLIENT' AS direction,r.created_at FROM client_reply r JOIN client_account c ON c.id=r.account_id WHERE r.request_id=? ";
    public Optional<Message> replyCursor(UUID request,UUID id) { return db.query(REPLIES+"AND r.id=?",messageRow,request,id).stream().findFirst(); }
    public List<Message> replyPage(UUID request,Message before) {
        var args=new java.util.ArrayList<Object>();args.add(request);String where="";
        if(before!=null){where="AND (r.created_at<? OR (r.created_at=? AND r.id<?)) ";args.add(before.createdAt());args.add(before.createdAt());args.add(before.id());}
        return db.query(REPLIES+where+"ORDER BY r.created_at DESC,r.id DESC LIMIT 51",messageRow,args.toArray());
    }
    public Optional<ReplySubmission> replySubmission(UUID key) { return db.query("SELECT id,request_id,account_id,body FROM client_reply WHERE submission_key=?", (r,n) -> new ReplySubmission(r.getObject("id", UUID.class),r.getObject("request_id",UUID.class),r.getObject("account_id",UUID.class),r.getString("body")), key).stream().findFirst(); }
    public UUID reply(UUID request, UUID account, UUID key, String body) { UUID id = UUID.randomUUID(); db.update("INSERT INTO client_reply(id,request_id,account_id,submission_key,body) VALUES (?,?,?,?,?)", id, request, account, key, body); db.update("UPDATE support_request SET updated_at=CURRENT_TIMESTAMP WHERE id=?", request); return id; }
    public boolean share(UUID request, UUID message) { return db.update("UPDATE support_message SET portal_visible=TRUE WHERE request_id=? AND id=? AND kind='CLIENT'", request, message) == 1; }
    public List<SupportRepository.Event> history(UUID request) { return db.query("SELECT id,event,detail,created_at FROM support_event WHERE request_id=? AND customer_visible=TRUE ORDER BY created_at DESC,id DESC LIMIT 100", (r,n) -> new SupportRepository.Event(r.getObject("id", UUID.class),r.getString("event"),r.getString("detail"),true,r.getObject("created_at",OffsetDateTime.class)), request); }
    public Optional<UUID> fileRequest(UUID account,UUID workspace,UUID file) { return db.query("SELECT r.id FROM support_request r JOIN client_request cr ON cr.request_id=r.id JOIN support_attachment a ON a.request_id=r.id WHERE cr.account_id=? AND r.workspace_id=? AND a.id=? AND a.review_state='APPROVED'", (r,n) -> r.getObject("id",UUID.class),account,workspace,file).stream().findFirst(); }
}
