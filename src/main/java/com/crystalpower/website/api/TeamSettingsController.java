package com.crystalpower.website.api;

import com.crystalpower.website.service.TeamSettingsService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/team/settings")
public class TeamSettingsController {
    public record Branding(@Min(0) int expectedVersion,@NotBlank @Size(max=120) String name,@NotNull @Size(max=240) String tagline) {}
    public record Personal(@Min(0) int expectedVersion,@NotBlank @Size(max=120) String displayName,boolean compact,boolean unreadBadges,boolean mentionAlerts) {}
    public record Channel(@Min(0) int expectedVersion,boolean unreadBadges,boolean mentionAlerts,boolean favourite) {}
    private final TeamSettingsService settings;
    public TeamSettingsController(TeamSettingsService settings) { this.settings=settings; }
    @GetMapping public Object view(Authentication auth) { return settings.view(auth); }
    @GetMapping("/channels/{id}") public Object channel(Authentication auth,@PathVariable java.util.UUID id) { return settings.channel(auth,id); }
    @PatchMapping("/channels/{id}") public Object channel(Authentication auth,@PathVariable java.util.UUID id,@Valid @RequestBody Channel input) { return settings.channel(auth,id,input.expectedVersion(),input.unreadBadges(),input.mentionAlerts(),input.favourite()); }
    @PatchMapping("/workspace") public Object branding(Authentication auth,@Valid @RequestBody Branding input) { return settings.branding(auth,input.expectedVersion(),input.name(),input.tagline()); }
    @PatchMapping("/personal") public Object personal(Authentication auth,@Valid @RequestBody Personal input) { return settings.preferences(auth,input.expectedVersion(),input.displayName(),input.compact(),input.unreadBadges(),input.mentionAlerts()); }
}
