package com.crystalpower.website.dto;

import java.time.Instant;
import java.util.UUID;

public record ProjectView(UUID id, String slug, int version, Integer publishedVersion,
        boolean featured, int sortOrder, boolean archived, Instant updatedAt, ProjectContent content) {
    public PublicProject publicProject() { return new PublicProject(id, slug, featured, sortOrder, content); }
    public record PublicProject(UUID id, String slug, boolean featured, int sortOrder, ProjectContent content) {}
}
