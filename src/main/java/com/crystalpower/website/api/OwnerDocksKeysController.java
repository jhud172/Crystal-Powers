package com.crystalpower.website.api;

import com.crystalpower.website.security.OwnerPrincipal;
import com.crystalpower.website.service.DocksAccessKeys;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/docks/access-keys")
public class OwnerDocksKeysController {
    private final DocksAccessKeys keys;

    public OwnerDocksKeysController(DocksAccessKeys keys) { this.keys = keys; }

    public record Issue(@Min(1) @Max(3650) int durationDays, int deviceLimit) {}
    public record Extension(@Min(1) @Max(3650) int days) {}
    public record StateChange(@NotNull DocksAccessKeys.State state) {}

    @GetMapping
    public ResponseEntity<List<DocksAccessKeys.Key>> recent() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(keys.recent());
    }

    @PostMapping
    public ResponseEntity<DocksAccessKeys.Issued> issue(@AuthenticationPrincipal OwnerPrincipal owner,
            @Valid @RequestBody Issue request) {
        if (request.deviceLimit() != 1 && request.deviceLimit() != 5)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a one-device or five-device key.");
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore())
                .body(keys.issue(owner.id(), request.durationDays(), request.deviceLimit()));
    }

    @PostMapping("/{id}/state")
    public ResponseEntity<Void> setState(@AuthenticationPrincipal OwnerPrincipal owner, @PathVariable UUID id,
            @Valid @RequestBody StateChange request) {
        if (!keys.setState(id, owner.id(), request.state())) throw unavailable();
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }

    @PostMapping("/{id}/extend")
    public ResponseEntity<Void> extend(@AuthenticationPrincipal OwnerPrincipal owner, @PathVariable UUID id,
            @Valid @RequestBody Extension request) {
        if (!keys.extend(id, owner.id(), request.days())) throw unavailable();
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }

    private static ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "That key cannot be changed.");
    }
}
