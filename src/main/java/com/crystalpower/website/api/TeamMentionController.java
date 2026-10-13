package com.crystalpower.website.api;

import com.crystalpower.website.service.TeamMentionService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.validation.annotation.Validated;
import jakarta.validation.constraints.Positive;
import java.util.Map;
import java.util.UUID;

@RestController
@Validated
@RequestMapping("/api/team")
public class TeamMentionController {
    private final TeamMentionService mentions;
    public TeamMentionController(TeamMentionService mentions){this.mentions=mentions;}
    @GetMapping("/channels/{channel}/mention-recipients") public Object recipients(Authentication auth,@PathVariable UUID channel){return mentions.recipients(auth,channel);}
    @GetMapping("/mentions") public Object inbox(Authentication auth,@RequestParam(required=false) @Positive Long before){return mentions.inbox(auth,before);}
    @PostMapping("/channels/{channel}/mentions/{message}/acknowledge") public Object acknowledge(Authentication auth,@PathVariable UUID channel,@PathVariable @Positive long message){mentions.acknowledge(auth,channel,message);return Map.of("success",true);}
}
