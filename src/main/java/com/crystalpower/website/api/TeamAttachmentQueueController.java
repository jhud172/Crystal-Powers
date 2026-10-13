package com.crystalpower.website.api;

import com.crystalpower.website.service.TeamAttachmentStore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@Validated
@RequestMapping("/api/team/channel-uploads")
public class TeamAttachmentQueueController {
    private final TeamAttachmentStore store;
    public TeamAttachmentQueueController(TeamAttachmentStore store){this.store=store;}
    @GetMapping public Object queue(Authentication auth,@RequestParam(defaultValue="PENDING") @Pattern(regexp="PENDING|APPROVED|REJECTED|REMOVED") String state,@RequestParam(defaultValue="false") boolean inactive,@RequestParam(required=false) UUID after){return store.queue(auth,state,inactive,after);}
    @GetMapping("/{channel}/messages/{message}") public Object detail(Authentication auth,@PathVariable UUID channel,@PathVariable @Positive long message){return store.cleanupList(auth,channel,message);}
    @PostMapping("/{channel}/messages/{message}/{id}/remove") public Object remove(Authentication auth,@PathVariable UUID channel,@PathVariable @Positive long message,@PathVariable UUID id,@Valid @RequestBody TeamAttachmentController.Version input){return store.cleanupRemove(auth,channel,message,id,input.version());}
}
