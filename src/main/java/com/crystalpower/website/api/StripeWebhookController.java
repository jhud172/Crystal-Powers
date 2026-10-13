package com.crystalpower.website.api;

import com.crystalpower.website.service.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.util.Map;

@RestController
public class StripeWebhookController {
    private final StripeGateway stripe;
    private final BillingEventStore events;
    private final BillingEventRecoveryService processor;
    public StripeWebhookController(StripeGateway stripe,BillingEventStore events,BillingEventRecoveryService processor) { this.stripe=stripe; this.events=events; this.processor=processor; }
    @PostMapping("/api/billing/stripe/webhook")
    public Object receive(HttpServletRequest request,@RequestHeader(value="Stripe-Signature",required=false) String signature) throws IOException {
        byte[] body=request.getInputStream().readNBytes(262145);
        if(body.length>262144) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,"The payment event exceeded the accepted size.");
        var event=stripe.verifyEvent(body,signature);
        String id=event.path("id").asText(),type=event.path("type").asText(),object=event.path("data").path("object").path("id").asText();
        if(!type.matches("[a-z_.]{1,150}") || !object.matches("[A-Za-z0-9_]{1,100}") || !event.path("created").isIntegralNumber()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"This payment event reference is invalid.");
        try { events.accept(id,type,object,event.path("created").asLong(),event.path("livemode").asBoolean()); }
        catch(DataIntegrityViolationException duplicate) { events.accept(id,type,object,event.path("created").asLong(),event.path("livemode").asBoolean()); }
        processor.process(id); return Map.of("received",true);
    }
}
