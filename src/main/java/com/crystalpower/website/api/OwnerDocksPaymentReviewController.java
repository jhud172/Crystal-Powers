package com.crystalpower.website.api;

import com.crystalpower.website.security.OwnerPrincipal;
import com.crystalpower.website.service.DocksStripeDeliveryQueue;
import com.crystalpower.website.service.DocksStripeEvents;
import java.util.List;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class OwnerDocksPaymentReviewController {
    private final DocksStripeEvents events;
    private final DocksStripeDeliveryQueue deliveries;

    public OwnerDocksPaymentReviewController(DocksStripeEvents events, DocksStripeDeliveryQueue deliveries) {
        this.events = events;
        this.deliveries = deliveries;
    }

    @GetMapping("/api/admin/docks/payment-review")
    public ResponseEntity<List<DocksStripeEvents.PaymentReview>> recent() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(events.recentPaymentReviews());
    }

    @GetMapping("/api/admin/docks/payment-deliveries")
    public ResponseEntity<List<DocksStripeDeliveryQueue.Pending>> pending() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(deliveries.pending());
    }

    @PostMapping("/api/admin/docks/payment-deliveries/{eventId}/retry")
    public ResponseEntity<Void> retry(@PathVariable("eventId") String eventId,
            @AuthenticationPrincipal OwnerPrincipal owner) {
        deliveries.retry(eventId, owner.id());
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> refused(ResponseStatusException failure) {
        return ResponseEntity.status(failure.getStatusCode()).cacheControl(CacheControl.noStore())
                .body(Map.of("message", failure.getReason()));
    }
}
