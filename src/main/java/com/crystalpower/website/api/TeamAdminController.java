package com.crystalpower.website.api;


import com.crystalpower.website.security.TeamRole;

import com.crystalpower.website.service.TeamMemberService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;

/** Existing owner security protects provisioning; account holders cannot choose elevated roles. */
@RestController
@RequestMapping("/api/admin/team")
public class TeamAdminController {
    public record Create(@NotBlank @Email @Size(max=254) String email, @NotBlank @Size(max=120) String displayName, @NotNull TeamRole role) {}
    public record Access(@Min(0) int expectedVersion, @NotNull TeamRole role, @NotBlank String state) {}
    private final TeamMemberService teams;
    public TeamAdminController(TeamMemberService teams) { this.teams = teams; }
    @GetMapping("/members") public Object members(Authentication authentication) { return teams.members(authentication); }
    @GetMapping("/roles") public Object roles() { return Arrays.stream(TeamRole.values()).map(role -> Map.of("name", role.name(), "permissions", role.permissions())).toList(); }
    @PostMapping("/members") public Object create(Authentication authentication, @Valid @RequestBody Create request) { return teams.create(authentication, request.email(), request.displayName(), request.role()); }
    @PatchMapping("/members/{id}") public Object access(Authentication authentication, @PathVariable UUID id, @Valid @RequestBody Access request) { return teams.change(authentication, id, request.expectedVersion(), request.role(), request.state()); }
}
