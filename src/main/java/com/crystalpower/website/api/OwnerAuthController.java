package com.crystalpower.website.api;

import com.crystalpower.website.repository.OwnerRepository.Owner;
import com.crystalpower.website.security.AttemptLimiter;
import com.crystalpower.website.security.OwnerPrincipal;
import com.crystalpower.website.service.OwnerService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.io.Serializable;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;
import static com.crystalpower.website.security.AuthenticationSessions.*;

@RestController
@RequestMapping("/api/admin/auth")
public class OwnerAuthController {
    private static final String PENDING = "crystal.pending-owner";
    private record Pending(UUID id, int version, long expiresAt) implements Serializable {}
    private record Challenge(HttpSession session, Pending pending) {}
    public record Login(@Email @NotBlank @Size(max = 254) String email, @NotBlank @Size(max = 256) String password) {}
    public record Setup(@NotBlank @Size(max = 256) String token, @Email @NotBlank @Size(max = 254) String email, @NotBlank @Size(max = 256) String password) {}
    public record Code(@NotBlank @Size(max = 64) String code) {}

    private final OwnerService owners;
    private final AttemptLimiter limiter;
    private final HttpSessionSecurityContextRepository contexts;
    private final HttpSessionCsrfTokenRepository csrf;
    public OwnerAuthController(OwnerService owners, AttemptLimiter limiter, HttpSessionSecurityContextRepository contexts, HttpSessionCsrfTokenRepository csrf) {
        this.owners = owners; this.limiter = limiter; this.contexts = contexts; this.csrf = csrf;
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) { return Map.of("token", token.getToken(), "headerName", token.getHeaderName()); }

    @GetMapping("/session")
    public Map<String, Object> session(Authentication authentication, HttpServletRequest request) {
        if (authentication != null && authentication.getPrincipal() instanceof OwnerPrincipal owner) {
            return Map.of("authenticated", true, "email", owner.email(), "mfaRequired", false, "enrolmentRequired", false, "setupAvailable", false);
        }
        Pending pending = pendingOrNull(request);
        boolean enrolment = pending != null && !owners.owner(pending.id()).mfaEnabled();
        return Map.of("authenticated", false, "mfaRequired", pending != null, "enrolmentRequired", enrolment, "setupAvailable", owners.setupAvailable());
    }

    @PostMapping("/setup")
    public Map<String, Boolean> setup(@Valid @RequestBody Setup input, HttpServletRequest request, HttpServletResponse response) {
        limiter.check("setup:" + request.getRemoteAddr(), 5, 900);
        var previous = request.getSession(true);
        begin(owners.setup(input.token(), input.email(), input.password()), request, previous, response);
        return Map.of("enrolmentRequired", true, "mfaRequired", true);
    }

    @PostMapping("/login")
    public Map<String, Boolean> login(@Valid @RequestBody Login input, HttpServletRequest request, HttpServletResponse response) {
        limiter.check("login-ip:" + request.getRemoteAddr(), 30, 900);
        limiter.check("login-account:" + DigestUtils.sha256Hex(OwnerService.normaliseEmail(input.email())), 10, 900);
        var previous = request.getSession(true);
        Owner owner = owners.password(input.email(), input.password());
        begin(owner, request, previous, response);
        return Map.of("enrolmentRequired", !owner.mfaEnabled(), "mfaRequired", true);
    }

    @GetMapping("/enrolment")
    public Map<String, String> enrolment(HttpServletRequest request) {
        Challenge challenge = challenge(request); Pending pending = challenge.pending();
        Owner owner = owners.owner(pending.id());
        String secret = owners.enrolmentSecret(pending.id(), pending.version(), pending.expiresAt());
        String label = URLEncoder.encode("Crystal Powers:" + owner.email(), StandardCharsets.UTF_8).replace("+", "%20");
        return inChallenge(request, challenge, () -> Map.of("secret", secret, "uri", "otpauth://totp/" + label + "?secret=" + secret + "&issuer=Crystal%20Powers&algorithm=SHA1&digits=6&period=30"));
    }

    @PostMapping("/verify")
    public OwnerService.Verification verify(@Valid @RequestBody Code code, HttpServletRequest request, HttpServletResponse response) {
        Challenge challenge = challenge(request); Pending pending = challenge.pending();
        limiter.check("mfa:" + pending.id(), 10, 300);
        var verified = owners.verify(pending.id(), pending.version(), code.code().trim(), pending.expiresAt());
        return inChallenge(request, challenge, () -> {
            challenge.session().removeAttribute(PENDING); request.changeSessionId();
            var context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(verified.principal(), null, List.of(new SimpleGrantedAuthority("ROLE_OWNER"))));
            var bound = existingSessionRequest(request, challenge.session());
            contexts.saveContext(context, bound, response); csrf.saveToken(null, bound, response);
            challenge.session().setAttribute("crystal.authenticated-at", Instant.now().getEpochSecond());
            SecurityContextHolder.setContext(context);
            return verified;
        });
    }

    @PostMapping("/logout")
    public Map<String, Boolean> logout(HttpServletRequest request, HttpServletResponse response) {
        endSession(request);
        return Map.of("success", true);
    }

    private void begin(Owner owner, HttpServletRequest request, HttpSession previous, HttpServletResponse response) {
        inSession(request, previous, () -> {
            SecurityContextHolder.clearContext(); previous.invalidate();
            request.getSession(true).setAttribute(PENDING, new Pending(owner.id(), owner.credentialsVersion(), Instant.now().getEpochSecond() + 300));
            csrf.saveToken(null, request, response); return null;
        });
    }

    private Challenge challenge(HttpServletRequest request) {
        Challenge value = challengeOrNull(request);
        if (value == null) throw ended();
        return value;
    }
    private Pending pendingOrNull(HttpServletRequest request) {
        Challenge value = challengeOrNull(request); return value == null ? null : value.pending();
    }
    private Challenge challengeOrNull(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return null;
        try {
            Object stored = inSession(request, session, () -> session.getAttribute(PENDING));
            if (!(stored instanceof Pending value)) return null;
            if (value.expiresAt() > Instant.now().getEpochSecond()) try {
                if (owners.owner(value.id()).credentialsVersion() == value.version()) {
                    var challenge = new Challenge(session, value);
                    return inChallenge(request, challenge, () -> challenge);
                }
            } catch (ResponseStatusException changed) { if (changed.getStatusCode().value() != 401) throw changed; }
            inSession(request, session, () -> { if (value.equals(session.getAttribute(PENDING))) session.removeAttribute(PENDING); return null; });
        } catch (ResponseStatusException expired) { if (expired.getStatusCode().value() != 401) throw expired; }
        return null;
    }
    private <T> T inChallenge(HttpServletRequest request, Challenge challenge, Supplier<T> action) {
        return inSession(request, challenge.session(), () -> {
            if (!challenge.pending().equals(challenge.session().getAttribute(PENDING)) || challenge.pending().expiresAt() <= Instant.now().getEpochSecond()) throw ended();
            return action.get();
        });
    }
}
