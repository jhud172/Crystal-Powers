package com.crystalpower.website.api;

import com.crystalpower.website.security.AttemptLimiter;
import com.crystalpower.website.service.DocksEmailSignIn;
import com.crystalpower.website.service.DocksResearch;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
public class DocksResearchController {
    private final DocksEmailSignIn auth;
    private final DocksResearch research;
    private final AttemptLimiter limiter;

    public DocksResearchController(DocksEmailSignIn auth, DocksResearch research, AttemptLimiter limiter) {
        this.auth = auth;
        this.research = research;
        this.limiter = limiter;
    }

    public record Preference(@NotNull Boolean enabled) {}
    public record Contribution(@NotNull DocksResearch.Band cpuBand, @NotNull DocksResearch.Band memoryBand) {}

    @GetMapping("/api/docks/research")
    public ResponseEntity<Object> state(@RequestHeader(name = "Authorization", required = false) String token) {
        return auth.account(token).map(account -> response(200, research.state(account))).orElseGet(DocksResearchController::unauthorised);
    }

    @PutMapping("/api/docks/research/preference")
    public ResponseEntity<Object> preference(@RequestHeader(name = "Authorization", required = false) String token,
            @Valid @RequestBody Preference preference) {
        return auth.account(token).map(account -> {
            research.setEnabled(account, preference.enabled());
            return response(200, research.state(account));
        }).orElseGet(DocksResearchController::unauthorised);
    }

    @PutMapping("/api/docks/research/contribution")
    public ResponseEntity<Object> submit(@RequestHeader(name = "Authorization", required = false) String token,
            @Valid @RequestBody Contribution contribution) {
        return auth.account(token).map(account -> {
            limiter.check("docks-research:" + account, 20, 900);
            if (contribution.cpuBand() == DocksResearch.Band.UNAVAILABLE && contribution.memoryBand() == DocksResearch.Band.UNAVAILABLE)
                return response(422, Map.of("message", "Run a new device check before contributing."));
            var state = research.submit(account, contribution.cpuBand(), contribution.memoryBand());
            return state.enabled() ? response(200, state)
                : response(409, Map.of("message", "Diagnostic research is off."));
        }).orElseGet(DocksResearchController::unauthorised);
    }

    @GetMapping("/api/admin/docks/research")
    public ResponseEntity<Object> totals() {
        return response(200, research.totals());
    }

    private static ResponseEntity<Object> unauthorised() {
        return response(401, Map.of("message", "Sign in to Crystal Docks."));
    }

    private static ResponseEntity<Object> response(int status, Object body) {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(body);
    }
}
