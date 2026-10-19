package com.crystalpower.website.service;

import com.crystalpower.website.repository.*;
import com.crystalpower.website.security.ClientPrincipal;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class BillingCheckoutStore {
    public record Bill(UUID id,String purpose,String title,long amountPence,String currency,String terms,String paymentState,String subscriptionState,boolean cancelAtPeriodEnd,Long periodEnd,String invoiceState,String invoiceUrl,String checkoutState,java.time.OffsetDateTime issuedAt,boolean withdrawalPending,boolean withdrawn) {}
    public record Plan(BillingRepository.Draft draft,BillingFlowRepository.Intent intent,ClientRepository.Account client,BillingFlowRepository.Attempt attempt,String customer) {}
    private final BillingRepository drafts;
    private final BillingFlowRepository flow;
    private final ClientRepository clients;
    private final ClientAccessService access;
    private final StripeGateway stripe;
    private final BillingHistoryRepository history;
    private final BillingLedgerService ledger;
    private final BillingInvoiceRepository invoices;
    private final ClientInvoiceRepository clientInvoices;
    private final BillingLedgerRepository receiptRecords;
    public BillingCheckoutStore(BillingRepository drafts,BillingFlowRepository flow,ClientRepository clients,ClientAccessService access,StripeGateway stripe,BillingHistoryRepository history,BillingLedgerService ledger,BillingInvoiceRepository invoices,ClientInvoiceRepository clientInvoices,BillingLedgerRepository receiptRecords) { this.drafts=drafts; this.flow=flow; this.clients=clients; this.access=access; this.stripe=stripe;this.history=history;this.ledger=ledger;this.invoices=invoices;this.clientInvoices=clientInvoices;this.receiptRecords=receiptRecords; }
    @Transactional(readOnly=true)
    public List<Bill> list(Authentication auth) { var actor=access.resolve(auth); return flow.clientBills(actor.id(),actor.workspaceId(),stripe.liveMode()).stream().map(id -> view(drafts.draft(id).orElseThrow(),flow.intent(id,false).orElseThrow())).toList(); }
    public record ClientBillPage(UUID accountId,UUID workspaceId,boolean paymentsEnabled,boolean managementEnabled,boolean liveMode,List<Bill> bills,String nextCursor,long total) {}
    @Transactional(readOnly=true)
    public ClientBillPage page(Authentication auth,String after) {
        var actor=access.resolve(auth);boolean mode=stripe.liveMode();BillingFlowRepository.Intent cursor=null;
        if(after!=null){UUID id;try{id=UUID.fromString(after);if(!id.toString().equals(after))throw new IllegalArgumentException();}catch(IllegalArgumentException failure){throw missing();}cursor=flow.clientBillAnchor(actor.id(),actor.workspaceId(),mode,id).orElseThrow(BillingCheckoutStore::missing);}
        var rows=flow.clientBillPage(actor.id(),actor.workspaceId(),mode,cursor);boolean more=rows.size()>50;var items=more ? rows.subList(0,50) : rows;
        var views=items.stream().map(intent->view(drafts.draft(intent.billId()).orElseThrow(BillingCheckoutStore::missing),intent)).toList();
        return new ClientBillPage(actor.id(),actor.workspaceId(),stripe.configured(),stripe.connected(),mode,views,more ? items.get(items.size()-1).billId().toString() : null,flow.clientBillTotal(actor.id(),actor.workspaceId(),mode));
    }
    public record InvoicePage(UUID accountId,UUID workspaceId,List<ClientInvoiceRepository.Invoice> items,String nextCursor,long total) {}
    @Transactional
    public InvoicePage invoicePage(Authentication auth,UUID bill,String before) {
        var plan=authorised(auth,bill);ClientInvoiceRepository.Invoice cursor=null;
        if(before!=null){if(before.length()>100 || !before.matches("in_[A-Za-z0-9]+"))throw missing();cursor=clientInvoices.anchor(bill,plan.intent().liveMode(),before).orElseThrow(BillingCheckoutStore::missing);}
        var rows=clientInvoices.page(bill,plan.intent().liveMode(),cursor);boolean more=rows.size()>50;var items=more ? rows.subList(0,50) : rows;
        return new InvoicePage(plan.client().id(),plan.client().workspaceId(),items,more ? items.get(items.size()-1).id() : null,clientInvoices.total(bill,plan.intent().liveMode()));
    }
    public record ReceiptPage(UUID accountId,UUID workspaceId,List<BillingLedgerRepository.Receipt> items,String nextCursor) {}
    @Transactional
    public ReceiptPage receiptPage(Authentication auth,UUID bill,String after) {
        var plan=authorised(auth,bill);
        if(after!=null && (after.length()>100 || !after.matches("(pi_|ch_)[A-Za-z0-9]+") || !receiptRecords.hasClientReceipt(bill,plan.intent().liveMode(),plan.customer(),after)))throw missing();
        var rows=receiptRecords.clientReceipts(bill,plan.intent().liveMode(),plan.customer(),after);boolean more=rows.size()>50;var items=more ? rows.subList(0,50) : rows;
        return new ReceiptPage(plan.client().id(),plan.client().workspaceId(),items,more ? items.get(items.size()-1).id() : null);
    }
    private void recordInvoice(UUID bill,BillingFlowRepository.Intent intent,JsonNode invoice) {
        String id=reference(invoice),state=invoice.path("status").asText();var created=invoice.path("created");var total=invoice.path("total");var paid=invoice.path("amount_paid");var number=invoice.path("number");
        if(id==null || !id.matches("in_[A-Za-z0-9]+") || id.length()>100 || !"invoice".equals(invoice.path("object").asText()) || !java.util.Set.of("draft","open","paid","uncollectible","void").contains(state) || !created.isIntegralNumber() || !created.canConvertToLong() || created.asLong()<0 || created.asLong()>253402300799L || !total.isIntegralNumber() || !total.canConvertToLong() || total.asLong() < -9007199254740991L || total.asLong() > 9007199254740991L || !paid.isIntegralNumber() || !paid.canConvertToLong() || paid.asLong()<0 || paid.asLong()>9007199254740991L || (!number.isNull() && !number.isMissingNode() && (!number.isTextual() || number.asText().length()>200)))throw unconfirmed();
        String url=stripe.trustedInvoiceUrl(invoice);if(url!=null && url.length()>2048)throw unconfirmed();
        clientInvoices.save(bill,intent.liveMode(),id,created.asLong(),number.isTextual() ? number.asText() : null,state,total.asLong(),paid.asLong(),url);
    }
    private Plan authorised(Authentication auth,UUID id) {
        ClientPrincipal principal=access.resolve(auth); var draft=drafts.draft(id).orElseThrow(BillingCheckoutStore::missing);
        clients.project(principal.id(),principal.workspaceId(),draft.requestId()).orElseThrow(BillingCheckoutStore::missing);
        var client=clients.account(principal.id(),true).orElseThrow(BillingCheckoutStore::missing);
        if(!client.state().equals("ACTIVE") || client.version()!=principal.credentialsVersion()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Please sign in again.");
        var intent=flow.intent(id,true).orElseThrow(BillingCheckoutStore::missing);
        if(!intent.accountId().equals(principal.id()) || !draft.workspaceId().equals(principal.workspaceId()) || intent.liveMode()!=stripe.liveMode()) throw missing();
        return new Plan(draft,intent,client,flow.latest(id).orElse(null),flow.customer(client.id(),intent.liveMode()).orElse(null));
    }
    @Transactional
    public Plan prepare(Authentication auth,UUID id,boolean accepted) {
        var plan=authorised(auth,id);
        if(plan.intent().withdrawalRequestedAt()!=null || plan.intent().withdrawnAt()!=null) throw new ResponseStatusException(HttpStatus.CONFLICT,"This payment request is being withdrawn or has been withdrawn. Contact the team if you need a replacement.");
        if(!accepted) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Review and explicitly accept the payment amount and terms before checkout.");
        if(plan.intent().paymentState().equals("PAID") || plan.intent().subscriptionId()!=null) throw new ResponseStatusException(HttpStatus.CONFLICT,"This payment or subscription already exists. Refresh its status instead of starting another checkout.");
        var attempt=plan.attempt(); long now=Instant.now().getEpochSecond();
        if(attempt==null || attempt.state().equals("EXPIRED")) attempt=flow.createAttempt(id,now+43200);
        if(attempt.sessionId()==null && attempt.expiresAt()<now+1800) { flow.uncertain(attempt.id()); attempt=flow.attempt(attempt.id()).orElseThrow(); }
        if(!attempt.state().equals("RECONCILE_REQUIRED") && !flow.lease(attempt.id(),now)) throw new ResponseStatusException(HttpStatus.CONFLICT,"Checkout is already being prepared. Wait, then refresh before retrying.");
        flow.accept(id);history.observe(id,plan.intent().liveMode(),"CLIENT_ACCEPTANCE",id.toString(),"ACCEPTED",plan.draft().amountPence(),"Client explicitly accepted the amount and terms before checkout. No collection is inferred.");
        return new Plan(plan.draft(),plan.intent(),plan.client(),attempt,plan.customer());
    }
    @Transactional
    public String saveCustomer(UUID account,boolean liveMode,String customer) { clients.account(account,true).orElseThrow(BillingCheckoutStore::missing); flow.customer(account,liveMode,customer); return flow.customer(account,liveMode).orElseThrow(); }
    @Transactional
    public void session(UUID attempt,StripeGateway.Checkout result) { var current=flow.attempt(attempt).orElseThrow(BillingCheckoutStore::missing); flow.intent(current.billId(),true).orElseThrow(BillingCheckoutStore::missing); if(result.expiresAt()!=current.expiresAt() || (current.sessionId()!=null && !current.sessionId().equals(result.id()))) throw unconfirmed(); flow.session(attempt,result.id(),result.url(),"OPEN"); }
    @Transactional public void release(UUID attempt) { flow.release(attempt); }
    @Transactional
    public Bill refresh(Authentication auth,UUID id) { var plan=authorised(auth,id); if(plan.attempt()!=null && plan.attempt().sessionId()!=null) reconcileSession(id,plan.attempt().sessionId()); if(plan.intent().subscriptionId()!=null) reconcileSubscription(id,plan.intent().subscriptionId()); return view(plan.draft(),flow.intent(id,false).orElseThrow()); }
    @Transactional
    public String portalCustomer(Authentication auth,UUID id) { var plan=authorised(auth,id); if(plan.customer()==null) throw new ResponseStatusException(HttpStatus.CONFLICT,"No Stripe customer is linked yet. Complete checkout first."); return plan.customer(); }
    /** Recheck current client/project authority after provider IO, without repeating a financial operation. */
    @Transactional
    public void confirmAccess(Authentication auth,UUID id) { authorised(auth,id); }
    @Transactional
    public void reconcileSession(UUID id,String sessionId) {
        var intent=flow.intent(id,true).orElseThrow(BillingCheckoutStore::missing); var draft=drafts.draft(id).orElseThrow(BillingCheckoutStore::missing);
        if(intent.liveMode()!=stripe.liveMode()) throw missing();
        JsonNode session=stripe.session(sessionId); UUID attemptId=uuid(session.path("metadata").path("checkout_attempt_id").asText());
        var attempt=flow.attempt(attemptId).orElseThrow(BillingCheckoutStore::missing); String customer=flow.customer(intent.accountId(),intent.liveMode()).orElseThrow(BillingCheckoutStore::unconfirmed);
        if(!sessionId.equals(reference(session)) || !"checkout.session".equals(session.path("object").asText()) || !attempt.billId().equals(id) || !id.toString().equals(session.path("client_reference_id").asText()) || !id.toString().equals(session.path("metadata").path("billing_request_id").asText()) || !customer.equals(reference(session.path("customer"))) || !"gbp".equals(session.path("currency").asText()) || !session.path("amount_total").isIntegralNumber() || !session.path("amount_total").canConvertToLong() || session.path("amount_total").asLong()!=draft.amountPence() || !session.path("mode").asText().equals(draft.purpose().equals("MONTHLY") ? "subscription" : "payment") || (attempt.sessionId()!=null && !attempt.sessionId().equals(sessionId))) throw unconfirmed();
        String status=session.path("status").asText();
        if(!List.of("open","complete","expired").contains(status) || !List.of("paid","unpaid","no_payment_required").contains(session.path("payment_status").asText())) throw unconfirmed();
        if(status.equals("complete") && session.path("payment_status").asText().equals("paid") && !draft.purpose().equals("MONTHLY") && reference(session.path("payment_intent"))==null) throw unconfirmed();
        flow.session(attemptId,sessionId,stripe.trustedCheckoutUrl(session),status.equals("open") ? "OPEN" : status.equals("expired") ? "EXPIRED" : "COMPLETE");
        history.observe(id,intent.liveMode(),"CHECKOUT",sessionId,status+" / "+session.path("payment_status").asText("unknown"),draft.amountPence(),"Verified checkout state. Request amount; this observation is not a separate cash transaction.");
        if(!draft.purpose().equals("MONTHLY") && reference(session.path("payment_intent"))!=null)ledger.payment(id,reference(session.path("payment_intent")),"CHECKOUT:"+sessionId,null,-1);
        if(status.equals("complete")) {
            flow.payment(id,session.path("payment_status").asText().equals("paid"));
            if(draft.purpose().equals("MONTHLY")) reconcileSubscription(id,reference(session.path("subscription")));
            else if(reference(session.path("invoice"))!=null)reconcileInvoice(id,reference(session.path("invoice")));
        }
    }
    @Transactional
    public void reconcileSubscription(UUID id,String subscriptionId) {
        var intent=flow.intent(id,true).orElseThrow(BillingCheckoutStore::missing); var draft=drafts.draft(id).orElseThrow(BillingCheckoutStore::missing);
        if(!draft.purpose().equals("MONTHLY") || intent.liveMode()!=stripe.liveMode() || intent.acceptedAt()==null || (intent.subscriptionId()!=null && !intent.subscriptionId().equals(subscriptionId))) throw unconfirmed();
        var subscription=stripe.subscription(subscriptionId);
        String customer=flow.customer(intent.accountId(),intent.liveMode()).orElseThrow(BillingCheckoutStore::unconfirmed);
        var items=subscription.path("items").path("data"); var item=items.isArray() && items.size()==1 ? items.get(0) : null;
        if(!subscriptionId.equals(reference(subscription)) || !"subscription".equals(subscription.path("object").asText()) || !subscription.path("cancel_at_period_end").isBoolean() || !subscription.path("status").isTextual() || !subscription.path("status").asText().matches("[a-z_]{1,50}") || !id.toString().equals(subscription.path("metadata").path("billing_request_id").asText()) || !customer.equals(reference(subscription.path("customer"))) || item==null || !item.path("quantity").isIntegralNumber() || !item.path("quantity").canConvertToLong() || item.path("quantity").asLong()!=1 || !item.path("price").path("unit_amount").isIntegralNumber() || !item.path("price").path("unit_amount").canConvertToLong() || item.path("price").path("unit_amount").asLong()!=draft.amountPence() || !"gbp".equals(item.path("price").path("currency").asText()) || !"month".equals(item.path("price").path("recurring").path("interval").asText()) || !item.path("price").path("recurring").path("interval_count").isIntegralNumber() || !item.path("price").path("recurring").path("interval_count").canConvertToLong() || item.path("price").path("recurring").path("interval_count").asLong()!=1 || (item.hasNonNull("current_period_end") && (!item.path("current_period_end").isIntegralNumber() || !item.path("current_period_end").canConvertToLong() || item.path("current_period_end").asLong()<0 || item.path("current_period_end").asLong()>253402300799L))) throw unconfirmed();
        if(intent.subscriptionId()==null) {
            var attempt=flow.latest(id).orElseThrow(BillingCheckoutStore::unconfirmed);
            if(attempt.sessionId()==null || !subscriptionId.equals(reference(stripe.session(attempt.sessionId()).path("subscription")))) throw unconfirmed();
        }
        history.observe(id,intent.liveMode(),"SUBSCRIPTION",subscriptionId,subscription.path("status").asText(),draft.amountPence(),"Agreed monthly amount; cancel at period end: "+subscription.path("cancel_at_period_end").asBoolean()+"; period end: "+(item.path("current_period_end").isIntegralNumber() ? item.path("current_period_end").asLong() : "unknown"));
        var invoice=subscription.path("latest_invoice");
        flow.subscription(id,subscriptionId,subscription.path("status").asText(),subscription.path("cancel_at_period_end").asBoolean(),item.path("current_period_end").isIntegralNumber() ? item.path("current_period_end").asLong() : null,reference(invoice),invoice.path("status").asText(null),invoice.isObject() ? stripe.trustedInvoiceUrl(invoice) : null);
        if(invoice.isObject() && reference(invoice)!=null)reconcileSubscriptionInvoice(id,reference(invoice));
    }
    @Transactional public void reconcileInvoice(UUID id,String invoiceId) {
        var intent=flow.intent(id,true).orElseThrow(BillingCheckoutStore::missing); var draft=drafts.draft(id).orElseThrow(BillingCheckoutStore::missing);
        if(draft.purpose().equals("MONTHLY") || intent.liveMode()!=stripe.liveMode()) throw unconfirmed();
        var invoice=stripe.invoice(invoiceId);if(!invoiceId.equals(reference(invoice)) || !invoice.path("amount_paid").isIntegralNumber() || !invoice.path("amount_paid").canConvertToLong())throw unconfirmed(); var attempt=flow.latest(id).orElseThrow(BillingCheckoutStore::unconfirmed);
        if(attempt.sessionId()==null || !invoiceId.equals(reference(stripe.session(attempt.sessionId()).path("invoice"))) || !flow.customer(intent.accountId(),intent.liveMode()).orElseThrow(BillingCheckoutStore::unconfirmed).equals(reference(invoice.path("customer"))) || !"gbp".equals(invoice.path("currency").asText()) || invoice.path("total").asLong(-1)!=draft.amountPence()) throw unconfirmed();
        recordInvoice(id,intent,invoice);
        history.observe(id,intent.liveMode(),"INVOICE",invoiceId,invoice.path("status").asText(),invoice.path("total").asLong(),"Invoice total; amount paid: "+invoice.path("amount_paid").asLong(-1)+" pence. Paid status can include credits or outside payments.");
        if(invoice.path("status").asText().equals("paid")) flow.payment(id,true);
        flow.receipt(id,invoiceId,invoice.path("status").asText(),stripe.trustedInvoiceUrl(invoice));
    }
    @Transactional public void reconcileSubscriptionInvoice(UUID id,String invoiceId) {
        var intent=flow.intent(id,true).orElseThrow(BillingCheckoutStore::missing);var draft=drafts.draft(id).orElseThrow(BillingCheckoutStore::missing);
        if(!draft.purpose().equals("MONTHLY") || intent.subscriptionId()==null || intent.liveMode()!=stripe.liveMode())throw unconfirmed();
        var invoice=stripe.invoice(invoiceId);String subscription=reference(invoice.path("parent").path("subscription_details").path("subscription"));
        if(!invoiceId.equals(reference(invoice)) || !intent.subscriptionId().equals(subscription) || !flow.customer(intent.accountId(),intent.liveMode()).orElseThrow(BillingCheckoutStore::unconfirmed).equals(reference(invoice.path("customer"))) || !"gbp".equals(invoice.path("currency").asText()) || !invoice.path("total").isIntegralNumber() || !invoice.path("amount_paid").isIntegralNumber() || !invoice.path("total").canConvertToLong() || !invoice.path("amount_paid").canConvertToLong())throw unconfirmed();
        recordInvoice(id,intent,invoice);
        history.observe(id,intent.liveMode(),"INVOICE",invoiceId,invoice.path("status").asText(),invoice.path("total").asLong(),"Verified subscription invoice total; amount paid: "+invoice.path("amount_paid").asLong()+" pence. Credits/outside payments are not separate Stripe cash collections. This snapshot does not authorise price changes.");
        invoices.enqueue(id,invoiceId,org.apache.commons.codec.digest.DigestUtils.sha256Hex(invoice.path("status").asText()+"|"+invoice.path("total").asLong()+"|"+invoice.path("amount_paid").asLong()));
    }
    private Bill view(BillingRepository.Draft draft,BillingFlowRepository.Intent intent) { return new Bill(draft.id(),draft.purpose(),draft.title(),draft.amountPence(),draft.currency(),draft.terms(),intent.paymentState(),intent.subscriptionState(),intent.cancelAtPeriodEnd(),intent.periodEnd(),intent.invoiceState(),intent.invoiceUrl(),flow.latest(draft.id()).map(BillingFlowRepository.Attempt::state).orElse("AVAILABLE"),intent.issuedAt(),intent.withdrawalRequestedAt()!=null && intent.withdrawnAt()==null,intent.withdrawnAt()!=null); }
    public static String reference(JsonNode object) { return object.isTextual() ? object.asText() : object.path("id").asText(null); }
    public static UUID uuid(String value) { try { return UUID.fromString(value); } catch(Exception invalid) { throw unconfirmed(); } }
    private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"This issued payment request is unavailable."); }
    private static ResponseStatusException unconfirmed() { return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Payment details could not be reconciled. No new charge has been authorised; contact the team if this persists."); }
}
