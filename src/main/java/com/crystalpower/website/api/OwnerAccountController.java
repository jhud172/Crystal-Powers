package com.crystalpower.website.api;

import com.crystalpower.website.security.AttemptLimiter;
import com.crystalpower.website.security.OwnerPrincipal;
import com.crystalpower.website.service.OwnerAccountService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.io.Serializable;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/account")
public class OwnerAccountController {
    public record Proof(@NotBlank @Size(max = 256) String password, @NotBlank @Size(max = 64) String code) {}
    public record Password(@NotBlank @Size(max = 256) String password, @NotBlank @Size(max = 64) String code, @NotBlank @Size(max = 256) String nextPassword) {}
    public record Code(@NotBlank @Size(max = 6) String code) {}
    private record Pending(UUID owner, int version, String secret, long expires) implements Serializable {}
    private static final String PENDING = "crystal.new-authenticator";
    private final OwnerAccountService accounts;
    private final AttemptLimiter limiter;
    public OwnerAccountController(OwnerAccountService accounts, AttemptLimiter limiter) { this.accounts = accounts; this.limiter = limiter; }
    @PostMapping("/password")
    public Map<String, String> password(@AuthenticationPrincipal OwnerPrincipal owner, @Valid @RequestBody Password input, HttpServletRequest request) {
        limit(owner); accounts.changePassword(owner, input.password(), input.code(), input.nextPassword()); signOut(request);
        return Map.of("message", "Password changed. Sign in again with your new password.");
    }
    @PostMapping("/recovery-codes")
    public Map<String, List<String>> codes(@AuthenticationPrincipal OwnerPrincipal owner, @Valid @RequestBody Proof input, HttpServletRequest request) {
        limit(owner); var codes = accounts.replaceRecoveryCodes(owner, input.password(), input.code()); signOut(request);
        return Map.of("recoveryCodes", codes);
    }
    @PostMapping("/authenticator")
    public Map<String, String> begin(@AuthenticationPrincipal OwnerPrincipal owner, @Valid @RequestBody Proof input, HttpServletRequest request) {
        limit(owner); String secret = accounts.beginAuthenticator(owner, input.password(), input.code());
        request.getSession().setAttribute(PENDING, new Pending(owner.id(), owner.credentialsVersion(), secret, Instant.now().getEpochSecond() + 300));
        return Map.of("secret", secret);
    }
    @PostMapping("/authenticator/confirm")
    public Map<String, List<String>> confirm(@AuthenticationPrincipal OwnerPrincipal owner, @Valid @RequestBody Code code, HttpServletRequest request) {
        limit(owner);
        if (!(request.getSession().getAttribute(PENDING) instanceof Pending pending) || !pending.owner().equals(owner.id()) || pending.version() != owner.credentialsVersion() || pending.expires() <= Instant.now().getEpochSecond()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Authenticator setup has expired. Start again.");
        }
        var codes = accounts.confirmAuthenticator(owner, pending.secret(), code.code()); signOut(request);
        return Map.of("recoveryCodes", codes);
    }
    private void limit(OwnerPrincipal owner) { limiter.check("account-security:" + owner.id(), 10, 900); }
    private void signOut(HttpServletRequest request) { request.getSession().invalidate(); SecurityContextHolder.clearContext(); }
}
