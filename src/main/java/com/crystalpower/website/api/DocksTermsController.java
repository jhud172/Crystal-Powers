package com.crystalpower.website.api;

import com.crystalpower.website.service.DocksTerms;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DocksTermsController {
    private final DocksTerms terms;

    public DocksTermsController(DocksTerms terms) {
        this.terms = terms;
    }

    @GetMapping("/api/site/docks-terms")
    public ResponseEntity<PublishedTerms> content() {
        if (!terms.ready()) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new PublishedTerms(terms.content()));
    }

    public record PublishedTerms(String body) {}
}
