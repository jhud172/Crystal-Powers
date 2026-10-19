package com.crystalpower.website.service;

import com.crystalpower.website.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.Objects;
import java.util.UUID;

/** Internal provider-result persistence; does not create a refund or impersonate an HTTP actor. */
@Service
public class RefundResultStore {
    public record Result(UUID proposalId,UUID billId,String providerId,String state,int version,boolean ledgerReconciled) {}
    private final RefundRepository refunds;
    private final BillingFlowRepository flow;
    private final BillingRepository bills;
    private final SupportRepository support;
    private final BillingLedgerRepository payments;
    private final BillingHistoryRepository history;
    private final StripeGateway stripe;
    private final BillingLedgerService reconciliation;
    public RefundResultStore(RefundRepository refunds,BillingFlowRepository flow,BillingRepository bills,SupportRepository support,BillingLedgerRepository payments,BillingHistoryRepository history,StripeGateway stripe,BillingLedgerService reconciliation) { this.refunds=refunds;this.flow=flow;this.bills=bills;this.support=support;this.payments=payments;this.history=history;this.stripe=stripe;this.reconciliation=reconciliation; }
    @Transactional
    public java.util.Optional<RefundDraftService.ExecutionPlan> webhookPlan(String providerId) {
        var resource=stripe.refund(providerId);String metadata=resource.path("metadata").path("crystal_refund_id").asText("");RefundRepository.Proposal proposal;
        if(metadata.isBlank()){var known=refunds.provider(providerId);if(known.isEmpty())return java.util.Optional.empty();proposal=known.get();}
        else{UUID id;try{id=UUID.fromString(metadata);if(!id.toString().equals(metadata))throw new IllegalArgumentException();}catch(IllegalArgumentException failure){throw unconfirmed();}proposal=refunds.byId(id).orElseThrow(RefundResultStore::unconfirmed);}
        if(proposal.liveMode()!=stripe.liveMode() || proposal.state().equals("DRAFT") || proposal.state().equals("CANCELLED"))throw unconfirmed();
        var intent=flow.intent(proposal.billId(),false).orElseThrow(RefundResultStore::unconfirmed);var bill=bills.draft(proposal.billId()).orElseThrow(RefundResultStore::unconfirmed);var lease=refunds.execution(proposal.id()).orElseThrow(RefundResultStore::unconfirmed);
        if(intent.liveMode()!=proposal.liveMode() || lease.firstSubmissionAt()==null)throw unconfirmed();
        String customer=flow.customer(intent.accountId(),intent.liveMode()).orElseThrow(RefundResultStore::unconfirmed);
        return java.util.Optional.of(new RefundDraftService.ExecutionPlan(bill.requestId(),bill.id(),proposal.id(),proposal.paymentId(),proposal.chargeId(),proposal.liveMode(),proposal.amountPence(),proposal.reason(),customer,lease));
    }
    @Transactional
    public Result observe(RefundDraftService.ExecutionPlan plan,String id) {
        if(plan==null || plan.lease()==null || id==null || id.length()>100 || !id.matches("re_[A-Za-z0-9]+") || plan.liveMode()!=stripe.liveMode())throw unconfirmed();
        var intent=flow.intent(plan.billId(),true).orElseThrow(RefundResultStore::unconfirmed);if(intent.liveMode()!=plan.liveMode())throw unconfirmed();
        var bill=bills.draft(plan.billId()).orElseThrow(RefundResultStore::unconfirmed);if(!bill.requestId().equals(plan.requestId()))throw unconfirmed();support.request(bill.workspaceId(),bill.requestId(),false).orElseThrow(RefundResultStore::unconfirmed);
        payments.lockPayment(plan.paymentId());var proposal=refunds.lock(plan.billId(),plan.liveMode(),plan.proposalId()).orElseThrow(RefundResultStore::unconfirmed);var confirmed=refunds.execution(proposal.id()).orElseThrow(RefundResultStore::unconfirmed);
        String customer=flow.customer(intent.accountId(),intent.liveMode()).orElseThrow(RefundResultStore::unconfirmed);
        if(proposal.state().equals("DRAFT") || proposal.state().equals("CANCELLED") || !proposal.paymentId().equals(plan.paymentId()) || !proposal.chargeId().equals(plan.chargeId()) || proposal.amountPence()!=plan.amountPence() || !proposal.reason().equals(plan.reason()) || !customer.equals(plan.customer()) || confirmed.firstSubmissionAt()==null || plan.lease().firstSubmissionAt()==null || !Objects.equals(confirmed.firstSubmissionAt(),plan.lease().firstSubmissionAt()) || (proposal.providerId()!=null && !proposal.providerId().equals(id)) || (proposal.candidateProviderId()!=null && !proposal.candidateProviderId().equals(id)) || refunds.foreignLink(plan.paymentId(),bill.workspaceId(),intent.accountId(),plan.liveMode()))throw unconfirmed();
        var refund=stripe.refund(id);var charge=stripe.charge(proposal.chargeId());var amount=refund.path("amount");String pi=BillingCheckoutStore.reference(charge.path("payment_intent"));var payment=refunds.payment(plan.billId(),plan.liveMode(),plan.paymentId()).orElseThrow(RefundResultStore::unconfirmed);
        boolean legacy=payment.kind().equals("CHARGE");if(legacy)reconciliation.verifyLegacyInvoice(plan.paymentId(),customer,plan.liveMode());
        if(!id.equals(BillingCheckoutStore.reference(refund)) || !"refund".equals(refund.path("object").asText()) || !proposal.chargeId().equals(BillingCheckoutStore.reference(refund.path("charge"))) || !"gbp".equals(refund.path("currency").asText()) || !amount.isIntegralNumber() || !amount.canConvertToLong() || amount.asLong()!=proposal.amountPence() || !proposal.reason().equals(refund.path("reason").asText()) || !proposal.id().toString().equals(refund.path("metadata").path("crystal_refund_id").asText()) || !proposal.chargeId().equals(BillingCheckoutStore.reference(charge)) || !"charge".equals(charge.path("object").asText()) || !"gbp".equals(charge.path("currency").asText()) || (legacy ? BillingCheckoutStore.reference(charge.path("customer"))!=null && !customer.equals(BillingCheckoutStore.reference(charge.path("customer"))) : !customer.equals(BillingCheckoutStore.reference(charge.path("customer")))) || (BillingCheckoutStore.reference(refund.path("customer"))!=null && !customer.equals(BillingCheckoutStore.reference(refund.path("customer")))) || (payment.kind().equals("PAYMENT_INTENT") ? !payment.id().equals(pi) || !payment.id().equals(BillingCheckoutStore.reference(refund.path("payment_intent"))) : !payment.kind().equals("CHARGE") || pi!=null || BillingCheckoutStore.reference(refund.path("payment_intent"))!=null || !payment.id().equals(proposal.chargeId())))throw unconfirmed();
        String providerState=refund.path("status").asText();String state=switch(providerState){case "pending","requires_action" -> "PENDING";case "succeeded" -> "SUCCEEDED";case "failed","canceled" -> "FAILED";default -> throw unconfirmed();};
        if(!Objects.equals(proposal.providerId(),id) || !Objects.equals(proposal.providerState(),providerState) || !proposal.state().equals(state)){
            if(refunds.result(proposal,id,providerState,state)!=1)throw unconfirmed();
            history.observe(plan.billId(),plan.liveMode(),"REFUND",id,providerState,proposal.amountPence(),"Provider-confirmed refund operation; cash ledger reconciliation is tracked separately.");
            proposal=refunds.proposal(plan.billId(),plan.liveMode(),proposal.id()).orElseThrow(RefundResultStore::unconfirmed);
        }
        return new Result(proposal.id(),proposal.billId(),id,proposal.state(),proposal.version(),proposal.ledgerReconciled());
    }
    @Transactional
    public boolean markLedger(Result result) { return refunds.ledgerReconciled(result.proposalId(),result.version(),result.providerId())==1; }
    private static ResponseStatusException unconfirmed() { return new ResponseStatusException(HttpStatus.CONFLICT,"The refund result could not be verified. Keep this operation for financial review; do not create a replacement refund."); }
}
