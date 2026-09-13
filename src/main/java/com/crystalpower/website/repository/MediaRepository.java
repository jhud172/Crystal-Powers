package com.crystalpower.website.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class MediaRepository {
    public record Media(UUID id, UUID projectId, String key, String contentType, long bytes, int width, int height) {}
    private final JdbcTemplate database;
    public MediaRepository(JdbcTemplate database) { this.database = database; }
    private final org.springframework.jdbc.core.RowMapper<Media> mapper = (row, index) -> new Media(row.getObject("id", UUID.class), row.getObject("project_id", UUID.class), row.getString("storage_key"), row.getString("content_type"), row.getLong("bytes"), row.getInt("width"), row.getInt("height"));
    public Optional<Media> find(UUID id) { return database.query("SELECT * FROM project_media WHERE id = ?", mapper, id).stream().findFirst(); }
    public List<Media> list(UUID id) { return database.query("SELECT * FROM project_media WHERE project_id = ? ORDER BY created_at DESC", mapper, id); }
    public long storedBytes() { return database.queryForObject("SELECT COALESCE(SUM(bytes), 0) FROM project_media", Long.class); }
    public void insert(Media media) { database.update("INSERT INTO project_media (id, project_id, storage_key, content_type, bytes, width, height) VALUES (?, ?, ?, ?, ?, ?, ?)", media.id(), media.projectId(), media.key(), media.contentType(), media.bytes(), media.width(), media.height()); }
}
