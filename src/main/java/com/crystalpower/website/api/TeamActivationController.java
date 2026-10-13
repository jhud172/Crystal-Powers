package com.crystalpower.website.api;

import com.crystalpower.website.security.AttemptLimiter;
import com.crystalpower.website.service.TeamIdentityService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/team/auth")
public class TeamActivationController {
    public record Activation(@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{43}") String token, @NotBlank @Size(min=12,max=72) String password) {}
    private final TeamIdentityService teams;
    private final AttemptLimiter limiter;
    public TeamActivationController(TeamIdentityService teams, AttemptLimiter limiter) { this.teams = teams; this.limiter = limiter; }
    @GetMapping("/csrf") public Object csrf(CsrfToken token) { return Map.of("token", token.getToken(), "headerName", token.getHeaderName()); }
    @PostMapping("/activate") public Object activate(@Valid @RequestBody Activation request, HttpServletRequest servlet) {
        limiter.check("team-activate:" + servlet.getRemoteAddr(), 10, 900);
        teams.activate(request.token(), request.password());
        return Map.of("success", true, "message", "Your account is activated. Sign in to continue.");
    }
}
