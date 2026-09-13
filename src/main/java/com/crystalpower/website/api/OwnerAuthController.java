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

@RestController
@RequestMapping("/api/admin/auth")
public class OwnerAuthController {
    private static final String PENDING = "crystal.pending-owner";
    private record Pending(UUID id, int version, long expiresAt) implements Serializable {}
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
        begin(owners.setup(input.token(), input.email(), input.password()), request, response);
        return Map.of("enrolmentRequired", true, "mfaRequired", true);
    }

    @PostMapping("/login")
    public Map<String, Boolean> login(@Valid @RequestBody Login input, HttpServletRequest request, HttpServletResponse response) {
        limiter.check("login-ip:" + request.getRemoteAddr(), 30, 900);
        limiter.check("login-account:" + DigestUtils.sha256Hex(OwnerService.normaliseEmail(input.email())), 10, 900);
        Owner owner = owners.password(input.email(), input.password());
        begin(owner, request, response);
        return Map.of("enrolmentRequired", !owner.mfaEnabled(), "mfaRequired", true);
    }

    @GetMapping("/enrolment")
    public Map<String, String> enrolment(HttpServletRequest request) {
        Pending pending = pending(request);
        Owner owner = owners.owner(pending.id());
        String secret = owners.enrolmentSecret(pending.id());
        String label = URLEncoder.encode("Crystal Powers:" + owner.email(), StandardCharsets.UTF_8).replace("+", "%20");
        return Map.of("secret", secret, "uri", "otpauth://totp/" + label + "?secret=" + secret + "&issuer=Crystal%20Powers&algorithm=SHA1&digits=6&period=30");
    }

    @PostMapping("/verify")
    public OwnerService.Verification verify(@Valid @RequestBody Code code, HttpServletRequest request, HttpServletResponse response) {
        Pending pending = pending(request);
        limiter.check("mfa:" + pending.id(), 10, 300);
        var verified = owners.verify(pending.id(), pending.version(), code.code().trim());
        request.getSession().removeAttribute(PENDING);
        request.changeSessionId();
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(verified.principal(), null, List.of(new SimpleGrantedAuthority("ROLE_OWNER"))));
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context, request, response);
        csrf.saveToken(null, request, response);
        request.getSession().setAttribute("crystal.authenticated-at", Instant.now().getEpochSecond());
        return verified;
    }

    @PostMapping("/logout")
    public Map<String, Boolean> logout(HttpServletRequest request, HttpServletResponse response) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
        return Map.of("success", true);
    }

    private void begin(Owner owner, HttpServletRequest request, HttpServletResponse response) {
        SecurityContextHolder.clearContext();
        HttpSession previous = request.getSession(false);
        if (previous != null) previous.invalidate();
        request.getSession(true).setAttribute(PENDING, new Pending(owner.id(), owner.credentialsVersion(), Instant.now().getEpochSecond() + 300));
        csrf.saveToken(null, request, response);
    }

    private Pending pending(HttpServletRequest request) {
        Pending value = pendingOrNull(request);
        if (value == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in again to continue.");
        return value;
    }
    private Pending pendingOrNull(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || !(session.getAttribute(PENDING) instanceof Pending value)) return null;
        if (value.expiresAt() <= Instant.now().getEpochSecond() || owners.owner(value.id()).credentialsVersion() != value.version()) { session.removeAttribute(PENDING); return null; }
        return value;
    }
}
