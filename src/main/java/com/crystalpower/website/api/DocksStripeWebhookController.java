package com.crystalpower.website.api;

import com.crystalpower.website.service.DocksStripeEvents;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class DocksStripeWebhookController {
    private final DocksStripeEvents events;

    public DocksStripeWebhookController(DocksStripeEvents events) { this.events = events; }

    @PostMapping("/api/docks/billing/stripe/webhook")
    public Map<String, Boolean> receive(HttpServletRequest request,
            @RequestHeader(value = "Stripe-Signature", required = false) String signature) throws IOException {
        var bytes = request.getInputStream().readNBytes(262145);
        if (bytes.length > 262144)
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "The Stripe event is too large.");
        events.receive(bytes, signature);
        return Map.of("received", true);
    }
}
