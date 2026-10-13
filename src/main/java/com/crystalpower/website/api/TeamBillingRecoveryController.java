package com.crystalpower.website.api;

import com.crystalpower.website.service.BillingEventRecoveryService;
import com.crystalpower.website.security.AttemptLimiter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.validation.annotation.Validated;
import jakarta.validation.constraints.Pattern;
import java.util.Map;

@RestController
@Validated
@RequestMapping("/api/team/billing/events")
public class TeamBillingRecoveryController {
    private final BillingEventRecoveryService recovery;
    private final AttemptLimiter limiter;
    public TeamBillingRecoveryController(BillingEventRecoveryService recovery,AttemptLimiter limiter) { this.recovery=recovery;this.limiter=limiter; }
    @GetMapping public Object pending(Authentication auth,@RequestParam(defaultValue="ALL") @Pattern(regexp="ALL|DUE|WAITING|REVIEW") String filter,@RequestParam(required=false) @Pattern(regexp="evt_[A-Za-z0-9]{1,96}") String after) { return recovery.list(auth,filter,after); }
    @PostMapping("/{id}/retry") public Object retry(Authentication auth,@PathVariable @Pattern(regexp="evt_[A-Za-z0-9]{1,96}") String id,HttpServletRequest request) { limiter.check("billing-event-retry:"+request.getRemoteAddr(),10,60); recovery.retry(auth,id); return Map.of("success",true); }
}
