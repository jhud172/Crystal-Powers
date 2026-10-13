package com.crystalpower.website.service;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.UUID;

/** Withdrawal intent commits before provider expiry; a failure keeps new checkout blocked. */
@Service
public class BillingWithdrawalService {
    private final BillingDraftService drafts;
    private final BillingCheckoutStore checkout;
    private final StripeGateway stripe;
    public BillingWithdrawalService(BillingDraftService drafts,BillingCheckoutStore checkout,StripeGateway stripe) { this.drafts=drafts;this.checkout=checkout;this.stripe=stripe; }
    public void withdraw(Authentication auth,UUID request,UUID id) {
        var plan=drafts.beginWithdrawal(auth,request,id); if(plan.done()) return;
        if(plan.sessionId()!=null) {
            checkout.reconcileSession(id,plan.sessionId());
            var current=stripe.session(plan.sessionId());
            if(current.path("status").asText().equals("open")) { stripe.expireSession(plan.sessionId());checkout.reconcileSession(id,plan.sessionId()); }
        }
        if(!drafts.finishWithdrawal(auth,request,id)) throw new ResponseStatusException(HttpStatus.CONFLICT,"The request completed before withdrawal. Review its payment/subscription; it was not refunded or cancelled.");
    }
}
