package com.crystalpower.website.service;

import com.crystalpower.website.repository.BillingRepository;
import com.crystalpower.website.repository.SupportRepository;
import com.crystalpower.website.repository.BillingFlowRepository;
import com.crystalpower.website.repository.ClientRepository;
import com.crystalpower.website.repository.TeamIdentityRepository;
import com.crystalpower.website.security.TeamPermission;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class BillingDraftService {
    public record Draft(UUID id, String purpose, String title, long amountPence, String currency, String terms, String state, java.time.OffsetDateTime createdAt, boolean issued, String subscriptionState, boolean withdrawalPending, boolean withdrawn) {}
    public record WithdrawalPlan(UUID billId,String sessionId,boolean done) {}
    private final TeamAccessService access;
    private final SupportRepository support;
    private final BillingRepository billing;
    private final BillingFlowRepository flow;
    private final ClientRepository clients;
    private final StripeGateway stripe;
    private final BillingCheckoutStore checkout;
    private final TeamIdentityRepository teams;
    private final com.crystalpower.website.repository.BillingHistoryRepository history;
    public BillingDraftService(TeamAccessService access, SupportRepository support, BillingRepository billing, BillingFlowRepository flow, ClientRepository clients, StripeGateway stripe, BillingCheckoutStore checkout,com.crystalpower.website.repository.BillingHistoryRepository history,TeamIdentityRepository teams) { this.access = access; this.support = support; this.billing = billing; this.flow=flow; this.clients=clients; this.stripe=stripe; this.checkout=checkout;this.history=history;this.teams=teams; }
    private TeamAccessService.Actor actor(Authentication authentication, UUID request, boolean manage) {
        var actor = access.resolve(authentication); actor.require(TeamPermission.READ_SUPPORT);
        if(manage){
            actor.require(TeamPermission.MANAGE_BILLING);
            // Match support/client/refund lock order and reject authority revoked during the wait.
            teams.lockWorkspace(actor.workspaceId());actor=access.resolveLocked(authentication);
            actor.require(TeamPermission.READ_SUPPORT);actor.require(TeamPermission.MANAGE_BILLING);
        }
        support.claimUnassigned(actor.workspaceId());
        support.request(actor.workspaceId(), request, true).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "This request is unavailable."));
        return actor;
    }
    @Transactional
    public List<Draft> list(Authentication auth, UUID request) { var actor = actor(auth, request, false); return billing.list(actor.workspaceId(), request).stream().map(this::view).toList(); }
    public record Recovery(String actorScope,List<Draft> drafts) {}
    @Transactional
    public Recovery recoverRefundForms(Authentication auth,UUID request,List<UUID> ids) {
        var actor=actor(auth,request,true);actor.require(TeamPermission.READ_SUPPORT);
        if(ids==null || ids.size()>50 || ids.stream().anyMatch(Objects::isNull) || ids.stream().distinct().count()!=ids.size())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose at most 50 different payment requests for recovery.");
        var allowed=new java.util.ArrayList<Draft>();
        for(UUID id:ids){var draft=billing.draft(id).orElse(null);var intent=flow.intent(id,false).orElse(null);if(draft!=null && intent!=null && draft.workspaceId().equals(actor.workspaceId()) && draft.requestId().equals(request) && intent.liveMode()==stripe.liveMode())allowed.add(view(draft));}
        return new Recovery(actor.memberId()!=null ? "TEAM:"+actor.memberId() : "OWNER:"+actor.ownerId(),allowed);
    }
    public record Page(List<Draft> items,String nextCursor,long total,long unissued) {}
    @Transactional
    public Page page(Authentication auth,UUID request,String before) {
        var actor=actor(auth,request,false);BillingRepository.Draft cursor=null;
        if(before!=null){UUID id;try{id=UUID.fromString(before);if(!id.toString().equals(before))throw new IllegalArgumentException();}catch(IllegalArgumentException failure){throw new ResponseStatusException(HttpStatus.NOT_FOUND,"This payment page is unavailable.");}cursor=billing.anchor(actor.workspaceId(),request,id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"This payment page is unavailable."));}
        var rows=billing.page(actor.workspaceId(),request,cursor);boolean more=rows.size()>50;var items=more ? rows.subList(0,50) : rows;
        return new Page(items.stream().map(this::view).toList(),more ? items.get(items.size()-1).id().toString() : null,billing.total(actor.workspaceId(),request),billing.unissuedTotal(actor.workspaceId(),request));
    }
    @Transactional
    public Draft create(Authentication auth, UUID request, UUID key, String purpose, String title, long pence, String terms) {
        var actor = actor(auth, request, true);
        if (key == null || purpose == null || !purpose.matches("FULL|DEPOSIT|BALANCE|MONTHLY") || title == null || title.length() > 200 || terms == null || terms.length() > 3000 || pence < 1 || pence > 99999999) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Check the GBP amount, payment type, description and terms.");
        String cleanTitle = title.strip(), cleanTerms = terms.strip();
        if (cleanTitle.isEmpty() || cleanTerms.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Describe the payment and its agreed terms.");
        var existing = billing.submission(key);
        if (existing.isPresent()) {
            var draft = existing.get();
            if (!draft.workspaceId().equals(actor.workspaceId()) || !draft.requestId().equals(request) || !draft.purpose().equals(purpose) || !draft.title().equals(cleanTitle) || draft.amountPence() != pence || !draft.terms().equals(cleanTerms) || !Objects.equals(draft.createdByOwner(), actor.ownerId()) || !Objects.equals(draft.createdByTeam(), actor.memberId())) throw new ResponseStatusException(HttpStatus.CONFLICT, "This submission was already used for a different payment draft.");
            return view(draft);
        }
        if (billing.unissuedTotal(actor.workspaceId(), request) >= 100) throw new ResponseStatusException(HttpStatus.CONFLICT, "This request already has 100 unissued drafts. Review, issue or cancel existing drafts before adding another.");
        var draft = billing.insert(actor.workspaceId(), request, key, purpose, cleanTitle, pence, cleanTerms, actor.ownerId(), actor.memberId());
        support.event(request, actor.ownerId(), actor.memberId(), "BILLING_DRAFT_SAVED", "A GBP " + purpose.toLowerCase() + " payment draft was saved for admin review. No payment was requested or collected.", false);
        return view(draft);
    }
    @Transactional
    public void cancel(Authentication auth, UUID request, UUID id) {
        var actor = actor(auth, request, true);
        if (billing.cancel(actor.workspaceId(), request, id) != 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "This draft is unavailable or already cancelled. Reload its status.");
        support.event(request, actor.ownerId(), actor.memberId(), "BILLING_DRAFT_CANCELLED", "An unissued payment draft was cancelled. No charge or subscription was changed.", false);
    }
    @Transactional public Object settings(Authentication auth,UUID request) { actor(auth,request,false); return java.util.Map.of("paymentsEnabled",stripe.configured(),"managementEnabled",stripe.connected(),"liveMode",stripe.liveMode()); }
    @Transactional public Draft issue(Authentication auth,UUID request,UUID id) {
        var actor=actor(auth,request,true); stripe.requireConfigured(); var draft=billing.draft(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"This payment draft is unavailable."));
        if(!draft.workspaceId().equals(actor.workspaceId()) || !draft.requestId().equals(request) || !draft.state().equals("DRAFT")) throw new ResponseStatusException(HttpStatus.CONFLICT,"This payment draft cannot be issued.");
        if(flow.intent(id,false).isPresent()) return view(draft);
        var client=clients.linked(actor.workspaceId(),request).orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,"Link a client account before issuing a payment request."));
        client=clients.account(client.id(),true).orElseThrow();
        if(client.state().equals("SUSPENDED")) throw new ResponseStatusException(HttpStatus.CONFLICT,"Restore verified client access before issuing this request.");
        flow.issue(id,client.id(),stripe.liveMode());history.observe(id,stripe.liveMode(),"REQUEST",id.toString(),"ISSUED",draft.amountPence(),"Immutable payment request issued; purpose: "+draft.purpose()+". No payment collected.");
        support.event(request,actor.ownerId(),actor.memberId(),"PAYMENT_REQUEST_ISSUED","An agreed GBP "+draft.purpose().toLowerCase()+" payment request is available in your client billing workspace. No payment has been collected.",true);
        return view(draft);
    }
    @Transactional public Draft reconcile(Authentication auth,UUID request,UUID id,String sessionId) {
        var actor=actor(auth,request,true); var draft=billing.draft(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"This payment request is unavailable."));
        if(!draft.workspaceId().equals(actor.workspaceId()) || !draft.requestId().equals(request)) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"This payment request is unavailable.");
        checkout.reconcileSession(id,sessionId); support.event(request,actor.ownerId(),actor.memberId(),"PAYMENT_RECONCILED","An admin reconciled a checkout against verified Stripe data.",false); return view(draft);
    }
    @Transactional public WithdrawalPlan beginWithdrawal(Authentication auth,UUID request,UUID id) {
        var actor=actor(auth,request,true); var draft=billing.draft(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"This issued payment request is unavailable."));
        if(!draft.workspaceId().equals(actor.workspaceId()) || !draft.requestId().equals(request)) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"This issued payment request is unavailable.");
        var intent=flow.intent(id,true).orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,"This request has not been issued. Cancel its draft instead."));
        if(intent.withdrawnAt()!=null) return new WithdrawalPlan(id,null,true);
        if(intent.liveMode()!=stripe.liveMode()) throw new ResponseStatusException(HttpStatus.CONFLICT,"Use the matching Stripe environment before withdrawing this request.");
        if(!intent.paymentState().equals("ISSUED") || intent.subscriptionId()!=null) {
            if(intent.withdrawalRequestedAt()!=null) return new WithdrawalPlan(id,null,false);
            throw new ResponseStatusException(HttpStatus.CONFLICT,"A payment or subscription may already exist. Reconcile it and use the separate refund/cancellation workflow.");
        }
        var attempt=flow.latest(id).orElse(null);
        if(attempt!=null && (attempt.sessionId()==null || attempt.leaseUntil()>java.time.Instant.now().getEpochSecond())) throw new ResponseStatusException(HttpStatus.CONFLICT,"Checkout is still being prepared or its outcome is unknown. Reconcile it before withdrawal.");
        flow.requestWithdrawal(id);
        return new WithdrawalPlan(id,attempt==null ? null : attempt.sessionId(),false);
    }
    @Transactional public boolean finishWithdrawal(Authentication auth,UUID request,UUID id) {
        var actor=actor(auth,request,true); var draft=billing.draft(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"This issued payment request is unavailable."));
        if(!draft.workspaceId().equals(actor.workspaceId()) || !draft.requestId().equals(request)) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"This issued payment request is unavailable.");
        var intent=flow.intent(id,true).orElseThrow(); if(intent.withdrawnAt()!=null) return true;
        if(!intent.paymentState().equals("ISSUED") || intent.subscriptionId()!=null) { flow.withdrawalFailed(id); support.event(request,actor.ownerId(),actor.memberId(),"WITHDRAWAL_REQUIRES_REVIEW","Payment/subscription completion prevented unpaid-request withdrawal. Financial review is required.",false); return false; }
        var attempt=flow.latest(id).orElse(null);
        if(intent.withdrawalRequestedAt()==null || (attempt!=null && !attempt.state().equals("EXPIRED"))) throw new ResponseStatusException(HttpStatus.CONFLICT,"Checkout expiry has not been confirmed. Withdrawal remains pending.");
        flow.withdraw(id);history.observe(id,intent.liveMode(),"REQUEST",id.toString(),"WITHDRAWN",draft.amountPence(),"Unpaid request withdrawn after checkout expiry checks. No refund or subscription cancellation."); support.event(request,actor.ownerId(),actor.memberId(),"PAYMENT_REQUEST_WITHDRAWN","The unpaid payment request was withdrawn. It cannot open a new checkout; no refund or subscription cancellation was performed.",true); return true;
    }
    private Draft view(BillingRepository.Draft d) { var intent=flow.intent(d.id(),false).orElse(null); return new Draft(d.id(), d.purpose(), d.title(), d.amountPence(), d.currency(), d.terms(), intent==null ? d.state() : intent.paymentState(), d.createdAt(), intent!=null, intent==null ? "NOT_STARTED" : intent.subscriptionState(),intent!=null && intent.withdrawalRequestedAt()!=null && intent.withdrawnAt()==null,intent!=null && intent.withdrawnAt()!=null); }
}
