package com.crystalpower.website.api;

import com.crystalpower.website.security.AttemptLimiter;
import com.crystalpower.website.service.DocksEmailSignIn;
import com.crystalpower.website.service.DocksHouseholds;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import java.util.function.Consumer;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/docks/household")
public class DocksHouseholdsController {
    private final DocksEmailSignIn auth;
    private final DocksHouseholds households;
    private final AttemptLimiter limiter;

    public DocksHouseholdsController(DocksEmailSignIn auth, DocksHouseholds households, AttemptLimiter limiter) {
        this.auth = auth;
        this.households = households;
        this.limiter = limiter;
    }

    public record Invite(@NotBlank @Email @Size(max = 254) String email) {}

    @GetMapping
    public ResponseEntity<DocksHouseholds.View> view(@RequestHeader(name = "Authorization", required = false) String token) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(households.view(account(token)));
    }

    @PostMapping("/invitations")
    public ResponseEntity<Void> invite(@Valid @RequestBody Invite body,
            @RequestHeader(name = "Authorization", required = false) String token) {
        return change(token, account -> households.invite(account, body.email()));
    }

    @PostMapping("/invitations/{id}/accept")
    public ResponseEntity<Void> accept(@PathVariable UUID id,
            @RequestHeader(name = "Authorization", required = false) String token) {
        return change(token, account -> households.accept(account, id));
    }

    @DeleteMapping("/invitations/{id}")
    public ResponseEntity<Void> remove(@PathVariable UUID id,
            @RequestHeader(name = "Authorization", required = false) String token) {
        return change(token, account -> households.remove(account, id));
    }

    private ResponseEntity<Void> change(String token, Consumer<UUID> action) {
        var account = account(token);
        limiter.check("docks-household:" + account, 30, 900);
        action.accept(account);
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }

    private UUID account(String token) {
        return auth.account(token).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to Crystal Docks."));
    }
}
