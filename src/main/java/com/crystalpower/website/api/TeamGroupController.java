package com.crystalpower.website.api;

import com.crystalpower.website.service.TeamGroupService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/team/groups")
public class TeamGroupController {
    public record Input(@NotBlank @Size(max=80) String name,@NotNull @Size(max=500) String description,@Min(0) int expectedVersion,boolean archived,@NotNull @Size(max=500) List<@NotNull UUID> members) {}
    private final TeamGroupService groups;
    public TeamGroupController(TeamGroupService groups){this.groups=groups;}
    @GetMapping public Object list(Authentication auth){return groups.list(auth);}
    @GetMapping("/{id}") public Object detail(Authentication auth,@PathVariable UUID id){return groups.detail(auth,id);}
    @GetMapping("/eligible-members") public Object eligible(Authentication auth){return groups.eligible(auth);}
    @PostMapping public Object create(Authentication auth,@Valid @RequestBody Input input){return groups.save(auth,null,0,input.name(),input.description(),false,input.members());}
    @PatchMapping("/{id}") public Object update(Authentication auth,@PathVariable UUID id,@Valid @RequestBody Input input){return groups.save(auth,id,input.expectedVersion(),input.name(),input.description(),input.archived(),input.members());}
}
