package com.crystalpower.website.service;

import com.crystalpower.website.repository.BillingFlowRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** No outer transaction spans provider outcome, shared cash refresh and inbox completion. */
@Service
public class RefundWebhookService {
    private final BillingFlowRepository events;
    private final BillingEventStore inbox;
    private final RefundResultStore results;
    private final RefundResultService reconciliation;
    private final BillingLedgerService ledger;
    private final StripeGateway stripe;
    public RefundWebhookService(BillingFlowRepository events,BillingEventStore inbox,RefundResultStore results,RefundResultService reconciliation,BillingLedgerService ledger,StripeGateway stripe) { this.events=events;this.inbox=inbox;this.results=results;this.reconciliation=reconciliation;this.ledger=ledger;this.stripe=stripe; }
    public void process(String id) {
        var event=events.event(id,false).orElseThrow();if(event.state().equals("DONE"))return;
        if(!BillingEventProcessor.refundEvent(event.type()) || event.liveMode()!=stripe.liveMode())throw new ResponseStatusException(HttpStatus.CONFLICT,"This refund event is unavailable in the current environment.");
        var plan=results.webhookPlan(event.objectId());
        if(plan.isPresent()){
            var result=reconciliation.reconcile(plan.get(),event.objectId());
            if(!result.ledgerReconciled())throw new ResponseStatusException(HttpStatus.CONFLICT,"A newer refund outcome still needs financial reconciliation.");
        }else ledger.adjustment("REFUND",event.objectId());
        inbox.completeRefund(event);
    }
}
