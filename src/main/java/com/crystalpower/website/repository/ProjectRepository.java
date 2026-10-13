package com.crystalpower.website.repository;

import com.crystalpower.website.dto.ProjectContent;
import com.crystalpower.website.dto.ProjectView;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class ProjectRepository {
    public record Editor(UUID ownerId,UUID memberId,UUID workspaceId) {
        public Editor { if((ownerId==null)==(memberId==null) || (memberId!=null && workspaceId==null))throw new IllegalArgumentException("A real project editor identity is required."); }
        public static Editor owner(UUID owner) { return new Editor(owner,null,null); }
    }
    public record PresentationState(boolean featured, int sortOrder, boolean archived, java.time.Instant updatedAt) {}
    public record Revision(int version, java.time.Instant createdAt, String title) {}
    // A snapshot must change even when two updates share the database clock tick.
    private static final String UPDATED = "updated_at = CASE WHEN CURRENT_TIMESTAMP > updated_at THEN CURRENT_TIMESTAMP ELSE updated_at + INTERVAL '0.000001' SECOND END";
    private static final String PUBLISHED = "SELECT p.*, r.version AS content_version, r.payload FROM project p JOIN project_revision r ON r.project_id = p.id AND r.version = p.published_version WHERE p.archived = FALSE";
    private static final String DRAFT = "SELECT p.*, r.version AS content_version, r.payload FROM project p JOIN project_revision r ON r.project_id = p.id AND r.version = p.draft_version";
    private final JdbcTemplate database;
    private final ObjectMapper json;
    public ProjectRepository(JdbcTemplate database, ObjectMapper json) { this.database = database; this.json = json; }

    public List<ProjectView> published() { return database.query(PUBLISHED + " ORDER BY p.sort_order, p.created_at DESC", mapper()); }
    public Optional<ProjectView> published(String slug) { return database.query(PUBLISHED + " AND p.slug = ?", mapper(), slug).stream().findFirst(); }
    public List<ProjectView> drafts() { return database.query(DRAFT + " ORDER BY p.archived, p.sort_order, p.created_at DESC", mapper()); }
    public Optional<ProjectView> draft(UUID id) { return database.query(DRAFT + " WHERE p.id = ?", mapper(), id).stream().findFirst(); }
    public List<ProjectView> workspaceDrafts(UUID workspace) { return database.query(DRAFT+" WHERE p.workspace_id=? ORDER BY p.archived,p.sort_order,p.created_at DESC",mapper(),workspace); }
    public record Creation(UUID id,UUID workspaceId,UUID ownerId,UUID memberId,String fingerprint) {}
    public Optional<Creation> creation(UUID key) { return database.query("SELECT id,workspace_id,creation_actor_owner,creation_actor_team,creation_fingerprint FROM project WHERE creation_key=?",(row,index)->new Creation(row.getObject("id",UUID.class),row.getObject("workspace_id",UUID.class),row.getObject("creation_actor_owner",UUID.class),row.getObject("creation_actor_team",UUID.class),row.getString("creation_fingerprint")),key).stream().findFirst(); }
    public void creation(UUID id,UUID key,Editor actor,String fingerprint) { database.update("UPDATE project SET creation_key=?,creation_actor_owner=?,creation_actor_team=?,creation_fingerprint=? WHERE id=? AND creation_key IS NULL",key,actor.ownerId(),actor.memberId(),fingerprint,id); }
    public record ProjectAnchor(UUID id,java.time.Instant createdAt) {}
    public Optional<ProjectAnchor> workspaceAnchor(UUID workspace,UUID id) { return database.query("SELECT id,created_at FROM project WHERE workspace_id=? AND id=?",(row,index)->new ProjectAnchor(row.getObject("id",UUID.class),row.getTimestamp("created_at").toInstant()),workspace,id).stream().findFirst(); }
    public List<ProjectView> workspacePage(UUID workspace,ProjectAnchor after) {
        var args=new java.util.ArrayList<Object>();args.add(workspace);String cursor="";
        if(after!=null){cursor=" AND (p.created_at<? OR (p.created_at=? AND p.id<?))";args.add(java.time.OffsetDateTime.ofInstant(after.createdAt(),java.time.ZoneOffset.UTC));args.add(java.time.OffsetDateTime.ofInstant(after.createdAt(),java.time.ZoneOffset.UTC));args.add(after.id());}
        return database.query(DRAFT+" WHERE p.workspace_id=?"+cursor+" ORDER BY p.created_at DESC,p.id DESC LIMIT 51",mapper(),args.toArray());
    }
    public long workspaceTotal(UUID workspace) { return database.queryForObject("SELECT COUNT(*) FROM project WHERE workspace_id=?",Long.class,workspace); }
    public Optional<ProjectView> workspaceDraft(UUID workspace,UUID id) { return database.query(DRAFT+" WHERE p.workspace_id=? AND p.id=?",mapper(),workspace,id).stream().findFirst(); }
    public record TeamScope(UUID workspaceId,java.time.Instant updatedAt) {}
    public Optional<TeamScope> lockTeamScope(UUID id) { return database.query("SELECT workspace_id,updated_at FROM project WHERE id=? FOR UPDATE",(row,index)->new TeamScope(row.getObject("workspace_id",UUID.class),row.getTimestamp("updated_at").toInstant()),id).stream().findFirst(); }
    public void teamScope(UUID id,UUID workspace) { database.update("UPDATE project SET workspace_id=?, "+UPDATED+" WHERE id=?",workspace,id); }
    public boolean slugExists(String slug) { return Boolean.TRUE.equals(database.queryForObject("SELECT COUNT(*) > 0 FROM project WHERE slug = ?", Boolean.class, slug)); }
    public List<Revision> revisions(UUID id) {
        return database.query("SELECT version, created_at, payload FROM project_revision WHERE project_id = ? ORDER BY version DESC", (row, index) ->
                new Revision(row.getInt("version"), row.getTimestamp("created_at").toInstant(), decode(row.getString("payload")).title()), id);
    }
    public List<Revision> revisionPage(UUID id,Integer before) { return database.query("SELECT version,created_at,payload FROM project_revision WHERE project_id=? AND version<? ORDER BY version DESC LIMIT 51",(row,index)->new Revision(row.getInt("version"),row.getTimestamp("created_at").toInstant(),decode(row.getString("payload")).title()),id,before==null ? Long.MAX_VALUE : before.longValue()); }
    public boolean hasRevision(UUID id,int version) { return Boolean.TRUE.equals(database.queryForObject("SELECT COUNT(*)>0 FROM project_revision WHERE project_id=? AND version=?",Boolean.class,id,version)); }
    public long revisionTotal(UUID id) { return database.queryForObject("SELECT COUNT(*) FROM project_revision WHERE project_id=?",Long.class,id); }
    public Optional<ProjectContent> revision(UUID id, int version) {
        return database.query("SELECT payload FROM project_revision WHERE project_id = ? AND version = ?", (row, index) -> decode(row.getString("payload")), id, version).stream().findFirst();
    }
    private ProjectContent decode(String payload) {
        try { return json.readValue(payload, ProjectContent.class); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Stored project could not be read", exception); }
    }
    public void create(UUID id, String slug) { database.update("INSERT INTO project (id, slug) VALUES (?, ?)", id, slug); }
    public boolean advanceDraft(UUID id, int version) { return database.update("UPDATE project SET draft_version = draft_version + 1, " + UPDATED + " WHERE id = ? AND draft_version = ?", id, version) == 1; }
    public boolean publish(UUID id, int version) { return database.update("UPDATE project SET published_version = draft_version, archived = FALSE, " + UPDATED + " WHERE id = ? AND draft_version = ?", id, version) == 1; }
    public boolean unpublish(UUID id) { return database.update("UPDATE project SET published_version = NULL, " + UPDATED + " WHERE id = ?", id) == 1; }
    public boolean presentation(UUID id, boolean featured, int order, boolean archived) { return database.update("UPDATE project SET featured = ?, sort_order = ?, archived = ?, " + UPDATED + " WHERE id = ?", featured, order, archived, id) == 1; }
    public Optional<PresentationState> lockPresentation(UUID id) {
        return database.query("SELECT featured, sort_order, archived, updated_at FROM project WHERE id = ? FOR UPDATE", (row, index) -> new PresentationState(row.getBoolean("featured"), row.getInt("sort_order"), row.getBoolean("archived"), row.getTimestamp("updated_at").toInstant()), id).stream().findFirst();
    }
    public boolean ownsMedia(UUID project, UUID media) { return Integer.valueOf(1).equals(database.queryForObject("SELECT COUNT(*) FROM project_media WHERE id = ? AND project_id = ?", Integer.class, media, project)); }
    public void insertRevision(UUID id, int version, ProjectContent content) {
        try { database.update("INSERT INTO project_revision (id, project_id, version, payload) VALUES (?, ?, ?, ?)", UUID.randomUUID(), id, version, json.writeValueAsString(content)); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Project could not be serialised", exception); }
    }
    public void audit(UUID owner, String event, UUID project) { database.update("INSERT INTO admin_audit (id, account_id, event, resource_id) VALUES (?, ?, ?, ?)", UUID.randomUUID(), owner, event, project.toString()); }
    public void audit(Editor actor,String event,UUID project) {
        if(actor.memberId()==null){audit(actor.ownerId(),event,project);return;}
        database.update("INSERT INTO team_audit(id,workspace_id,actor_team_id,event,resource_id) VALUES(?,?,?,?,?)",UUID.randomUUID(),actor.workspaceId(),actor.memberId(),event,project);
    }
    private RowMapper<ProjectView> mapper() {
        return (row, index) -> {
            try {
                return new ProjectView(row.getObject("id", UUID.class), row.getString("slug"), row.getInt("content_version"),
                        row.getObject("published_version", Integer.class), row.getBoolean("featured"), row.getInt("sort_order"),
                        row.getBoolean("archived"), row.getTimestamp("updated_at").toInstant(), json.readValue(row.getString("payload"), ProjectContent.class));
            } catch (JsonProcessingException exception) { throw new IllegalStateException("Stored project could not be read", exception); }
        };
    }
}
