package com.crystalpower.website.api;

import com.crystalpower.website.security.AttemptLimiter;
import com.crystalpower.website.security.TeamPrincipal;
import com.crystalpower.website.security.OwnerPrincipal;
import com.crystalpower.website.security.TeamRole;
import com.crystalpower.website.service.TeamAuthenticationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.io.Serializable;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/team/auth")
public class TeamAuthController {
    public record Login(@NotBlank @Email @Size(max=254) String email, @NotBlank @Size(max=256) String password) {}
    public record Code(@NotBlank @Pattern(regexp="[0-9]{6}") String code) {}
    private record Pending(UUID id, int version, long expiresAt) implements Serializable {}
    private static final String PENDING = "crystal.team.pending";
    private final TeamAuthenticationService teams;
    private final AttemptLimiter limiter;
    private final com.crystalpower.website.service.TeamAccessService access;
    private final HttpSessionSecurityContextRepository contexts;
    private final HttpSessionCsrfTokenRepository csrf;
    public TeamAuthController(TeamAuthenticationService teams, AttemptLimiter limiter, HttpSessionSecurityContextRepository contexts, HttpSessionCsrfTokenRepository csrf, com.crystalpower.website.service.TeamAccessService access) { this.access = access; this.teams = teams; this.limiter = limiter; this.contexts = contexts; this.csrf = csrf; }
    @GetMapping("/session") public Object session(Authentication authentication, HttpServletRequest request) {
        if (authentication != null && authentication.getPrincipal() instanceof OwnerPrincipal) return Map.of("authenticated", true, "member", Map.of("displayName", "James", "role", "OWNER"), "permissions", TeamRole.ADMIN.permissions());
        if (authentication != null && authentication.getPrincipal() instanceof TeamPrincipal principal) return Map.of("authenticated", true, "member", principal, "permissions", access.resolve(authentication).permissions());
        var session = request.getSession(false); Object value = session == null ? null : session.getAttribute(PENDING);
        if (value instanceof Pending pending && pending.expiresAt() > Instant.now().getEpochSecond()) {
            var current = teams.current(pending.id(), pending.version(), false);
            return Map.of("authenticated", false, "mfaRequired", true, "enrolmentRequired", !current.mfaEnabled());
        }
        return Map.of("authenticated", false, "mfaRequired", false, "enrolmentRequired", false);
    }
    @PostMapping("/login") public Object login(@Valid @RequestBody Login input, HttpServletRequest request, HttpServletResponse response) {
        limiter.check("team-password:" + request.getRemoteAddr(), 10, 900);
        var member = teams.password(input.email(), input.password()).member();
        var previous = request.getSession(false); if (previous != null) previous.invalidate(); SecurityContextHolder.clearContext();
        request.getSession(true).setAttribute(PENDING, new Pending(member.id(), member.credentialsVersion(), Instant.now().getEpochSecond() + 300));
        csrf.saveToken(null, request, response);
        return session(null, request);
    }
    @PostMapping("/enrolment") public Object enrolment(HttpServletRequest request) { Pending pending = pending(request); return Map.of("secret", teams.setup(pending.id(), pending.version())); }
    @PostMapping("/verify") public Object verify(@Valid @RequestBody Code input, HttpServletRequest request, HttpServletResponse response) {
        limiter.check("team-code:" + request.getRemoteAddr(), 10, 900);
        Pending pending = pending(request); TeamPrincipal principal = teams.verify(pending.id(), pending.version(), input.code());
        request.getSession().removeAttribute(PENDING); request.changeSessionId();
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(principal, null, List.of(new SimpleGrantedAuthority("ROLE_TEAM"))));
        SecurityContextHolder.setContext(context); contexts.saveContext(context, request, response); csrf.saveToken(null, request, response);
        return session(context.getAuthentication(), request);
    }
    @PostMapping("/logout") public Object logout(HttpServletRequest request) {
        var session = request.getSession(false); if (session != null) session.invalidate(); SecurityContextHolder.clearContext(); return Map.of("success", true);
    }
    private Pending pending(HttpServletRequest request) {
        var session = request.getSession(false); Object value = session == null ? null : session.getAttribute(PENDING);
        if (!(value instanceof Pending pending) || pending.expiresAt() <= Instant.now().getEpochSecond()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in again to continue.");
        teams.current(pending.id(), pending.version(), false); return pending;
    }
}
