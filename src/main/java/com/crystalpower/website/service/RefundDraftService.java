package com.crystalpower.website.service;

import com.crystalpower.website.repository.*;
import com.crystalpower.website.security.TeamPermission;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class RefundDraftService {
    public record View(UUID id,String paymentId,String chargeId,long amountPence,String reason,String note,String state,long capturedPence,long refundedPence,int linkedBills,int version,String providerId,String providerState,String candidateProviderId,boolean ledgerReconciled,java.time.OffsetDateTime createdAt) {}
    public record Page(List<View> items,String nextCursor) {}
    private record Context(TeamAccessService.Actor actor,BillingFlowRepository.Intent intent) {}
    private final TeamAccessService access;
    private final TeamIdentityRepository teams;
    private final SupportRepository support;
    private final BillingRepository bills;
    private final BillingFlowRepository flow;
    private final BillingLedgerRepository ledger;
    private final RefundRepository refunds;
    private final StripeGateway stripe;
    private final BillingLedgerService reconciliation;
    public RefundDraftService(TeamAccessService access,TeamIdentityRepository teams,SupportRepository support,BillingRepository bills,BillingFlowRepository flow,BillingLedgerRepository ledger,RefundRepository refunds,StripeGateway stripe,BillingLedgerService reconciliation) { this.access=access;this.teams=teams;this.support=support;this.bills=bills;this.flow=flow;this.ledger=ledger;this.refunds=refunds;this.stripe=stripe;this.reconciliation=reconciliation; }
    private Context context(Authentication auth,UUID request,UUID bill,boolean manage) {
        var actor=access.resolve(auth);actor.require(TeamPermission.READ_SUPPORT);if(manage){actor.require(TeamPermission.MANAGE_BILLING);teams.lockWorkspace(actor.workspaceId());actor=access.resolveLocked(auth);actor.require(TeamPermission.READ_SUPPORT);actor.require(TeamPermission.MANAGE_BILLING);}
        support.request(actor.workspaceId(),request,manage).orElseThrow(RefundDraftService::missing);var draft=bills.draft(bill).orElseThrow(RefundDraftService::missing);
        if(!draft.workspaceId().equals(actor.workspaceId()) || !draft.requestId().equals(request))throw missing();var intent=flow.intent(bill,manage).orElseThrow(RefundDraftService::missing);if(intent.liveMode()!=stripe.liveMode())throw missing();return new Context(actor,intent);
    }
    @Transactional
    public View propose(Authentication auth,UUID request,UUID bill,UUID key,String paymentId,long amount,String reason,String note) {
        var context=context(auth,request,bill,true);var actor=context.actor();var intent=context.intent();
        if(key==null || paymentId==null || paymentId.length()>100 || !paymentId.matches("(pi_|ch_)[A-Za-z0-9]+") || amount<1 || amount>99999999 || reason==null || !java.util.Set.of("requested_by_customer","duplicate","fraudulent").contains(reason) || note==null || note.isBlank() || note.length()>1000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Check the payment reference, exact GBP refund amount, reason and internal review note.");
        String cleanNote=note.strip();var existing=refunds.submission(key);if(existing.isPresent()){var saved=existing.get();if(!saved.billId().equals(bill) || saved.liveMode()!=intent.liveMode() || !saved.paymentId().equals(paymentId) || saved.amountPence()!=amount || !saved.reason().equals(reason) || !saved.note().equals(cleanNote) || !Objects.equals(saved.actorOwnerId(),actor.ownerId()) || !Objects.equals(saved.actorTeamId(),actor.memberId()))throw review();return view(saved);}
        var quote=verify(context,bill,paymentId,amount);var payment=quote.payment();long captured=quote.captured(),refunded=quote.refunded();
        if(refunds.draftCount(bill,intent.liveMode())>=100)throw new ResponseStatusException(HttpStatus.CONFLICT,"Review or cancel existing refund proposals before adding another.");
        context(auth,request,bill,true);var saved=refunds.insert(key,bill,payment,amount,reason,cleanNote,captured,refunded,refunds.linkedBills(paymentId),actor.ownerId(),actor.memberId());
        support.event(request,actor.ownerId(),actor.memberId(),"REFUND_PROPOSED","A GBP refund proposal was saved for explicit admin review. No refund was sent to Stripe.",false);return view(saved);
    }
    private record Quote(RefundRepository.Payment payment,long captured,long refunded,int linkedBills) {}
    private Quote verify(Context context,UUID bill,String paymentId,long amount) {
        var actor=context.actor();var intent=context.intent();
        stripe.requireConnected();ledger.lockPayment(paymentId);var payment=refunds.payment(bill,intent.liveMode(),paymentId).orElseThrow(RefundDraftService::missing);String customer=flow.customer(intent.accountId(),intent.liveMode()).orElseThrow(RefundDraftService::review);
        boolean legacy=payment.kind().equals("CHARGE");
        if(legacy)reconciliation.verifyLegacyInvoice(paymentId,customer,intent.liveMode());
        if(payment.chargeId()==null || (legacy ? payment.customer()!=null && !customer.equals(payment.customer()) : !customer.equals(payment.customer())) || refunds.foreignLink(paymentId,actor.workspaceId(),intent.accountId(),intent.liveMode()))throw review();
        var charge=stripe.charge(payment.chargeId());String pi=BillingCheckoutStore.reference(charge.path("payment_intent"));
        if(!payment.chargeId().equals(BillingCheckoutStore.reference(charge)) || !"charge".equals(charge.path("object").asText()) || !"gbp".equals(charge.path("currency").asText()) || (legacy ? BillingCheckoutStore.reference(charge.path("customer"))!=null && !customer.equals(BillingCheckoutStore.reference(charge.path("customer"))) : !customer.equals(BillingCheckoutStore.reference(charge.path("customer")))) || !"succeeded".equals(charge.path("status").asText()) || !charge.path("disputed").isBoolean() || charge.path("disputed").asBoolean() || (payment.kind().equals("PAYMENT_INTENT") ? !paymentId.equals(pi) : !payment.kind().equals("CHARGE") || pi!=null || !paymentId.equals(payment.chargeId())))throw review();
        long captured=money(charge,"amount_captured"),refunded=money(charge,"amount_refunded"),charged=money(charge,"amount");if(captured>charged || refunded>captured || amount>captured-refunded)throw review();
        return new Quote(payment,captured,refunded,refunds.linkedBills(paymentId));
    }
    /** Internal lease, never part of a browser response. The outer caller commits this before provider POST. */
    public record ExecutionPlan(UUID requestId,UUID billId,UUID proposalId,String paymentId,String chargeId,boolean liveMode,long amountPence,String reason,String customer,RefundRepository.Execution lease) {}
    @Transactional
    public ExecutionPlan prepareExecution(Authentication auth,UUID request,UUID bill,UUID id,int version,boolean confirmed,boolean sharedAccepted,boolean fraudAccepted) {
        var context=context(auth,request,bill,true);var initial=refunds.proposal(bill,context.intent().liveMode(),id).orElseThrow(RefundDraftService::missing);
        ledger.lockPayment(initial.paymentId());var proposal=refunds.lock(bill,context.intent().liveMode(),id).orElseThrow(RefundDraftService::missing);
        if(!confirmed || proposal.version()!=version || !proposal.state().equals("DRAFT"))throw review();
        var quote=verify(context,bill,proposal.paymentId(),proposal.amountPence());
        if(!proposal.chargeId().equals(quote.payment().chargeId()) || proposal.capturedPence()!=quote.captured() || proposal.refundedPence()!=quote.refunded() || (quote.linkedBills()>1 && !sharedAccepted) || (proposal.reason().equals("fraudulent") && !fraudAccepted) || refunds.otherActive(proposal.chargeId(),proposal.liveMode(),id))throw review();
        context(auth,request,bill,true);var actor=context.actor();var lease=refunds.confirm(proposal,actor.ownerId(),actor.memberId());
        support.event(request,actor.ownerId(),actor.memberId(),"REFUND_CONFIRMED","An admin explicitly confirmed the recorded refund amount and charge. Provider submission remains a separate outcome.",false);
        return new ExecutionPlan(request,bill,id,proposal.paymentId(),proposal.chargeId(),proposal.liveMode(),proposal.amountPence(),proposal.reason(),flow.customer(context.intent().accountId(),context.intent().liveMode()).orElseThrow(RefundDraftService::review),lease);
    }
    @Transactional
    public void validateExecution(Authentication auth,ExecutionPlan plan) {
        var context=context(auth,plan.requestId(),plan.billId(),true);ledger.lockPayment(plan.paymentId());var proposal=refunds.lock(plan.billId(),plan.liveMode(),plan.proposalId()).orElseThrow(RefundDraftService::missing);var lease=refunds.execution(plan.proposalId()).orElseThrow(RefundDraftService::review);
        if(context.intent().liveMode()!=plan.liveMode() || !proposal.paymentId().equals(plan.paymentId()) || !proposal.chargeId().equals(plan.chargeId()) || proposal.amountPence()!=plan.amountPence() || !proposal.reason().equals(plan.reason()) || !Objects.equals(flow.customer(context.intent().accountId(),plan.liveMode()).orElse(null),plan.customer()) || refunds.foreignLink(plan.paymentId(),context.actor().workspaceId(),context.intent().accountId(),plan.liveMode()) || refunds.otherActive(plan.chargeId(),plan.liveMode(),plan.proposalId()) || !proposal.state().equals("RUNNING") || !Objects.equals(lease.token(),plan.lease().token()) || lease.version()!=plan.lease().version() || lease.leaseUntil()==null || !lease.leaseUntil().isAfter(java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC)) || lease.firstSubmissionAt()==null || !lease.firstSubmissionAt().isAfter(java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC).minusHours(23)))throw review();
    }
    @Transactional
    public void candidate(ExecutionPlan plan,String id) {
        if(id==null || !id.matches("re_[A-Za-z0-9]+") || id.length()>100)throw review();
        if(refunds.candidate(plan.proposalId(),plan.lease(),id)==1)return;
        var current=refunds.lock(plan.billId(),plan.liveMode(),plan.proposalId()).orElseThrow(RefundDraftService::review);var confirmed=refunds.execution(current.id()).orElseThrow(RefundDraftService::review);
        if(!id.equals(current.providerId()) || !current.paymentId().equals(plan.paymentId()) || !current.chargeId().equals(plan.chargeId()) || current.amountPence()!=plan.amountPence() || !current.reason().equals(plan.reason()) || !Objects.equals(confirmed.firstSubmissionAt(),plan.lease().firstSubmissionAt()))throw review();
    }
    @Transactional
    public ExecutionPlan reconciliationPlan(Authentication auth,UUID request,UUID bill,UUID id,int version,String providerId) {
        var context=context(auth,request,bill,true);var initial=refunds.proposal(bill,context.intent().liveMode(),id).orElseThrow(RefundDraftService::missing);ledger.lockPayment(initial.paymentId());var proposal=refunds.lock(bill,context.intent().liveMode(),id).orElseThrow(RefundDraftService::missing);var lease=refunds.execution(id).orElseThrow(RefundDraftService::review);
        if(proposal.version()!=version || proposal.state().equals("DRAFT") || proposal.state().equals("CANCELLED") || providerId==null || !providerId.matches("re_[A-Za-z0-9]+") || providerId.length()>100 || (proposal.providerId()!=null && !proposal.providerId().equals(providerId)) || (proposal.candidateProviderId()!=null && !proposal.candidateProviderId().equals(providerId)) || (proposal.state().equals("RUNNING") && lease.leaseUntil()!=null && lease.leaseUntil().isAfter(java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC))))throw review();
        String customer=flow.customer(context.intent().accountId(),context.intent().liveMode()).orElseThrow(RefundDraftService::review);support.event(request,context.actor().ownerId(),context.actor().memberId(),"REFUND_RECONCILIATION_REQUESTED","An admin requested read-only verification of an existing provider refund. No replacement refund was requested.",false);
        return new ExecutionPlan(request,bill,id,proposal.paymentId(),proposal.chargeId(),proposal.liveMode(),proposal.amountPence(),proposal.reason(),customer,lease);
    }
    @Transactional
    public Object settings(Authentication auth,UUID request,UUID bill,boolean enabled) { context(auth,request,bill,false);return java.util.Map.of("submissionEnabled",enabled && stripe.connected(),"managementEnabled",stripe.connected()); }
    @Transactional
    public void uncertain(ExecutionPlan plan) { refunds.uncertain(plan.proposalId(),plan.lease()); }
    @Transactional
    public void cancel(Authentication auth,UUID request,UUID bill,UUID id,int version) { var context=context(auth,request,bill,true);if(refunds.cancel(bill,context.intent().liveMode(),id,version)!=1)throw review();support.event(request,context.actor().ownerId(),context.actor().memberId(),"REFUND_PROPOSAL_CANCELLED","An unsent refund proposal was cancelled. No provider refund was cancelled or created.",false); }
    @Transactional
    public View detail(Authentication auth,UUID request,UUID bill,UUID id) { var context=context(auth,request,bill,false);return view(refunds.proposal(bill,context.intent().liveMode(),id).orElseThrow(RefundDraftService::missing)); }
    @Transactional
    public Page page(Authentication auth,UUID request,UUID bill,String before) { var context=context(auth,request,bill,false);RefundRepository.Proposal cursor=null;if(before!=null){UUID id;try{id=UUID.fromString(before);if(!id.toString().equals(before))throw new IllegalArgumentException();}catch(IllegalArgumentException failure){throw missing();}cursor=refunds.proposal(bill,context.intent().liveMode(),id).orElseThrow(RefundDraftService::missing);}var rows=refunds.page(bill,context.intent().liveMode(),cursor);boolean more=rows.size()>50;var items=more ? rows.subList(0,50) : rows;return new Page(items.stream().map(this::view).toList(),more ? items.get(items.size()-1).id().toString() : null); }
    private View view(RefundRepository.Proposal p) { return new View(p.id(),p.paymentId(),p.chargeId(),p.amountPence(),p.reason(),p.note(),p.state(),p.capturedPence(),p.refundedPence(),p.linkedBills(),p.version(),p.providerId(),p.providerState(),p.candidateProviderId(),p.ledgerReconciled(),p.createdAt()); }
    private static long money(JsonNode charge,String field) { var value=charge.path(field);if(!value.isIntegralNumber() || !value.canConvertToLong() || value.asLong()<0 || value.asLong()>99999999)throw review();return value.asLong(); }
    private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"This refund proposal or payment is unavailable."); }
    private static ResponseStatusException review() { return new ResponseStatusException(HttpStatus.CONFLICT,"The refund proposal could not be verified. Reload and review the charge before continuing."); }
}
