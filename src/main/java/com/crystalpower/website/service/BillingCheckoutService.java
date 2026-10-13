package com.crystalpower.website.service;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.UUID;

/** Network creation happens after the attempt and explicit acceptance have committed. */
@Service
public class BillingCheckoutService {
    private final BillingCheckoutStore store;
    private final StripeGateway stripe;
    public BillingCheckoutService(BillingCheckoutStore store,StripeGateway stripe) { this.store=store; this.stripe=stripe; }
    public String checkout(Authentication auth,UUID bill,boolean accepted) {
        stripe.requireConfigured(); var plan=store.prepare(auth,bill,accepted);
        if(plan.attempt().state().equals("RECONCILE_REQUIRED")) throw new ResponseStatusException(HttpStatus.CONFLICT,"The previous checkout outcome is uncertain. Ask the team to reconcile it before another attempt.");
        try {
            if(plan.attempt().sessionId()!=null) {
                store.reconcileSession(bill,plan.attempt().sessionId());
                var status=store.refresh(auth,bill);
                if(!status.checkoutState().equals("OPEN")) throw new ResponseStatusException(HttpStatus.CONFLICT,"Checkout status changed. Refresh this payment request before trying again.");
                String url=stripe.trustedCheckoutUrl(stripe.session(plan.attempt().sessionId()));
                if(url==null) throw new ResponseStatusException(HttpStatus.CONFLICT,"Checkout closed while its status was refreshed. Check this request before retrying.");
                return url;
            }
            String customer=plan.customer();
            if(customer==null) customer=store.saveCustomer(plan.client().id(),plan.intent().liveMode(),stripe.createCustomer(plan.client().id(),plan.client().email(),plan.client().displayName()));
            var result=stripe.checkout(bill,plan.attempt().id(),plan.draft().amountPence(),plan.draft().title(),customer,plan.draft().purpose().equals("MONTHLY"),plan.attempt().expiresAt());
            store.session(plan.attempt().id(),result); return result.url();
        } finally { store.release(plan.attempt().id()); }
    }
    public String portal(Authentication auth,UUID bill) { stripe.requireConnected(); return stripe.customerPortal(store.portalCustomer(auth,bill),UUID.randomUUID()); }
}
