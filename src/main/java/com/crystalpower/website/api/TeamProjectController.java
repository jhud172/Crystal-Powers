package com.crystalpower.website.api;

import com.crystalpower.website.service.TeamProjectService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/team/projects")
public class TeamProjectController {
    private final TeamProjectService projects;
    public TeamProjectController(TeamProjectService projects) { this.projects=projects; }
    public record Snapshot(@NotNull Instant expectedUpdatedAt) {}
    public record Presentation(boolean featured,@jakarta.validation.constraints.Min(-10000) @jakarta.validation.constraints.Max(10000) int sortOrder,boolean archived,@NotNull Instant expectedUpdatedAt) {}
    public record Create(@NotNull UUID submissionKey,@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=120) String slug,@NotNull @Valid com.crystalpower.website.dto.ProjectContent content) {}
    @PostMapping public Object create(Authentication auth,@Valid @RequestBody Create input) { return projects.create(auth,input.submissionKey(),input.slug(),input.content()); }
    @PutMapping("/{id}") public Object save(Authentication auth,@PathVariable UUID id,@Valid @RequestBody AdminProjectController.Save input) { return projects.save(auth,id,input.expectedVersion(),input.content()); }
    @PostMapping("/{id}/revisions/{version}/restore") public Object restore(Authentication auth,@PathVariable UUID id,@PathVariable int version,@Valid @RequestBody AdminProjectController.Version input) { return projects.restore(auth,id,version,input.expectedVersion()); }
    @PostMapping("/{id}/publish") public Object publish(Authentication auth,@PathVariable UUID id,@Valid @RequestBody AdminProjectController.Version input) { return projects.publish(auth,id,input.expectedVersion()); }
    @PostMapping("/{id}/unpublish") public Object unpublish(Authentication auth,@PathVariable UUID id,@Valid @RequestBody Snapshot input) { return projects.unpublish(auth,id,input.expectedUpdatedAt()); }
    @PatchMapping("/{id}/presentation") public Object presentation(Authentication auth,@PathVariable UUID id,@Valid @RequestBody Presentation input) { return projects.presentation(auth,id,input.featured(),input.sortOrder(),input.archived(),input.expectedUpdatedAt()); }
    @GetMapping("/page") public Object page(Authentication auth,@RequestParam(required=false) String before) { return projects.page(auth,before); }
    @GetMapping("/{id}/revisions/page") public Object revisionPage(Authentication auth,@PathVariable UUID id,@RequestParam(required=false) Integer before) { return projects.revisionPage(auth,id,before); }
    @GetMapping("/overview") public Object overview(Authentication auth) { return projects.overview(auth); }
    @GetMapping public Object list(Authentication auth) { return projects.list(auth); }
    @GetMapping("/{id}/overview") public Object detail(Authentication auth,@PathVariable UUID id) { return projects.detail(auth,id); }
    @GetMapping("/{id}") public Object draft(Authentication auth,@PathVariable UUID id) { return projects.draft(auth,id); }
    @GetMapping("/{id}/revisions") public Object revisions(Authentication auth,@PathVariable UUID id) { return projects.revisions(auth,id); }
}
