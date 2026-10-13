package com.crystalpower.website.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Each store call commits separately; no provider request occurs inside the confirmation transaction. */
@Service
public class RefundExecutionService {
    private final RefundDraftService drafts;
    private final RefundResultService results;
    private final StripeGateway stripe;
    private final boolean enabled;
    public RefundExecutionService(RefundDraftService drafts,RefundResultService results,StripeGateway stripe,@Value("${crystal.billing.refunds-enabled:false}") boolean enabled) { this.drafts=drafts;this.results=results;this.stripe=stripe;this.enabled=enabled; }
    public boolean enabled() { return enabled; }
    public Object confirm(Authentication auth,java.util.UUID request,java.util.UUID bill,java.util.UUID id,int version,boolean confirmed,boolean sharedAccepted,boolean fraudAccepted) {
        if(!enabled)throw new ResponseStatusException(HttpStatus.CONFLICT,"Refund submission is unavailable. Saved proposals can still be reviewed.");
        var plan=drafts.prepareExecution(auth,request,bill,id,version,confirmed,sharedAccepted,fraudAccepted);
        try{drafts.validateExecution(auth,plan);String providerId=stripe.createRefund(plan);drafts.candidate(plan,providerId);results.reconcile(plan,providerId);}
        catch(RuntimeException failure){try{drafts.uncertain(plan);}catch(RuntimeException persistenceFailure){failure.addSuppressed(persistenceFailure);}throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"The refund outcome or financial reconciliation is not fully confirmed. Refresh this proposal and verify its existing provider reference before continuing; do not create a replacement refund.",failure);}
        return drafts.detail(auth,request,bill,id);
    }
    public Object reconcile(Authentication auth,java.util.UUID request,java.util.UUID bill,java.util.UUID id,int version,String providerId) {
        var plan=drafts.reconciliationPlan(auth,request,bill,id,version,providerId);
        results.reconcile(plan,providerId);
        return drafts.detail(auth,request,bill,id);
    }
}
