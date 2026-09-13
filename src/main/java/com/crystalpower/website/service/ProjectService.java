package com.crystalpower.website.service;

import com.crystalpower.website.dto.ProjectContent;
import com.crystalpower.website.dto.ProjectView;
import com.crystalpower.website.repository.ProjectRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ProjectService {
    private final ProjectRepository projects;
    public ProjectService(ProjectRepository projects) { this.projects = projects; }
    public List<ProjectView> published() { return projects.published(); }
    public ProjectView published(String slug) { return projects.published(slug).orElseThrow(ProjectService::notFound); }
    public List<ProjectView> drafts() { return projects.drafts(); }
    public ProjectView draft(UUID id) { return projects.draft(id).orElseThrow(ProjectService::notFound); }
    public List<ProjectRepository.Revision> revisions(UUID id) { draft(id); return projects.revisions(id); }

    @Transactional
    public ProjectView restoreRevision(UUID id, int version, int expectedVersion, UUID owner) {
        ProjectContent content = projects.revision(id, version).orElseThrow(ProjectService::notFound);
        ProjectView restored = save(id, expectedVersion, content, owner);
        projects.audit(owner, "PROJECT_REVISION_RESTORED", id);
        return restored;
    }

    @Transactional
    public ProjectView create(String slug, ProjectContent content, UUID owner) {
        if (!slug.matches("[a-z0-9]+(?:-[a-z0-9]+)*") || slug.length() > 120) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use a short address with lowercase letters, numbers and hyphens.");
        }
        validateLink(content.liveUrl());
        if (projects.slugExists(slug)) throw new ResponseStatusException(HttpStatus.CONFLICT, "That project address is already in use.");
        UUID id = UUID.randomUUID();
        assertOwnedMedia(id, content, false);
        projects.create(id, slug);
        projects.insertRevision(id, 1, content);
        projects.audit(owner, "PROJECT_CREATED", id);
        return draft(id);
    }

    @Transactional
    public ProjectView save(UUID id, int expectedVersion, ProjectContent content, UUID owner) {
        validateLink(content.liveUrl());
        assertOwnedMedia(id, content, false);
        if (!projects.advanceDraft(id, expectedVersion)) throw conflict();
        projects.insertRevision(id, expectedVersion + 1, content);
        projects.audit(owner, "PROJECT_DRAFT_SAVED", id);
        return draft(id);
    }

    @Transactional
    public ProjectView publish(UUID id, int expectedVersion, UUID owner) {
        ProjectView draft = draft(id);
        if (draft.version() != expectedVersion) throw conflict();
        ProjectContent content = draft.content();
        if (content.title().isBlank() || content.summary().isBlank() || content.coverMediaId() == null || content.coverAlt().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add a title, summary, cover image and image description before publishing.");
        }
        if (content.gallery().stream().anyMatch(image -> image.alt().isBlank())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add a description to each gallery image.");
        assertOwnedMedia(id, content, true);
        if (!projects.publish(id, expectedVersion)) throw conflict();
        projects.audit(owner, "PROJECT_PUBLISHED", id);
        return draft(id);
    }

    @Transactional
    public ProjectView unpublish(UUID id, UUID owner) {
        if (!projects.unpublish(id)) throw notFound();
        projects.audit(owner, "PROJECT_UNPUBLISHED", id);
        return draft(id);
    }

    @Transactional
    public ProjectView presentation(UUID id, boolean featured, int sortOrder, boolean archived, UUID owner) {
        if (!projects.presentation(id, featured, sortOrder, archived)) throw notFound();
        projects.audit(owner, archived ? "PROJECT_ARCHIVED" : "PROJECT_PRESENTATION_UPDATED", id);
        return draft(id);
    }

    public boolean publicMedia(UUID mediaId) { return published().stream().anyMatch(project -> references(project.content(), mediaId)); }
    public static boolean references(ProjectContent content, UUID mediaId) { return mediaId.equals(content.coverMediaId()) || content.gallery().stream().anyMatch(image -> mediaId.equals(image.mediaId())); }

    private void assertOwnedMedia(UUID id, ProjectContent content, boolean publishing) {
        List<UUID> references = new ArrayList<>();
        if (content.coverMediaId() != null) references.add(content.coverMediaId());
        content.gallery().forEach(image -> references.add(image.mediaId()));
        for (UUID media : references) {
            if (!projects.ownsMedia(id, media)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    publishing ? "An image is missing. Upload it again before publishing." : "Images must belong to this project.");
        }
    }

    private void validateLink(String value) {
        if (value == null || value.isBlank()) return;
        try {
            URI uri = URI.create(value);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null) throw new IllegalArgumentException();
        } catch (IllegalArgumentException exception) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use a complete HTTPS website address."); }
    }
    private static ResponseStatusException notFound() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found."); }
    private static ResponseStatusException conflict() { return new ResponseStatusException(HttpStatus.CONFLICT, "This project changed in another session. Reload before saving or publishing."); }
}
