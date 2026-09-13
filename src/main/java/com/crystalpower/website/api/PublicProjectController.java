package com.crystalpower.website.api;

import com.crystalpower.website.service.ProjectService;
import com.crystalpower.website.dto.ProjectView;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import java.time.Duration;
import java.util.List;

@RestController
public class PublicProjectController {
    private final ProjectService projects;
    public PublicProjectController(ProjectService projects) { this.projects = projects; }

    @GetMapping("/api/projects")
    public ResponseEntity<List<ProjectView.PublicProject>> list() {
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofSeconds(30)).mustRevalidate()).body(projects.published().stream().map(ProjectView::publicProject).toList());
    }

    @GetMapping("/api/projects/{slug}")
    public ResponseEntity<ProjectView.PublicProject> project(@PathVariable String slug) {
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofSeconds(30)).mustRevalidate()).body(projects.published(slug).publicProject());
    }
}
