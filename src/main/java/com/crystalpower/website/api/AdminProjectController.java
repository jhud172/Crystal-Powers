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
import java.time.Instant;
import jakarta.validation.constraints.NotEmpty;

@RestController
@RequestMapping("/api/admin/projects")
public class AdminProjectController {
    public record Create(@NotBlank @Size(max = 120) String slug, @NotNull @Valid ProjectContent content) {}
    public record Save(@Min(1) int expectedVersion, @NotNull @Valid ProjectContent content) {}
    public record Version(@Min(1) int expectedVersion) {}
    public record Presentation(boolean featured, @Min(-10000) @jakarta.validation.constraints.Max(10000) int sortOrder, boolean archived, Instant expectedUpdatedAt) {}
    public record OrderItem(@NotNull UUID id, @NotNull Instant expectedUpdatedAt, @Min(-10000) @jakarta.validation.constraints.Max(10000) int sortOrder) {}
    public record Ordering(@NotEmpty @Size(max = 1000) List<@NotNull @Valid OrderItem> items) {}
    private final ProjectService projects;
    private final com.crystalpower.website.service.TeamProjectService teamProjects;
    public AdminProjectController(ProjectService projects,com.crystalpower.website.service.TeamProjectService teamProjects) { this.projects = projects;this.teamProjects=teamProjects; }

    public record TeamAccess(boolean enabled,@NotNull Instant expectedUpdatedAt) {}
    @GetMapping("/{id}/team-access")
    public Object teamScope(org.springframework.security.core.Authentication auth,@PathVariable UUID id) { return teamProjects.scope(auth,id); }
    @PatchMapping("/{id}/team-access")
    public Object teamAccess(org.springframework.security.core.Authentication auth,@PathVariable UUID id,@Valid @RequestBody TeamAccess input) { return teamProjects.assign(auth,id,input.enabled(),input.expectedUpdatedAt()); }

    @GetMapping
    public List<ProjectView> list() { return projects.drafts(); }
    @GetMapping("/{id}")
    public ProjectView draft(@PathVariable UUID id) { return projects.draft(id); }
    @GetMapping("/{id}/revisions/page")
    public Object revisionPage(@PathVariable UUID id,@RequestParam(required=false) Integer before) { return projects.revisionPage(id,before); }
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
    public ProjectView presentation(@PathVariable UUID id, @Valid @RequestBody Presentation input, @AuthenticationPrincipal OwnerPrincipal owner) { return projects.presentation(id, input.featured(), input.sortOrder(), input.archived(), owner.id(), input.expectedUpdatedAt()); }
    @PostMapping("/ordering")
    public List<ProjectView> ordering(@Valid @RequestBody Ordering input, @AuthenticationPrincipal OwnerPrincipal owner) {
        return projects.ordering(input.items().stream().map(item -> new ProjectService.OrderChange(item.id(), item.expectedUpdatedAt(), item.sortOrder())).toList(), owner.id());
    }
}

