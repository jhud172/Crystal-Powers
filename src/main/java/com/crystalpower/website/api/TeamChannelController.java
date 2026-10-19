package com.crystalpower.website.api;

import com.crystalpower.website.service.TeamChannelService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;
import org.springframework.validation.annotation.Validated;

@RestController
@Validated
@RequestMapping("/api/team")
public class TeamChannelController {
    public record ChannelInput(@NotBlank @Pattern(regexp="[a-z0-9][a-z0-9-]{0,79}") String name, @NotNull @Size(max=500) String description, @NotBlank @Size(max=80) String category, @NotNull @Pattern(regexp="TEAM|SUPPORT|MODERATION|ADMIN") String audience, @Min(0) int expectedVersion, boolean archived,UUID groupId,boolean clearGroup) {}
    public record MessageInput(@NotBlank @Size(max=4000) String body,UUID submissionKey,@Positive Long replyToId,@Size(max=10) java.util.List<@NotBlank @Size(max=50) String> mentionKeys) {}
    public record MessageEdit(@NotNull @Size(max=4000) String body, @Min(0) int expectedVersion, boolean deleted) {}
    public record PinInput(@NotNull Boolean pinned,@Min(0) int expectedVersion) {}
    public record ReadInput(@NotNull @Digits(integer=19,fraction=0) @DecimalMin("0") @DecimalMax("9223372036854775807") java.math.BigDecimal throughId) {}
    private final TeamChannelService service;
    public TeamChannelController(TeamChannelService service) { this.service = service; }
    @GetMapping("/workspace") public Object workspace(Authentication authentication) { return service.workspace(authentication); }
    @GetMapping("/unread") public Object unread(Authentication auth){return service.unread(auth);}
    @PostMapping("/channels/{channel}/read") public Object read(Authentication auth,@PathVariable UUID channel,@Valid @RequestBody ReadInput input){service.markRead(auth,channel,input.throughId().longValueExact());return Map.of("success",true);}
    @GetMapping("/channels/archived") public Object archived(Authentication authentication) { return service.archived(authentication); }
    @PostMapping("/channels") public Object create(Authentication authentication, @Valid @RequestBody ChannelInput input) { return service.create(authentication, input.name(), input.description(), input.category(), input.audience(),input.groupId()); }
    @PatchMapping("/channels/{channel}") public Object change(Authentication authentication, @PathVariable UUID channel, @Valid @RequestBody ChannelInput input) { return service.change(authentication, channel, input.expectedVersion(), input.name(), input.description(), input.category(), input.audience(), input.archived(),input.groupId(),input.clearGroup()); }
    @GetMapping("/channels/{channel}/messages") public Object messages(Authentication authentication, @PathVariable UUID channel, @RequestParam(required=false) @Positive Long before) { return service.messages(authentication, channel, before); }
    @GetMapping("/channels/{channel}/conversation") public Object conversation(Authentication auth,@PathVariable UUID channel,@RequestParam(required=false) @Min(0) Long version,@RequestParam(required=false) @Positive Long floor,@RequestParam(required=false) @Positive Long before){return service.conversation(auth,channel,version,floor,before);}
    @GetMapping("/channels/{channel}/pins") public Object pins(Authentication auth,@PathVariable UUID channel){return service.pins(auth,channel);}
    @PatchMapping("/channels/{channel}/messages/{message}/pin") public Object pin(Authentication auth,@PathVariable UUID channel,@PathVariable long message,@Valid @RequestBody PinInput input){return service.pin(auth,channel,message,input.expectedVersion(),input.pinned());}
    @PostMapping("/channels/{channel}/messages") public Object post(Authentication authentication, @PathVariable UUID channel, @Valid @RequestBody MessageInput input) { return service.post(authentication, channel, input.body(),input.submissionKey(),input.replyToId(),input.mentionKeys()); }
    @PatchMapping("/channels/{channel}/messages/{message}") public Object edit(Authentication authentication, @PathVariable UUID channel, @PathVariable long message, @Valid @RequestBody MessageEdit input) { service.edit(authentication, channel, message, input.expectedVersion(), input.body(), input.deleted()); return Map.of("success", true); }
}
