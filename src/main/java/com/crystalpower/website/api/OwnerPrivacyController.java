package com.crystalpower.website.api;

import com.crystalpower.website.security.OwnerPrincipal;
import com.crystalpower.website.service.PublicPrivacyService;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/privacy")
public class OwnerPrivacyController {
    private final PublicPrivacyService privacy;
    public OwnerPrivacyController(PublicPrivacyService privacy){this.privacy=privacy;}
    @GetMapping public ResponseEntity<?> diagnostics(Authentication auth){if(auth==null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof OwnerPrincipal))throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sign in to the owner studio.");return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(privacy.diagnostics());}
}
