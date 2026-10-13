package com.crystalpower.website.api;

import com.crystalpower.website.service.PublicPrivacyService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/site/privacy")
public class PublicPrivacyController {
    private final PublicPrivacyService privacy;
    public PublicPrivacyController(PublicPrivacyService privacy){this.privacy=privacy;}
    @GetMapping("/status") public ResponseEntity<?> status(){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(privacy.status());}
    @GetMapping public ResponseEntity<?> content(){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(privacy.published());}
}
