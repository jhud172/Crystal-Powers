package com.crystalpower.website.api;

import com.crystalpower.website.security.*;
import com.crystalpower.website.service.TeamRoleProfileService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/team/roles")
public class TeamRoleProfileController {
    public record Create(@NotBlank @Size(max=80) String name,@NotNull TeamRole baseRole,@NotNull @Size(max=50) Set<@NotNull TeamPermission> permissions) {}
    public record Update(@Min(0) int expectedVersion,@NotBlank @Size(max=80) String name,@NotNull @Size(max=50) Set<@NotNull TeamPermission> permissions,boolean archived) {}
    public record Assign(@Min(0) int expectedVersion,UUID profileId) {}
    private final TeamRoleProfileService roles;
    public TeamRoleProfileController(TeamRoleProfileService roles) { this.roles=roles; }
    @GetMapping public Object overview(Authentication auth) { return roles.overview(auth); }
    @PostMapping public Object create(Authentication auth,@Valid @RequestBody Create input) { return roles.create(auth,input.name(),input.baseRole(),input.permissions()); }
    @PatchMapping("/{id}") public Object update(Authentication auth,@PathVariable UUID id,@Valid @RequestBody Update input) { return roles.update(auth,id,input.expectedVersion(),input.name(),input.permissions(),input.archived()); }
    @PatchMapping("/members/{id}") public Object assign(Authentication auth,@PathVariable UUID id,@Valid @RequestBody Assign input) { return roles.assign(auth,id,input.expectedVersion(),input.profileId()); }
}
