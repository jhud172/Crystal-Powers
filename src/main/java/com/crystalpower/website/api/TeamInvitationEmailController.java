package com.crystalpower.website.api;

import com.crystalpower.website.repository.InvitationEmailRepository.Kind;
import com.crystalpower.website.security.AttemptLimiter;
import com.crystalpower.website.service.InvitationEmailService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/team/invitation-emails/{kind}/{resource}")
public class TeamInvitationEmailController {
    public record Input(@Min(0) int version,@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{43}") String token) {}
    private final InvitationEmailService service;
    private final AttemptLimiter limiter;
    public TeamInvitationEmailController(InvitationEmailService service,AttemptLimiter limiter){this.service=service;this.limiter=limiter;}
    @PostMapping("/status") public Object status(Authentication auth,@PathVariable Kind kind,@PathVariable UUID resource,@Valid @RequestBody Input input,HttpServletRequest request){limiter.check("invitation-mail-status:"+request.getRemoteAddr(),30,60);return service.status(auth,kind,resource,input.version(),input.token());}
    @PostMapping("/send") public Object send(Authentication auth,@PathVariable Kind kind,@PathVariable UUID resource,@Valid @RequestBody Input input,HttpServletRequest request){limiter.check("invitation-mail-send:"+request.getRemoteAddr(),10,60);return service.send(auth,kind,resource,input.version(),input.token());}
}
