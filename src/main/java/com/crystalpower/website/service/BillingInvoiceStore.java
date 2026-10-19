package com.crystalpower.website.service;

import com.crystalpower.website.repository.*;
import com.crystalpower.website.security.TeamPermission;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
public class BillingInvoiceStore {
    public record Lease(UUID bill,String invoice,String cursor,UUID token,int version,String customer,String subscription) {}
    public record JobView(String invoiceId,String state,OffsetDateTime leaseUntil,int version,int failures,OffsetDateTime retryAfter,boolean needsReview) {}
    public record Page<T>(List<T> items,String nextCursor) {}
    private final TeamAccessService access;
    private final SupportRepository requests;
    private final BillingRepository bills;
    private final BillingFlowRepository flow;
    private final BillingInvoiceRepository invoices;
    private final BillingLedgerService ledger;
    private final StripeGateway stripe;
    private final ClientRepository clients;
    private final TeamIdentityRepository teams;
    public BillingInvoiceStore(TeamAccessService access,SupportRepository requests,BillingRepository bills,BillingFlowRepository flow,BillingInvoiceRepository invoices,BillingLedgerService ledger,StripeGateway stripe,ClientRepository clients,TeamIdentityRepository teams) { this.access=access;this.requests=requests;this.bills=bills;this.flow=flow;this.invoices=invoices;this.ledger=ledger;this.stripe=stripe;this.clients=clients;this.teams=teams; }
    private BillingFlowRepository.Intent authorised(Authentication auth,UUID request,UUID bill,boolean write) {
        var actor=access.resolve(auth);actor.require(TeamPermission.READ_SUPPORT);
        if(write){actor.require(TeamPermission.MANAGE_BILLING);teams.lockWorkspace(actor.workspaceId());actor=access.resolveLocked(auth);actor.require(TeamPermission.READ_SUPPORT);actor.require(TeamPermission.MANAGE_BILLING);}
        requests.request(actor.workspaceId(),request,false).orElseThrow(BillingInvoiceStore::missing);
        var draft=bills.draft(bill).orElseThrow(BillingInvoiceStore::missing);var intent=flow.intent(bill,write).orElseThrow(BillingInvoiceStore::missing);
        if(!draft.workspaceId().equals(actor.workspaceId()) || !draft.requestId().equals(request) || intent.liveMode()!=stripe.liveMode())throw missing();return intent;
    }
    @Transactional public Lease begin(Authentication auth,UUID request,UUID bill,String invoice,int version) {
        var intent=authorised(auth,request,bill,true);var job=invoices.job(invoice,true).filter(value->value.billId().equals(bill)).orElseThrow(BillingInvoiceStore::missing);UUID token=UUID.randomUUID();
        if(!invoices.lease(invoice,version,token,OffsetDateTime.now(ZoneOffset.UTC)))throw conflict();
        return new Lease(bill,invoice,job.cursor(),token,version+1,flow.customer(intent.accountId(),intent.liveMode()).orElseThrow(BillingInvoiceStore::conflict),intent.subscriptionId());
    }
    @Transactional public JobView finish(Authentication auth,UUID request,Lease lease,JsonNode page) {
        authorised(auth,request,lease.bill(),true);return finishRows(lease,page,()->authorised(auth,request,lease.bill(),true));
    }
    private JobView finishRows(Lease lease,JsonNode page,Runnable recheck) {
        var job=invoices.job(lease.invoice(),true).orElseThrow(BillingInvoiceStore::missing);
        if(job.version()!=lease.version() || !lease.token().equals(job.token()) || !job.state().equals("RUNNING") || job.leaseUntil()==null || job.leaseUntil().isBefore(OffsetDateTime.now(ZoneOffset.UTC)))throw conflict();
        var rows=page.path("data");
        if(!"list".equals(page.path("object").asText()) || !rows.isArray() || rows.size()>2 || !page.path("has_more").isBoolean())throw conflict();
        String cursor=lease.cursor();Set<String> seen=new HashSet<>();
        for(var row:rows) {
            String id=row.path("id").asText(),kind=row.path("payment").path("type").asText(),state=row.path("status").asText();
            if(id.length()>100 || !id.matches("inpay_[A-Za-z0-9]+") || !seen.add(id) || id.equals(lease.cursor()) || !"invoice_payment".equals(row.path("object").asText()) || !lease.invoice().equals(BillingCheckoutStore.reference(row.path("invoice"))) || !row.path("livemode").isBoolean() || row.path("livemode").asBoolean()!=stripe.liveMode() || !"gbp".equals(row.path("currency").asText()) || !Set.of("open","paid","canceled").contains(state) || !Set.of("payment_intent","payment_record","charge").contains(kind))throw conflict();
            long requested=money(row,"amount_requested");Long paid=row.path("amount_paid").isNull() ? null : money(row,"amount_paid");if(state.equals("paid") && paid==null)throw conflict();
            String reference=BillingCheckoutStore.reference(row.path("payment").path(kind));if(reference==null || reference.length()>100 || !reference.matches(kind.equals("payment_intent") ? "pi_[A-Za-z0-9]+" : "[A-Za-z0-9_]{1,100}"))throw conflict();
            if(kind.equals("charge"))ledger.legacyCharge(lease.bill(),reference,"INVOICE_PAYMENT:"+id,lease.invoice(),paid==null ? 0 : paid);
            if(kind.equals("payment_intent"))ledger.payment(lease.bill(),reference,"INVOICE_PAYMENT:"+id,lease.invoice(),paid==null ? 0 : paid);
            invoices.allocation(id,lease.invoice(),kind,reference,state,requested,paid);cursor=id;
        }
        if(page.path("has_more").asBoolean() && rows.isEmpty())throw conflict();recheck.run();invoices.finish(lease.invoice(),lease.token(),cursor,page.path("has_more").asBoolean());return view(invoices.job(lease.invoice(),false).orElseThrow());
    }
    @Transactional public void fail(Lease lease) { invoices.fail(lease.invoice(),lease.token()); }
    @Transactional public Object page(Authentication auth,UUID request,UUID bill,String kind,String after) {
        authorised(auth,request,bill,false);if(after!=null && (after.length()>100 || !after.matches("(in_|inpay_)[A-Za-z0-9]+")))throw conflict();
        if(kind.equals("JOBS")){if(after!=null && invoices.job(after,false).filter(job->job.billId().equals(bill)).isEmpty())throw missing();var rows=invoices.jobs(bill,after);boolean more=rows.size()>50;var items=(more ? rows.subList(0,50) : rows).stream().map(BillingInvoiceStore::view).toList();return new Page<>(items,more ? items.get(items.size()-1).invoiceId() : null);}
        if(!kind.equals("ALLOCATIONS"))throw conflict();if(after!=null && !invoices.hasAllocation(bill,after))throw missing();var rows=invoices.allocations(bill,after);boolean more=rows.size()>50;var items=more ? rows.subList(0,50) : rows;return new Page<>(items,more ? items.get(items.size()-1).id() : null);
    }
    @Transactional public Object restart(Authentication auth,UUID request,UUID bill,String invoice,int version) { authorised(auth,request,bill,true);invoices.job(invoice,true).filter(job->job.billId().equals(bill)).orElseThrow(BillingInvoiceStore::missing);if(!invoices.restart(invoice,version))throw conflict();return view(invoices.job(invoice,false).orElseThrow()); }
    private BillingFlowRepository.Intent workerIntent(UUID bill) {
        stripe.requireConnected();var draft=bills.draft(bill).orElseThrow(BillingInvoiceStore::missing);var intent=flow.intent(bill,true).orElseThrow(BillingInvoiceStore::missing);
        if(intent.liveMode()!=stripe.liveMode() || !draft.purpose().equals("MONTHLY") || intent.subscriptionId()==null || intent.acceptedAt()==null)throw missing();
        requests.request(draft.workspaceId(),draft.requestId(),false).orElseThrow(BillingInvoiceStore::missing);
        var client=clients.account(intent.accountId(),false).orElseThrow(BillingInvoiceStore::missing);if(!client.workspaceId().equals(draft.workspaceId()))throw missing();return intent;
    }
    // Internal worker entry points: never exposed by an HTTP controller and never mint a user/owner principal.
    @Transactional public Lease beginSystem(String invoice,UUID bill,int version) {
        var intent=workerIntent(bill);var job=invoices.job(invoice,true).filter(value->value.billId().equals(bill)).orElseThrow(BillingInvoiceStore::missing);
        var now=OffsetDateTime.now(ZoneOffset.UTC);if(!invoices.dueNow(invoice,version))throw conflict();UUID token=UUID.randomUUID();if(!invoices.lease(invoice,version,token,now))throw conflict();
        return new Lease(bill,invoice,job.cursor(),token,version+1,flow.customer(intent.accountId(),intent.liveMode()).orElseThrow(BillingInvoiceStore::conflict),intent.subscriptionId());
    }
    @Transactional public JobView finishSystem(Lease lease,JsonNode page) { workerIntent(lease.bill());return finishRows(lease,page,()->workerIntent(lease.bill())); }
    @Transactional public void failedWorkerStart(BillingInvoiceRepository.Job snapshot) { var job=invoices.job(snapshot.invoiceId(),true).orElseThrow(BillingInvoiceStore::missing);if(!job.billId().equals(snapshot.billId()))throw missing();var intent=flow.intent(job.billId(),false).orElseThrow(BillingInvoiceStore::missing);if(intent.liveMode()!=stripe.liveMode())throw missing();invoices.failedStart(snapshot.invoiceId(),snapshot.version()); }
    private static JobView view(BillingInvoiceRepository.Job job) { return new JobView(job.invoiceId(),job.state(),job.leaseUntil(),job.version(),job.failures(),job.retryAfter(),job.failures()>=10); }
    private static long money(JsonNode resource,String name) { var value=resource.path(name);if(!value.isIntegralNumber() || !value.canConvertToLong() || value.asLong()<0)throw conflict();return value.asLong(); }
    private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"This invoice reconciliation is unavailable."); }
    private static ResponseStatusException conflict() { return new ResponseStatusException(HttpStatus.CONFLICT,"Invoice reconciliation changed or could not be confirmed. Reload and review before continuing."); }
}
