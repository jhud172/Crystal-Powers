package com.crystalpower.website.api;

import com.crystalpower.website.service.DocksEmailSignIn;
import com.crystalpower.website.service.DocksOnlineExplanation;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/docks/explanations/online")
public class DocksOnlineExplanationController {
    private final DocksEmailSignIn auth;
    private final DocksOnlineExplanation explanations;

    public DocksOnlineExplanationController(DocksEmailSignIn auth, DocksOnlineExplanation explanations) {
        this.auth = auth;
        this.explanations = explanations;
    }

    public record Readings(@NotNull UUID installationId, @Min(0) @Max(100) Integer cpuPercent,
                           @Min(0) @Max(100) Integer memoryPercent, @AssertTrue boolean approved) {}

    @GetMapping
    public ResponseEntity<?> available(@RequestHeader(name = "Authorization", required = false) String token,
            @RequestParam(name = "installationId", required = false) UUID installation) {
        UUID account = requireAccount(token);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(installation == null
                ? Map.of("available", explanations.available()) : explanations.preview(account, installation));
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> explain(
            @RequestHeader(name = "Authorization", required = false) String token, @Valid @RequestBody Readings readings) {
        UUID account = requireAccount(token);
        String explanation = explanations.explain(account, readings.installationId(), readings.cpuPercent(), readings.memoryPercent());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("explanation", explanation));
    }

    private UUID requireAccount(String token) {
        return auth.account(token).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                "Sign in to Crystal Docks."));
    }

    @ExceptionHandler({ MethodArgumentNotValidException.class, HttpMessageNotReadableException.class })
    public ResponseEntity<Map<String, String>> invalidReadings() {
        return failure(HttpStatus.BAD_REQUEST, "Approve sharing and provide valid readings for this computer.");
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> refused(ResponseStatusException error) {
        return failure(error.getStatusCode(), error.getReason());
    }

    private static ResponseEntity<Map<String, String>> failure(HttpStatusCode status, String message) {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(Map.of("message", message));
    }
}
