package com.crystalpower.website.service;

import com.crystalpower.website.repository.*;
import com.crystalpower.website.security.TeamPermission;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.UUID;

@Service
public class BillingLedgerService {
    public record Page<T>(List<T> items,String nextCursor,boolean liveMode) {}
    private final BillingLedgerRepository ledger;
    private final BillingFlowRepository flow;
    private final BillingRepository bills;
    private final SupportRepository requests;
    private final TeamAccessService access;
    private final StripeGateway stripe;
    public BillingLedgerService(BillingLedgerRepository ledger,BillingFlowRepository flow,BillingRepository bills,SupportRepository requests,TeamAccessService access,StripeGateway stripe) { this.ledger=ledger;this.flow=flow;this.bills=bills;this.requests=requests;this.access=access;this.stripe=stripe; }
    /** The caller must first prove a checkout/invoice allocation belongs to this bill. */
    @Transactional public void payment(UUID bill,String id,String allocation,String invoice,long allocated) {
        var intent=flow.intent(bill,true).orElseThrow(BillingLedgerService::missing);if(intent.liveMode()!=stripe.liveMode())throw missing();
        ledger.lockPayment(id);
        var payment=stripe.paymentIntent(id);String customer=flow.customer(intent.accountId(),intent.liveMode()).orElseThrow(BillingLedgerService::unconfirmed);
        if(!id.equals(reference(payment)) || !"payment_intent".equals(payment.path("object").asText()) || !customer.equals(reference(payment.path("customer"))) || !"gbp".equals(payment.path("currency").asText()))throw unconfirmed();
        long amount=money(payment,"amount"),received=money(payment,"amount_received");if(invoice==null){if(amount!=bills.draft(bill).orElseThrow(BillingLedgerService::missing).amountPence())throw unconfirmed();if(allocated==-1)allocated=received;}if(received>amount || allocated<0 || allocated>received)throw unconfirmed();
        String charge=reference(payment.path("latest_charge"));String receipt=null;long captured=0,refunded=0;boolean disputed=false;
        if(charge!=null){var resource=stripe.charge(charge);if(!charge.equals(reference(resource)) || !"charge".equals(resource.path("object").asText()) || !java.util.Set.of("pending","succeeded","failed").contains(resource.path("status").asText()) || !id.equals(reference(resource.path("payment_intent"))) || !customer.equals(reference(resource.path("customer"))) || !"gbp".equals(resource.path("currency").asText()))throw unconfirmed();captured=money(resource,"amount_captured");refunded=money(resource,"amount_refunded");if(captured>amount || refunded>captured)throw unconfirmed();if(!resource.path("disputed").isBoolean())throw unconfirmed();disputed=resource.path("disputed").asBoolean();if("succeeded".equals(resource.path("status").asText()) && captured>0)receipt=stripe.trustedReceiptUrl(resource);}
        if(!java.util.Set.of("requires_payment_method","requires_confirmation","requires_action","processing","requires_capture","canceled","succeeded").contains(payment.path("status").asText()) || (charge==null && received>0))throw unconfirmed();
        ledger.payment(id,customer,intent.liveMode(),payment.path("status").asText(),amount,received,charge,captured,refunded,disputed);if(ledger.receipt(id,charge,intent.liveMode(),receipt)!=1)throw unconfirmed();ledger.link(bill,id,allocation,invoice,allocated);
    }
    /** Direct charges obtain ownership from an already verified invoice allocation, not a fabricated PI/customer. */
    @Transactional public void legacyCharge(UUID bill,String id,String allocation,String invoiceId,long allocated) {
        var intent=flow.intent(bill,true).orElseThrow(BillingLedgerService::missing);if(intent.liveMode()!=stripe.liveMode() || invoiceId==null || intent.subscriptionId()==null)throw unconfirmed();
        ledger.lockPayment(id);var invoice=stripe.invoice(invoiceId);String expected=flow.customer(intent.accountId(),intent.liveMode()).orElseThrow(BillingLedgerService::unconfirmed);
        if(!invoiceId.equals(reference(invoice)) || !expected.equals(reference(invoice.path("customer"))) || !intent.subscriptionId().equals(reference(invoice.path("parent").path("subscription_details").path("subscription"))) || !"gbp".equals(invoice.path("currency").asText()))throw unconfirmed();
        var charge=stripe.charge(id);String customer=reference(charge.path("customer"));
        if(!id.equals(reference(charge)) || !"charge".equals(charge.path("object").asText()) || reference(charge.path("payment_intent"))!=null || (customer!=null && !customer.equals(expected)) || !"gbp".equals(charge.path("currency").asText()) || !charge.path("disputed").isBoolean())throw unconfirmed();
        long amount=money(charge,"amount"),captured=money(charge,"amount_captured"),refunded=money(charge,"amount_refunded");if(captured>amount || refunded>captured || allocated<0 || allocated>captured || !java.util.Set.of("pending","succeeded","failed").contains(charge.path("status").asText()))throw unconfirmed();
        ledger.payment(id,"CHARGE",customer,intent.liveMode(),charge.path("status").asText(),amount,captured,id,captured,refunded,charge.path("disputed").asBoolean());if(ledger.receipt(id,id,intent.liveMode(),"succeeded".equals(charge.path("status").asText()) && captured>0 ? stripe.trustedReceiptUrl(charge) : null)!=1)throw unconfirmed();ledger.link(bill,id,allocation,invoiceId,allocated);
    }
    @Transactional public void adjustment(String kind,String id) {
        if(!java.util.Set.of("REFUND","DISPUTE").contains(kind))throw unconfirmed();
        JsonNode resource=kind.equals("REFUND") ? stripe.refund(id) : stripe.dispute(id);if(!id.equals(reference(resource)))throw unconfirmed();
        String charge=reference(resource.path("charge"));var current=stripe.charge(charge);String actualPi=reference(current.path("payment_intent"));String payment=actualPi==null ? ledger.paymentForCharge(charge).orElse(null) : actualPi;String supplied=reference(resource.path("payment_intent"));if(supplied!=null && !supplied.equals(actualPi))throw unconfirmed();
        var owned=payment==null ? java.util.Optional.<BillingLedgerRepository.Link>empty() : ledger.firstLink(payment);UUID bill=owned.map(BillingLedgerRepository.Link::bill).orElse(null);if(bill==null){if(reference(current.path("customer"))==null || flow.managedCustomer(reference(current.path("customer")),stripe.liveMode()))throw unconfirmed();return;}var intent=flow.intent(bill,true).orElseThrow(BillingLedgerService::missing);if(intent.liveMode()!=stripe.liveMode())throw missing();
        ledger.lockPayment(payment);
        resource=kind.equals("REFUND") ? stripe.refund(id) : stripe.dispute(id);
        if(!id.equals(reference(resource)) || !(kind.equals("REFUND") ? "refund" : "dispute").equals(resource.path("object").asText()) || !charge.equals(reference(resource.path("charge"))))throw unconfirmed();
        current=stripe.charge(charge);actualPi=reference(current.path("payment_intent"));supplied=reference(resource.path("payment_intent"));if(supplied!=null && !supplied.equals(actualPi))throw unconfirmed();
        String customer=flow.customer(intent.accountId(),intent.liveMode()).orElseThrow(BillingLedgerService::unconfirmed);
        if(!"gbp".equals(resource.path("currency").asText()) || !resource.path("status").asText().matches("[a-z_]{1,50}"))throw unconfirmed();
        boolean legacy=payment.startsWith("ch_");String actualCustomer=reference(current.path("customer"));
        if(!charge.equals(reference(current)) || (legacy ? actualPi!=null || !payment.equals(charge) : !payment.equals(actualPi)) || (legacy ? actualCustomer!=null && !customer.equals(actualCustomer) : !customer.equals(actualCustomer)) || !"gbp".equals(current.path("currency").asText()))throw unconfirmed();
        var link=owned.orElseThrow(BillingLedgerService::unconfirmed);if(legacy)legacyCharge(link.bill(),payment,link.reference(),link.invoice(),link.amount());else payment(link.bill(),payment,link.reference(),link.invoice(),link.amount());
        ledger.adjustment(id,payment,kind,resource.path("status").asText(),money(resource,"amount"));
    }
    private BillingFlowRepository.Intent authorised(Authentication auth,UUID request,UUID bill) { var actor=access.resolve(auth);actor.require(TeamPermission.READ_SUPPORT);requests.request(actor.workspaceId(),request,false).orElseThrow(BillingLedgerService::missing);var draft=bills.draft(bill).orElseThrow(BillingLedgerService::missing);var intent=flow.intent(bill,false).orElseThrow(BillingLedgerService::missing);if(!draft.workspaceId().equals(actor.workspaceId()) || !draft.requestId().equals(request) || intent.liveMode()!=stripe.liveMode())throw missing();return intent; }
    @Transactional(readOnly=true) public Object page(Authentication auth,UUID request,UUID bill,String kind,String after) { var intent=authorised(auth,request,bill);if(after!=null && (!after.matches("(pi_|ch_|re_|dp_)[A-Za-z0-9]+") || after.length()>100))throw unconfirmed();if(kind.equals("PAYMENTS")){if(after!=null && !ledger.hasPayment(bill,intent.liveMode(),after))throw missing();var rows=ledger.payments(bill,intent.liveMode(),after);boolean more=rows.size()>50;var items=more ? rows.subList(0,50) : rows;return new Page<>(items,more ? items.get(items.size()-1).id() : null,intent.liveMode());}if(!kind.equals("ADJUSTMENTS"))throw unconfirmed();if(after!=null && !ledger.hasAdjustment(bill,intent.liveMode(),after))throw missing();var rows=ledger.adjustments(bill,intent.liveMode(),after);boolean more=rows.size()>50;var items=more ? rows.subList(0,50) : rows;return new Page<>(items,more ? items.get(items.size()-1).id() : null,intent.liveMode()); }
    private static long money(JsonNode resource,String field) { var value=resource.path(field);if(!value.isIntegralNumber() || !value.canConvertToLong() || value.asLong()<0 || value.asLong()>9007199254740991L)throw unconfirmed();return value.asLong(); }
    private static String reference(JsonNode value) { return BillingCheckoutStore.reference(value); }
    private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"These financial records are unavailable."); }
    private static ResponseStatusException unconfirmed() { return new ResponseStatusException(HttpStatus.CONFLICT,"The payment record could not be verified. Financial review is required."); }
}
