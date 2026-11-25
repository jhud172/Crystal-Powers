package com.crystalpower.website.api;

import com.crystalpower.website.service.DocksStripeEvents;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class OwnerDocksPaymentReviewController {
    private final DocksStripeEvents events;

    public OwnerDocksPaymentReviewController(DocksStripeEvents events) { this.events = events; }

    @GetMapping("/api/admin/docks/payment-review")
    public ResponseEntity<List<DocksStripeEvents.PaymentReview>> recent() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(events.recentPaymentReviews());
    }
}
