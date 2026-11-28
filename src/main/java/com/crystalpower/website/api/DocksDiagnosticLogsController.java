package com.crystalpower.website.api;

import com.crystalpower.website.security.AttemptLimiter;
import com.crystalpower.website.service.DocksDiagnosticLogs;
import com.crystalpower.website.service.DocksEmailSignIn;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/docks/diagnostic-log")
public class DocksDiagnosticLogsController {
    private final DocksEmailSignIn auth;
    private final DocksDiagnosticLogs logs;
    private final AttemptLimiter limiter;

    public DocksDiagnosticLogsController(DocksEmailSignIn auth, DocksDiagnosticLogs logs, AttemptLimiter limiter) {
        this.auth = auth;
        this.logs = logs;
        this.limiter = limiter;
    }

    @GetMapping
    public ResponseEntity<Object> state(@RequestHeader(name = "Authorization", required = false) String token) {
        return auth.account(token).map(account -> response(200, logs.state(account)))
                .orElseGet(DocksDiagnosticLogsController::unauthorised);
    }

    @PostMapping
    public ResponseEntity<Object> share(@RequestHeader(name = "Authorization", required = false) String token,
                                        @Valid @RequestBody DocksDiagnosticLogs.Request request) {
        return auth.account(token).map(account -> {
            limiter.check("docks-diagnostic-log:" + account, 8, 900);
            return logs.share(account, request).map(grant -> response(200, grant))
                    .orElseGet(() -> response(409, Map.of("message", "Run a recent check on an enrolled computer.")));
        }).orElseGet(DocksDiagnosticLogsController::unauthorised);
    }

    @DeleteMapping
    public ResponseEntity<Object> revoke(@RequestHeader(name = "Authorization", required = false) String token) {
        return auth.account(token).map(account -> {
            logs.revoke(account);
            return response(204, null);
        }).orElseGet(DocksDiagnosticLogsController::unauthorised);
    }

    @ExceptionHandler({ MethodArgumentNotValidException.class, HttpMessageNotReadableException.class })
    public ResponseEntity<Object> invalidReadings() {
        return response(400, Map.of("message", "Approve sharing and provide a valid diagnostic log."));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Object> limited(ResponseStatusException error) {
        return response(error.getStatusCode().value(), Map.of("message", error.getReason()));
    }

    private static ResponseEntity<Object> unauthorised() {
        return response(401, Map.of("message", "Sign in to Crystal Docks."));
    }

    private static ResponseEntity<Object> response(int status, Object body) {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(body);
    }
}
