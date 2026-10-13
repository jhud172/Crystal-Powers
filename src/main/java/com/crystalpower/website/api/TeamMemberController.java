package com.crystalpower.website.api;

import com.crystalpower.website.service.TeamMemberService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/team/members")
public class TeamMemberController {
    public record Revision(@Min(0) int expectedVersion) {}
    private final TeamMemberService members;
    public TeamMemberController(TeamMemberService members) { this.members = members; }
    @GetMapping("/management") public Object management(Authentication auth){return members.management(auth);}
    @GetMapping public Object list(Authentication authentication) { return members.members(authentication); }
    @PostMapping public Object create(Authentication authentication, @Valid @RequestBody TeamAdminController.Create input) { return members.create(authentication, input.email(), input.displayName(), input.role()); }
    @PatchMapping("/{id}") public Object change(Authentication authentication, @PathVariable UUID id, @Valid @RequestBody TeamAdminController.Access input) { return members.change(authentication, id, input.expectedVersion(), input.role(), input.state()); }
    @PostMapping("/{id}/invitation") public Object reissue(Authentication authentication, @PathVariable UUID id, @Valid @RequestBody Revision input) { return members.reissue(authentication, id, input.expectedVersion()); }
    @PostMapping("/{id}/cancel") public Object cancel(Authentication authentication, @PathVariable UUID id, @Valid @RequestBody Revision input) { members.cancel(authentication, id, input.expectedVersion()); return Map.of("success", true); }
    @PostMapping("/{id}/reset") public Object reset(Authentication authentication, @PathVariable UUID id, @Valid @RequestBody Revision input) { return members.reset(authentication, id, input.expectedVersion()); }
}
