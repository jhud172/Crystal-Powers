package com.crystalpower.website.api;

import com.crystalpower.website.security.AttemptLimiter;
import com.crystalpower.website.service.EmailTransport;
import com.crystalpower.website.service.OwnerRecoveryService;
import com.crystalpower.website.service.OwnerService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/auth/recovery")
public class OwnerRecoveryController {
    public record Request(@NotBlank @Email @Size(max = 254) String email) {}
    public record Reset(@NotBlank @Pattern(regexp = "[a-f0-9]{64}") String token, @NotBlank @Size(max = 256) String password, @NotBlank @Size(max = 64) String code) {}
    private final OwnerRecoveryService recovery;
    private final AttemptLimiter limiter;
    public OwnerRecoveryController(OwnerRecoveryService recovery, AttemptLimiter limiter) { this.recovery = recovery; this.limiter = limiter; }
    @PostMapping("/request")
    public Map<String, String> request(@Valid @RequestBody Request input, HttpServletRequest request) {
        limiter.check("reset-ip:" + request.getRemoteAddr(), 10, 3600);
        limiter.check("reset-email:" + DigestUtils.sha256Hex(OwnerService.normaliseEmail(input.email())), 3, 3600);
        try { recovery.request(input.email()); }
        catch (EmailTransport.DeliveryException exception) { org.slf4j.LoggerFactory.getLogger(getClass()).warn("Owner password reset email could not be delivered; no token or account details logged."); }
        return Map.of("message", "If this address belongs to the owner account, a reset link will be sent. Check your inbox and spam folder.");
    }
    @PostMapping("/reset")
    public Map<String, String> reset(@Valid @RequestBody Reset input, HttpServletRequest request) {
        limiter.check("reset-verify-ip:" + request.getRemoteAddr(), 10, 900);
        limiter.check("reset-verify-token:" + DigestUtils.sha256Hex(input.token()), 5, 900);
        recovery.reset(input.token(), input.password(), input.code().trim());
        var session = request.getSession(false); if (session != null) session.invalidate();
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
        return Map.of("message", "Password changed. Sign in again with your new password and authenticator.");
    }
}
