package com.crystalpower.website.api;

import com.crystalpower.website.service.TeamAttachmentService;
import com.crystalpower.website.service.TeamAttachmentStore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@RestController
@Validated
@RequestMapping("/api/team/channels/{channel}/messages/{message}/attachments")
public class TeamAttachmentController {
    public record Version(@Min(0) int version) {}
    public record Rename(@Min(0) int version,@NotBlank @Size(max=510) String filename) {}
    public record Review(@Min(0) int version,@NotBlank @Pattern(regexp="APPROVED|REJECTED") String state,@NotNull @Size(max=1000) String note) {}
    private final TeamAttachmentStore store;
    private final TeamAttachmentService service;
    public TeamAttachmentController(TeamAttachmentStore store,TeamAttachmentService service){this.store=store;this.service=service;}
    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<?> oversized(){return ResponseEntity.status(413).body(java.util.Map.of("success",false,"message","The upload exceeds the configured request allowance. Choose a smaller file; channel messages allow five files and 15 MB total."));}
    @GetMapping public Object list(Authentication auth,@PathVariable UUID channel,@PathVariable @Positive long message){return store.list(auth,channel,message);}
    @PostMapping(consumes=MediaType.MULTIPART_FORM_DATA_VALUE) public Object upload(Authentication auth,@PathVariable UUID channel,@PathVariable @Positive long message,@RequestParam UUID submissionKey,@RequestPart MultipartFile file){return service.upload(auth,channel,message,submissionKey,file);}
    @GetMapping("/{id}/download") public ResponseEntity<byte[]> download(Authentication auth,@PathVariable UUID channel,@PathVariable @Positive long message,@PathVariable UUID id){var file=store.download(auth,channel,message,id);return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.APPLICATION_OCTET_STREAM).header("Content-Disposition",ContentDisposition.attachment().filename(file.file().filename(),StandardCharsets.UTF_8).build().toString()).header("X-Content-Type-Options","nosniff").header("Content-Security-Policy","sandbox").body(file.content());}
    @PostMapping("/{id}/scan") public Object scan(Authentication auth,@PathVariable UUID channel,@PathVariable @Positive long message,@PathVariable UUID id,@Valid @RequestBody Version input){return service.scan(auth,channel,message,id,input.version());}
    @PatchMapping("/{id}/review") public Object review(Authentication auth,@PathVariable UUID channel,@PathVariable @Positive long message,@PathVariable UUID id,@Valid @RequestBody Review input){return store.review(auth,channel,message,id,input.version(),input.state(),input.note());}
    @PatchMapping("/{id}/filename") public Object rename(Authentication auth,@PathVariable UUID channel,@PathVariable @Positive long message,@PathVariable UUID id,@Valid @RequestBody Rename input){return store.rename(auth,channel,message,id,input.version(),input.filename());}
    @PostMapping("/{id}/remove") public Object remove(Authentication auth,@PathVariable UUID channel,@PathVariable @Positive long message,@PathVariable UUID id,@Valid @RequestBody Version input){return store.remove(auth,channel,message,id,input.version());}
}
