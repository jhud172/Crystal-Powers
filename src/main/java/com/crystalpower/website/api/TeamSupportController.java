package com.crystalpower.website.api;

import com.crystalpower.website.service.SupportRequestService;
import com.crystalpower.website.service.SupportReplyEmailService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.validation.annotation.Validated;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.Map;

@RestController
@Validated
@RequestMapping("/api/team/support")
public class TeamSupportController {
    @PostMapping("/requests/{id}/messages/{message}/share") public Object share(Authentication authentication,@PathVariable UUID id,@PathVariable UUID message) { requests.shareToPortal(authentication,id,message); return Map.of("success",true); }
    public record Tracking(@Min(0) int expectedVersion, @NotNull @Pattern(regexp="NEW|REVIEWING|QUOTED|IN_PROGRESS|WAITING_CLIENT|COMPLETED|CLOSED") String state, @Min(0) @Max(100) int progress, @NotNull @Size(max=1000) String nextStep, UUID assignedMemberId, @Size(max=6000) String projectScope) {}
    public record Reply(@NotNull UUID submissionKey, @NotNull @Pattern(regexp="INTERNAL|CLIENT") String kind, @NotBlank @Size(max=4000) String body) {}
    private final SupportRequestService requests;
    private final SupportReplyEmailService replies;
    public TeamSupportController(SupportRequestService requests, SupportReplyEmailService replies) { this.requests = requests; this.replies = replies; }
    @GetMapping("/requests") public Object list(Authentication authentication, @RequestParam(required=false) @Pattern(regexp="NEW|REVIEWING|QUOTED|IN_PROGRESS|WAITING_CLIENT|COMPLETED|CLOSED") String state, @RequestParam(required=false) UUID before) { return requests.list(authentication, state, before); }
    @GetMapping("/assignees") public Object assignees(Authentication authentication) { return requests.assignees(authentication); }
    @GetMapping("/requests/page") public Object page(Authentication auth,@RequestParam(required=false) @Pattern(regexp="NEW|REVIEWING|QUOTED|IN_PROGRESS|WAITING_CLIENT|COMPLETED|CLOSED") String state,@RequestParam(required=false) UUID before) { return requests.requestPage(auth,state,before); }
    @GetMapping("/requests/{id}") public Object detail(Authentication authentication, @PathVariable UUID id) { return requests.detail(authentication, id); }
    @GetMapping("/requests/{id}/overview") public Object overview(Authentication auth,@PathVariable UUID id) { return requests.overview(auth,id); }
    @GetMapping("/requests/{id}/updates") public Object updates(Authentication auth,@PathVariable UUID id,@RequestParam @Pattern(regexp="MESSAGES|REPLIES|EVENTS") String kind,@RequestParam(required=false) UUID before) { return requests.updates(auth,id,kind,before); }
    @PatchMapping("/requests/{id}") public Object update(Authentication authentication, @PathVariable UUID id, @Valid @RequestBody Tracking input) { return requests.update(authentication, id, input.expectedVersion(), input.state(), input.progress(), input.nextStep(), input.assignedMemberId(), input.projectScope()); }
    @PostMapping("/requests/{id}/messages") public Object message(Authentication authentication, @PathVariable UUID id, @Valid @RequestBody Reply input) { return requests.addMessage(authentication, id, input.submissionKey(), input.kind(), input.body()); }
    @PostMapping("/requests/{id}/messages/{message}/send") public Object send(Authentication authentication, @PathVariable UUID id, @PathVariable UUID message) { return replies.send(authentication, id, message); }
    @GetMapping("/attachments/{id}") public ResponseEntity<byte[]> download(Authentication authentication, @PathVariable UUID id) {
        var file = requests.download(authentication, id);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM).header(HttpHeaders.CACHE_CONTROL, "no-store").header("X-Content-Type-Options", "nosniff").header("Content-Security-Policy", "sandbox").header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(file.attachment().filename(), StandardCharsets.UTF_8).build().toString()).body(file.content());
    }
}
