package com.crystalpower.website.api;

import com.crystalpower.website.security.AttemptLimiter;
import com.crystalpower.website.security.OwnerPrincipal;
import com.crystalpower.website.service.DocksReports;
import com.crystalpower.website.service.DocksDiagnosticLogs;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/docks/support-reports")
public class OwnerDocksSupportController {
    private final DocksReports reports;
    private final DocksDiagnosticLogs logs;
    private final AttemptLimiter limiter;

    public OwnerDocksSupportController(DocksReports reports, DocksDiagnosticLogs logs, AttemptLimiter limiter) {
        this.reports = reports;
        this.logs = logs;
        this.limiter = limiter;
    }

    public record Reference(@NotNull UUID reference) {}

    @PostMapping
    public ResponseEntity<Object> open(@AuthenticationPrincipal OwnerPrincipal owner, @Valid @RequestBody Reference body) {
        limiter.check("docks-support:" + owner.id(), 30, 900);
        return reports.openForSupport(owner.id(), body.reference()).<ResponseEntity<Object>>map(result ->
                ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(result))
                .or(() -> logs.open(owner.id(), body.reference()).map(result -> ResponseEntity.ok()
                        .cacheControl(CacheControl.noStore()).body(Map.of("expiresAt", result.expiresAt(), "diagnosticLog", result))))
                .orElseGet(() -> ResponseEntity.status(404).cacheControl(CacheControl.noStore())
                        .body(Map.of("message", "No active support access was found for that reference.")));
    }
}
