package com.crystalpower.website.api;

import com.crystalpower.website.dto.ProjectContent;
import com.crystalpower.website.dto.ProjectView;
import com.crystalpower.website.security.OwnerPrincipal;
import com.crystalpower.website.service.ProjectService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/projects")
public class AdminProjectController {
    public record Create(@NotBlank @Size(max = 120) String slug, @NotNull @Valid ProjectContent content) {}
    public record Save(@Min(1) int expectedVersion, @NotNull @Valid ProjectContent content) {}
    public record Version(@Min(1) int expectedVersion) {}
    public record Presentation(boolean featured, @Min(-10000) @jakarta.validation.constraints.Max(10000) int sortOrder, boolean archived) {}
    private final ProjectService projects;
    public AdminProjectController(ProjectService projects) { this.projects = projects; }

    @GetMapping
    public List<ProjectView> list() { return projects.drafts(); }
    @GetMapping("/{id}")
    public ProjectView draft(@PathVariable UUID id) { return projects.draft(id); }
    @GetMapping("/{id}/revisions")
    public List<com.crystalpower.website.repository.ProjectRepository.Revision> revisions(@PathVariable UUID id) { return projects.revisions(id); }
    @PostMapping("/{id}/revisions/{version}/restore")
    public ProjectView restore(@PathVariable UUID id, @PathVariable int version, @Valid @RequestBody Version input, @AuthenticationPrincipal OwnerPrincipal owner) { return projects.restoreRevision(id, version, input.expectedVersion(), owner.id()); }
    @PostMapping
    public ProjectView create(@Valid @RequestBody Create input, @AuthenticationPrincipal OwnerPrincipal owner) { return projects.create(input.slug(), input.content(), owner.id()); }
    @PutMapping("/{id}")
    public ProjectView save(@PathVariable UUID id, @Valid @RequestBody Save input, @AuthenticationPrincipal OwnerPrincipal owner) { return projects.save(id, input.expectedVersion(), input.content(), owner.id()); }
    @PostMapping("/{id}/publish")
    public ProjectView publish(@PathVariable UUID id, @Valid @RequestBody Version input, @AuthenticationPrincipal OwnerPrincipal owner) { return projects.publish(id, input.expectedVersion(), owner.id()); }
    @PostMapping("/{id}/unpublish")
    public ProjectView unpublish(@PathVariable UUID id, @AuthenticationPrincipal OwnerPrincipal owner) { return projects.unpublish(id, owner.id()); }
    @PatchMapping("/{id}/presentation")
    public ProjectView presentation(@PathVariable UUID id, @Valid @RequestBody Presentation input, @AuthenticationPrincipal OwnerPrincipal owner) { return projects.presentation(id, input.featured(), input.sortOrder(), input.archived(), owner.id()); }
}

