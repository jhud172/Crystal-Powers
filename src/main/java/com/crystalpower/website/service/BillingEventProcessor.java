package com.crystalpower.website.service;

import com.crystalpower.website.repository.BillingFlowRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.Set;
import java.util.UUID;

@Service
public class BillingEventProcessor {
    private static final Set<String> CHECKOUT=Set.of("checkout.session.completed","checkout.session.expired","checkout.session.async_payment_succeeded","checkout.session.async_payment_failed");
    private static final Set<String> SUBSCRIPTION=Set.of("customer.subscription.created","customer.subscription.updated","customer.subscription.deleted","customer.subscription.paused","customer.subscription.resumed");
    private static final Set<String> INVOICE=Set.of("invoice.paid","invoice.payment_succeeded","invoice.payment_failed","invoice.payment_action_required","invoice.finalized","invoice.voided","invoice.marked_uncollectible");
    public static boolean refundEvent(String type) { return Set.of("refund.created","refund.updated","refund.failed","charge.refund.updated").contains(type); }
    private final BillingFlowRepository flow;
    private final BillingCheckoutStore store;
    private final StripeGateway stripe;
    private final BillingLedgerService ledger;
    public BillingEventProcessor(BillingFlowRepository flow,BillingCheckoutStore store,StripeGateway stripe,BillingLedgerService ledger) { this.flow=flow; this.store=store; this.stripe=stripe;this.ledger=ledger; }
    @Transactional
    public void process(String id) {
        var event=flow.event(id,true).orElseThrow(); if(event.state().equals("DONE")) return;
        if(event.liveMode()!=stripe.liveMode()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Payment environment mismatch.");
        if(CHECKOUT.contains(event.type())) {
            var session=stripe.session(event.objectId()); UUID bill=ownedBill(session);
            if(bill!=null) store.reconcileSession(bill,event.objectId());
        } else if(SUBSCRIPTION.contains(event.type())) {
            var subscription=stripe.subscription(event.objectId()); UUID bill=ownedBill(subscription);
            if(bill!=null) store.reconcileSubscription(bill,event.objectId());
        } else if(INVOICE.contains(event.type())) {
            var invoice=stripe.invoice(event.objectId()); String subscription=BillingCheckoutStore.reference(invoice.path("parent").path("subscription_details").path("subscription"));
            if(subscription!=null) { var current=stripe.subscription(subscription); UUID bill=ownedBill(current); if(bill!=null) {store.reconcileSubscription(bill,subscription);store.reconcileSubscriptionInvoice(bill,event.objectId());} }
            else { UUID bill=ownedBill(invoice); if(bill!=null) store.reconcileInvoice(bill,event.objectId()); }
        } else if(refundEvent(event.type())) { throw new ResponseStatusException(HttpStatus.CONFLICT,"Process refund events through their separate committed reconciliation workflow."); }
        else if(event.type().startsWith("charge.dispute.")) { ledger.adjustment("DISPUTE",event.objectId()); }
        // Unsupported or unrelated resources are acknowledged without changing any business state.
        flow.eventDone(id);
    }
    private UUID ownedBill(JsonNode resource) { String value=resource.path("metadata").path("billing_request_id").asText(""); if(value.isBlank()) return null; UUID id; try { id=UUID.fromString(value); } catch(IllegalArgumentException invalid) { return null; } return flow.intent(id,false).isPresent() ? id : null; }
}
