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
    public record Revision(int version, java.time.Instant createdAt, String title) {}
    private static final String PUBLISHED = "SELECT p.*, r.version AS content_version, r.payload FROM project p JOIN project_revision r ON r.project_id = p.id AND r.version = p.published_version WHERE p.archived = FALSE";
    private static final String DRAFT = "SELECT p.*, r.version AS content_version, r.payload FROM project p JOIN project_revision r ON r.project_id = p.id AND r.version = p.draft_version";
    private final JdbcTemplate database;
    private final ObjectMapper json;
    public ProjectRepository(JdbcTemplate database, ObjectMapper json) { this.database = database; this.json = json; }

    public List<ProjectView> published() { return database.query(PUBLISHED + " ORDER BY p.sort_order, p.created_at DESC", mapper()); }
    public Optional<ProjectView> published(String slug) { return database.query(PUBLISHED + " AND p.slug = ?", mapper(), slug).stream().findFirst(); }
    public List<ProjectView> drafts() { return database.query(DRAFT + " ORDER BY p.archived, p.sort_order, p.created_at DESC", mapper()); }
    public Optional<ProjectView> draft(UUID id) { return database.query(DRAFT + " WHERE p.id = ?", mapper(), id).stream().findFirst(); }
    public boolean slugExists(String slug) { return Boolean.TRUE.equals(database.queryForObject("SELECT COUNT(*) > 0 FROM project WHERE slug = ?", Boolean.class, slug)); }
    public List<Revision> revisions(UUID id) {
        return database.query("SELECT version, created_at, payload FROM project_revision WHERE project_id = ? ORDER BY version DESC", (row, index) ->
                new Revision(row.getInt("version"), row.getTimestamp("created_at").toInstant(), decode(row.getString("payload")).title()), id);
    }
    public Optional<ProjectContent> revision(UUID id, int version) {
        return database.query("SELECT payload FROM project_revision WHERE project_id = ? AND version = ?", (row, index) -> decode(row.getString("payload")), id, version).stream().findFirst();
    }
    private ProjectContent decode(String payload) {
        try { return json.readValue(payload, ProjectContent.class); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Stored project could not be read", exception); }
    }
    public void create(UUID id, String slug) { database.update("INSERT INTO project (id, slug) VALUES (?, ?)", id, slug); }
    public boolean advanceDraft(UUID id, int version) { return database.update("UPDATE project SET draft_version = draft_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND draft_version = ?", id, version) == 1; }
    public boolean publish(UUID id, int version) { return database.update("UPDATE project SET published_version = draft_version, archived = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND draft_version = ?", id, version) == 1; }
    public boolean unpublish(UUID id) { return database.update("UPDATE project SET published_version = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?", id) == 1; }
    public boolean presentation(UUID id, boolean featured, int order, boolean archived) { return database.update("UPDATE project SET featured = ?, sort_order = ?, archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", featured, order, archived, id) == 1; }
    public boolean ownsMedia(UUID project, UUID media) { return Integer.valueOf(1).equals(database.queryForObject("SELECT COUNT(*) FROM project_media WHERE id = ? AND project_id = ?", Integer.class, media, project)); }
    public void insertRevision(UUID id, int version, ProjectContent content) {
        try { database.update("INSERT INTO project_revision (id, project_id, version, payload) VALUES (?, ?, ?, ?)", UUID.randomUUID(), id, version, json.writeValueAsString(content)); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Project could not be serialised", exception); }
    }
    public void audit(UUID owner, String event, UUID project) { database.update("INSERT INTO admin_audit (id, account_id, event, resource_id) VALUES (?, ?, ?, ?)", UUID.randomUUID(), owner, event, project.toString()); }
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
