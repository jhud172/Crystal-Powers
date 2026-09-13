package com.crystalpower.website.api;

import com.crystalpower.website.repository.MediaRepository.Media;
import com.crystalpower.website.security.OwnerPrincipal;
import com.crystalpower.website.service.ProjectMediaService;
import com.crystalpower.website.service.ProjectService;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.UUID;

@RestController
public class ProjectMediaController {
    public record ImageView(UUID id, long bytes, int width, int height) {
        static ImageView of(Media media) { return new ImageView(media.id(), media.bytes(), media.width(), media.height()); }
    }
    private final ProjectMediaService media;
    private final ProjectService projects;
    public ProjectMediaController(ProjectMediaService media, ProjectService projects) { this.media = media; this.projects = projects; }
    @GetMapping("/api/admin/projects/{id}/media")
    public List<ImageView> list(@PathVariable UUID id) { return media.list(id).stream().map(ImageView::of).toList(); }
    @PostMapping(value = "/api/admin/projects/{id}/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImageView upload(@PathVariable UUID id, @RequestParam("file") MultipartFile file, @AuthenticationPrincipal OwnerPrincipal owner) { return ImageView.of(media.upload(id, file, owner.id())); }
    @GetMapping("/api/admin/media/{id}")
    public ResponseEntity<byte[]> privateImage(@PathVariable UUID id) { return image(id); }
    @GetMapping("/api/media/{id}")
    public ResponseEntity<byte[]> publicImage(@PathVariable UUID id) {
        if (!projects.publicMedia(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Image not found.");
        return image(id);
    }
    private ResponseEntity<byte[]> image(UUID id) {
        // Recheck publication on every request, including after unpublishing or archiving.
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.IMAGE_JPEG)
                .header("Content-Disposition", "inline; filename=\"project-image.jpg\"").body(media.read(id));
    }
}
