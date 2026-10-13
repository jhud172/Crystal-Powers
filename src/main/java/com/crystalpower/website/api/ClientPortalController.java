package com.crystalpower.website.api;

import com.crystalpower.website.service.ClientPortalService;
import com.crystalpower.website.security.AttemptLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/client/projects")
public class ClientPortalController {
    public record Reply(@NotNull UUID submissionKey,@NotBlank @Size(max=4000) String body) {}
    private final ClientPortalService clients;
    private final AttemptLimiter limiter;
    public ClientPortalController(ClientPortalService clients,AttemptLimiter limiter) { this.clients=clients; this.limiter=limiter; }
    @GetMapping public Object list(Authentication auth) { return clients.list(auth); }
    @GetMapping("/page") public Object projects(Authentication auth,@RequestParam(required=false) String before) { return clients.projects(auth,before); }
    @GetMapping("/{id}") public Object detail(Authentication auth,@PathVariable UUID id) { return clients.detail(auth,id); }
    @GetMapping("/{id}/overview") public Object overview(Authentication auth,@PathVariable UUID id) { return clients.overview(auth,id); }
    @GetMapping("/{id}/conversation") public Object conversation(Authentication auth,@PathVariable UUID id,@RequestParam(required=false) String before) { return clients.conversation(auth,id,before); }
    @GetMapping("/{id}/history") public Object history(Authentication auth,@PathVariable UUID id,@RequestParam(required=false) String before) { return clients.history(auth,id,before); }
    @PostMapping("/{id}/messages") public Object reply(Authentication auth,@PathVariable UUID id,@Valid @RequestBody Reply body,HttpServletRequest request) { limiter.check("client-message:"+request.getRemoteAddr(),60,60); return Map.of("id",clients.reply(auth,id,body.submissionKey(),body.body())); }
    @GetMapping("/files/{id}") public ResponseEntity<byte[]> download(Authentication auth,@PathVariable UUID id) { var file=clients.file(auth,id); return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.APPLICATION_OCTET_STREAM).header("Content-Disposition",ContentDisposition.attachment().filename(file.attachment().filename(),StandardCharsets.UTF_8).build().toString()).header("X-Content-Type-Options","nosniff").header("Content-Security-Policy","sandbox").body(file.content()); }
}
