package com.crystalpower.website.api;

import com.crystalpower.website.service.*;
import com.crystalpower.website.security.AttemptLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/client/billing")
public class ClientBillingController {
    public record Consent(@AssertTrue(message="Review and accept the payment terms before checkout.") boolean acceptedTerms) {}
    private final BillingCheckoutStore store;
    private final BillingCheckoutService checkout;
    private final StripeGateway stripe;
    private final AttemptLimiter limiter;
    public ClientBillingController(BillingCheckoutStore store,BillingCheckoutService checkout,StripeGateway stripe,AttemptLimiter limiter) { this.store=store; this.checkout=checkout; this.stripe=stripe; this.limiter=limiter; }
    @GetMapping public Object list(Authentication auth) { return Map.of("paymentsEnabled",stripe.configured(),"managementEnabled",stripe.connected(),"liveMode",stripe.liveMode(),"bills",store.list(auth)); }
    @GetMapping("/page") public Object page(Authentication auth,@RequestParam(required=false) String after) { return store.page(auth,after); }
    @GetMapping("/{id}/receipts") public Object receipts(Authentication auth,@PathVariable UUID id,@RequestParam(required=false) String after) { return store.receiptPage(auth,id,after); }
    @GetMapping("/{id}/invoices") public Object invoices(Authentication auth,@PathVariable UUID id,@RequestParam(required=false) String before) { return store.invoicePage(auth,id,before); }
    @PostMapping("/{id}/checkout") public Object checkout(Authentication auth,@PathVariable UUID id,@Valid @RequestBody Consent consent,HttpServletRequest request) { limiter.check("client-checkout:"+request.getRemoteAddr(),10,60); return Map.of("url",checkout.checkout(auth,id,consent.acceptedTerms())); }
    @PostMapping("/{id}/refresh") public Object refresh(Authentication auth,@PathVariable UUID id,HttpServletRequest request) { limiter.check("client-payment-refresh:"+request.getRemoteAddr(),20,60); stripe.requireConnected(); return store.refresh(auth,id); }
    @PostMapping("/{id}/portal") public Object portal(Authentication auth,@PathVariable UUID id,HttpServletRequest request) { limiter.check("client-billing-portal:"+request.getRemoteAddr(),10,60); return Map.of("url",checkout.portal(auth,id)); }
}
