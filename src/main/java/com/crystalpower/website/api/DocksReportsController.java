package com.crystalpower.website.api;

import com.crystalpower.website.service.DocksEmailSignIn;
import com.crystalpower.website.service.DocksReports;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/docks/reports")
public class DocksReportsController {
    private final DocksEmailSignIn signIn;
    private final DocksReports reports;

    public DocksReportsController(DocksEmailSignIn signIn, DocksReports reports) {
        this.signIn = signIn;
        this.reports = reports;
    }

    public record Preference(@NotNull Boolean enabled) {}
    public record Summary(@NotNull UUID installationId, @NotNull OffsetDateTime checkedAt,
                          Integer cpuPercent, Integer memoryPercent) {}

    @GetMapping
    public ResponseEntity<Object> list(@RequestHeader(name = "Authorization", required = false) String token) {
        return signIn.account(token).map(account -> response(200, reports.read(account)))
                .orElseGet(DocksReportsController::unauthorised);
    }

    @DeleteMapping
    public ResponseEntity<Object> clear(@RequestHeader(name = "Authorization", required = false) String token) {
        return signIn.account(token).map(account -> {
            reports.clear(account);
            return response(204, null);
        }).orElseGet(DocksReportsController::unauthorised);
    }

    @PutMapping("/preference")
    public ResponseEntity<Object> preference(@RequestHeader(name = "Authorization", required = false) String token,
            @Valid @RequestBody Preference preference) {
        return signIn.account(token).map(account -> {
            reports.setEnabled(account, preference.enabled());
            return response(204, null);
        }).orElseGet(DocksReportsController::unauthorised);
    }

    @PutMapping("/latest")
    public ResponseEntity<Object> upload(@RequestHeader(name = "Authorization", required = false) String token,
            @Valid @RequestBody Summary summary) {
        return signIn.account(token).map(account -> switch (reports.upload(account, summary.installationId(),
                summary.checkedAt(), summary.cpuPercent(), summary.memoryPercent())) {
            case SAVED, UNCHANGED -> response(204, null);
            case DISABLED -> response(409, Map.of("message", "Report sharing is turned off."));
            case DEVICE_UNKNOWN -> response(404, Map.of("message", "This computer is not enrolled on your account."));
            case INVALID -> response(422, Map.of("message", "Run a fresh check with a CPU or memory reading."));
        }).orElseGet(DocksReportsController::unauthorised);
    }

    private static ResponseEntity<Object> unauthorised() {
        return response(401, Map.of("message", "Sign in to Crystal Docks."));
    }

    private static ResponseEntity<Object> response(int status, Object body) {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(body);
    }
}
