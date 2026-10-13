package com.crystalpower.website.api;

import com.crystalpower.website.service.SupportModerationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@Validated
@RequestMapping("/api/team/uploads")
public class TeamUploadController {
    public record Review(@Min(0) int expectedVersion, @NotNull @Pattern(regexp="APPROVED|REJECTED") String state, @NotNull @Size(max=500) String note) {}
    public record Revision(@Min(0) int expectedVersion) {}
    public record Removal(@Min(0) int expectedVersion,@NotBlank @Size(max=500) String reason) {}
    private final com.crystalpower.website.service.UploadScanService scans;
    private final SupportModerationService moderation;
    public TeamUploadController(SupportModerationService moderation,com.crystalpower.website.service.UploadScanService scans) { this.moderation = moderation;this.scans=scans; }
    @GetMapping public Object list(Authentication authentication, @RequestParam(defaultValue="PENDING") @Pattern(regexp="PENDING|APPROVED|REJECTED") String state) { return moderation.list(authentication, state); }
    @GetMapping("/queue") public Object page(Authentication auth,@RequestParam(defaultValue="PENDING") @Pattern(regexp="PENDING|APPROVED|REJECTED|REMOVED") String state,@RequestParam(required=false) UUID after) { return moderation.page(auth,state,after); }
    @PostMapping("/{id}/remove") public Object remove(Authentication auth,@PathVariable UUID id,@Valid @RequestBody Removal input) { return moderation.remove(auth,id,input.expectedVersion(),input.reason()); }
    @PostMapping("/{id}/scan") public Object scan(Authentication auth,@PathVariable UUID id,@Valid @RequestBody Revision input) { return scans.scan(auth,id,input.expectedVersion()); }
    @PatchMapping("/{id}") public Object review(Authentication authentication, @PathVariable UUID id, @Valid @RequestBody Review input) { return moderation.review(authentication, id, input.expectedVersion(), input.state(), input.note()); }
}
