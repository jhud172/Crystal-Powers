package com.crystalpower.website.api;

import com.crystalpower.website.service.TeamProjectMediaService;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.UUID;

@RestController
public class TeamProjectMediaController {
    private final TeamProjectMediaService media;
    public TeamProjectMediaController(TeamProjectMediaService media) { this.media=media; }
    @GetMapping("/api/team/projects/{id}/media")
    public List<ProjectMediaController.ImageView> list(Authentication auth,@PathVariable UUID id) { return media.list(auth,id).stream().map(ProjectMediaController.ImageView::of).toList(); }
    @PostMapping(value="/api/team/projects/{id}/media",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public ProjectMediaController.ImageView upload(Authentication auth,@PathVariable UUID id,@RequestParam("file") MultipartFile file) { return ProjectMediaController.ImageView.of(media.upload(auth,id,file)); }
    @GetMapping("/api/team/media/{id}")
    public ResponseEntity<byte[]> image(Authentication auth,@PathVariable UUID id) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.IMAGE_JPEG)
            .header("Content-Disposition","inline; filename=\"project-image.jpg\"").header("X-Content-Type-Options","nosniff").body(media.read(auth,id));
    }
}
