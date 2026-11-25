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
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<Map<String, Boolean>> available(
            @RequestHeader(name = "Authorization", required = false) String token) {
        requireAccount(token);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("available", explanations.available()));
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
}
