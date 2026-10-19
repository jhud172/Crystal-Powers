package com.crystalpower.website.api;

import com.crystalpower.website.security.AttemptLimiter;
import com.crystalpower.website.security.TeamPrincipal;
import com.crystalpower.website.security.OwnerPrincipal;
import com.crystalpower.website.security.TeamRole;
import com.crystalpower.website.service.TeamAuthenticationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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
import java.util.function.Supplier;
import static com.crystalpower.website.security.AuthenticationSessions.*;

@RestController
@RequestMapping("/api/team/auth")
public class TeamAuthController {
    public record Login(@NotBlank @Email @Size(max=254) String email, @NotBlank @Size(max=256) String password) {}
    public record Code(@NotBlank @Pattern(regexp="[0-9]{6}") String code) {}
    private record Pending(UUID id, int version, long expiresAt) implements Serializable {}
    private record Challenge(HttpSession session, Pending pending) {}
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
        var session = request.getSession(false);
        if (session != null) try {
            Object value = inSession(request, session, () -> session.getAttribute(PENDING));
            if (value instanceof Pending pending) {
                if (pending.expiresAt() > Instant.now().getEpochSecond()) try {
                    var current = teams.current(pending.id(), pending.version(), false);
                    return inChallenge(request, new Challenge(session, pending), () -> Map.of("authenticated", false, "mfaRequired", true, "enrolmentRequired", !current.mfaEnabled()));
                } catch (ResponseStatusException changed) { if (changed.getStatusCode().value() != 401) throw changed; }
                inSession(request, session, () -> {
                    if (pending.equals(session.getAttribute(PENDING))) session.removeAttribute(PENDING);
                    return null;
                });
            }
        } catch (ResponseStatusException ended) {
            if (ended.getStatusCode().value() != 401) throw ended;
        }
        return Map.of("authenticated", false, "mfaRequired", false, "enrolmentRequired", false);
    }
    @PostMapping("/login") public Object login(@Valid @RequestBody Login input, HttpServletRequest request, HttpServletResponse response) {
        limiter.check("team-password:" + request.getRemoteAddr(), 10, 900);
        var previous = request.getSession(true);
        var member = teams.password(input.email(), input.password()).member();
        return inSession(request, previous, () -> {
            previous.invalidate(); SecurityContextHolder.clearContext();
            request.getSession(true).setAttribute(PENDING, new Pending(member.id(), member.credentialsVersion(), Instant.now().getEpochSecond() + 300));
            csrf.saveToken(null, request, response);
            return session(null, request);
        });
    }
    @PostMapping("/enrolment") public Object enrolment(HttpServletRequest request) {
        Challenge challenge = challenge(request); Pending pending = challenge.pending();
        String secret = teams.setup(pending.id(), pending.version(), pending.expiresAt());
        return inChallenge(request, challenge, () -> Map.of("secret", secret));
    }
    @PostMapping("/verify") public Object verify(@Valid @RequestBody Code input, HttpServletRequest request, HttpServletResponse response) {
        limiter.check("team-code:" + request.getRemoteAddr(), 10, 900);
        Challenge challenge = challenge(request); Pending pending = challenge.pending();
        TeamPrincipal principal = teams.verify(pending.id(), pending.version(), input.code(), pending.expiresAt());
        return inChallenge(request, challenge, () -> {
            challenge.session().removeAttribute(PENDING); request.changeSessionId();
            var context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(principal, null, List.of(new SimpleGrantedAuthority("ROLE_TEAM"))));
            // Keep the configured repository, but never let a late result allocate another session.
            var bound = existingSessionRequest(request, challenge.session());
            contexts.saveContext(context, bound, response); csrf.saveToken(null, bound, response);
            SecurityContextHolder.setContext(context);
            return session(context.getAuthentication(), request);
        });
    }
    @PostMapping("/logout") public Object logout(HttpServletRequest request) {
        endSession(request); return Map.of("success", true);
    }
    private Challenge challenge(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session == null) throw ended();
        Pending pending = inSession(request, session, () -> {
            Object value = session.getAttribute(PENDING);
            if (!(value instanceof Pending current) || current.expiresAt() <= Instant.now().getEpochSecond()) throw ended();
            return current;
        });
        teams.current(pending.id(), pending.version(), false);
        return new Challenge(session, pending);
    }
    private <T> T inChallenge(HttpServletRequest request, Challenge challenge, Supplier<T> action) {
        return inSession(request, challenge.session(), () -> {
            if (!challenge.pending().equals(challenge.session().getAttribute(PENDING)) || challenge.pending().expiresAt() <= Instant.now().getEpochSecond()) throw ended();
            return action.get();
        });
    }
}
