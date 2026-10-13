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

    public record RevisionPage(List<ProjectRepository.Revision> items,Integer nextCursor,long total) {}
    public RevisionPage revisionPage(UUID id,Integer before) {
        draft(id);if(before!=null && (before<1 || !projects.hasRevision(id,before)))throw notFound();
        var rows=projects.revisionPage(id,before);boolean more=rows.size()>50;var items=more ? rows.subList(0,50) : rows;
        return new RevisionPage(items,more ? items.get(items.size()-1).version() : null,projects.revisionTotal(id));
    }

    @Transactional
    public ProjectView restoreRevision(UUID id, int version, int expectedVersion, UUID owner) { return restoreRevisionAs(id, version, expectedVersion,ProjectRepository.Editor.owner(owner)); }
    @Transactional
    public ProjectView restoreRevisionAs(UUID id, int version, int expectedVersion, ProjectRepository.Editor actor) {
        ProjectContent content = projects.revision(id, version).orElseThrow(ProjectService::notFound);
        ProjectView restored = saveAs(id, expectedVersion, content, actor);
        projects.audit(actor, "PROJECT_REVISION_RESTORED", id);
        return restored;
    }

    @Transactional
    public ProjectView create(String slug, ProjectContent content, UUID owner) { return createAs(slug, content,ProjectRepository.Editor.owner(owner)); }
    @Transactional
    public ProjectView createAs(String slug, ProjectContent content, ProjectRepository.Editor actor) {
        if (!slug.matches("[a-z0-9]+(?:-[a-z0-9]+)*") || slug.length() > 120) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use a short address with lowercase letters, numbers and hyphens.");
        }
        validateLink(content.liveUrl());
        if (projects.slugExists(slug)) throw new ResponseStatusException(HttpStatus.CONFLICT, "That project address is already in use.");
        UUID id = UUID.randomUUID();
        assertOwnedMedia(id, content, false);
        projects.create(id, slug);
        projects.insertRevision(id, 1, content);
        projects.audit(actor, "PROJECT_CREATED", id);
        return draft(id);
    }

    @Transactional
    public ProjectView save(UUID id, int expectedVersion, ProjectContent content, UUID owner) { return saveAs(id, expectedVersion, content,ProjectRepository.Editor.owner(owner)); }
    @Transactional
    public ProjectView saveAs(UUID id, int expectedVersion, ProjectContent content, ProjectRepository.Editor actor) {
        validateLink(content.liveUrl());
        assertOwnedMedia(id, content, false);
        if (!projects.advanceDraft(id, expectedVersion)) throw conflict();
        projects.insertRevision(id, expectedVersion + 1, content);
        projects.audit(actor, "PROJECT_DRAFT_SAVED", id);
        return draft(id);
    }

    @Transactional
    public ProjectView publish(UUID id, int expectedVersion, UUID owner) { return publishAs(id, expectedVersion,ProjectRepository.Editor.owner(owner)); }
    @Transactional
    public ProjectView publishAs(UUID id, int expectedVersion, ProjectRepository.Editor actor) {
        ProjectView draft = draft(id);
        if (draft.version() != expectedVersion) throw conflict();
        ProjectContent content = draft.content();
        if (content.title().isBlank() || content.summary().isBlank() || content.coverMediaId() == null || content.coverAlt().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add a title, summary, cover image and image description before publishing.");
        }
        if (content.gallery().stream().anyMatch(image -> image.alt().isBlank())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add a description to each gallery image.");
        if (screenImages(content).stream().anyMatch(image -> image.alt().isBlank())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add a description to each selected device screenshot.");
        assertOwnedMedia(id, content, true);
        if (!projects.publish(id, expectedVersion)) throw conflict();
        projects.audit(actor, "PROJECT_PUBLISHED", id);
        return draft(id);
    }

    @Transactional
    public ProjectView unpublish(UUID id, UUID owner) { return unpublishAs(id,ProjectRepository.Editor.owner(owner)); }
    @Transactional
    public ProjectView unpublishAs(UUID id, ProjectRepository.Editor actor) {
        if (!projects.unpublish(id)) throw notFound();
        projects.audit(actor, "PROJECT_UNPUBLISHED", id);
        return draft(id);
    }

    @Transactional
    public ProjectView presentation(UUID id, boolean featured, int sortOrder, boolean archived, UUID owner) {
        return presentation(id, featured, sortOrder, archived, owner, null);
    }

    @Transactional
    public ProjectView presentation(UUID id, boolean featured, int sortOrder, boolean archived, UUID owner, java.time.Instant expectedUpdatedAt) { return presentationAs(id,featured,sortOrder,archived,ProjectRepository.Editor.owner(owner),expectedUpdatedAt); }
    @Transactional
    public ProjectView presentationAs(UUID id, boolean featured, int sortOrder, boolean archived, ProjectRepository.Editor actor, java.time.Instant expectedUpdatedAt) {
        var current = projects.lockPresentation(id).orElseThrow(ProjectService::notFound);
        if (expectedUpdatedAt != null && !current.updatedAt().equals(expectedUpdatedAt)) throw conflict();
        if (!projects.presentation(id, featured, sortOrder, archived)) throw notFound();
        projects.audit(actor, archived ? "PROJECT_ARCHIVED" : "PROJECT_PRESENTATION_UPDATED", id);
        return draft(id);
    }

    public record OrderChange(UUID id, java.time.Instant expectedUpdatedAt, int sortOrder) {}

    @Transactional
    public List<ProjectView> ordering(List<OrderChange> changes, UUID owner) {
        if (changes.stream().map(OrderChange::id).distinct().count() != changes.size()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose each project only once.");
        // All writers use the same lock order; validate every snapshot before any update.
        var states = new java.util.HashMap<UUID, ProjectRepository.PresentationState>();
        for (var change : changes.stream().sorted(java.util.Comparator.comparing(OrderChange::id)).toList()) {
            var state = projects.lockPresentation(change.id()).orElseThrow(ProjectService::notFound);
            if (!state.updatedAt().equals(change.expectedUpdatedAt())) throw conflict();
            states.put(change.id(), state);
        }
        for (var change : changes) {
            var state = states.get(change.id());
            if (state.sortOrder() == change.sortOrder()) continue;
            projects.presentation(change.id(), state.featured(), change.sortOrder(), state.archived());
            projects.audit(owner, "PROJECT_ORDER_UPDATED", change.id());
        }
        return drafts();
    }

    public boolean publicMedia(UUID mediaId) { return published().stream().anyMatch(project -> references(project.content(), mediaId)); }
    public static boolean references(ProjectContent content, UUID mediaId) {
        return mediaId.equals(content.coverMediaId()) || content.gallery().stream().anyMatch(image -> mediaId.equals(image.mediaId()))
                || screenImages(content).stream().anyMatch(image -> mediaId.equals(image.mediaId()));
    }

    private static List<ProjectContent.GalleryImage> screenImages(ProjectContent content) {
        List<ProjectContent.GalleryImage> images = new ArrayList<>();
        if (content.screens() != null) {
            if (content.screens().desktop() != null) images.add(content.screens().desktop());
            if (content.screens().mobile() != null) images.add(content.screens().mobile());
        }
        return images;
    }

    private void assertOwnedMedia(UUID id, ProjectContent content, boolean publishing) {
        List<UUID> references = new ArrayList<>();
        if (content.coverMediaId() != null) references.add(content.coverMediaId());
        content.gallery().forEach(image -> references.add(image.mediaId()));
        screenImages(content).forEach(image -> references.add(image.mediaId()));
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
