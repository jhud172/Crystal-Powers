package com.crystalpower.website.service;

import org.springframework.stereotype.Service;

/** Ledger refresh uses a separate transaction so shared-payment lock ordering stays consistent. */
@Service
public class RefundResultService {
    private final RefundResultStore results;
    private final BillingLedgerService ledger;
    public RefundResultService(RefundResultStore results,BillingLedgerService ledger) { this.results=results;this.ledger=ledger; }
    public RefundResultStore.Result reconcile(RefundDraftService.ExecutionPlan plan,String id) {
        var result=results.observe(plan,id);
        ledger.adjustment("REFUND",id);
        boolean reconciled=results.markLedger(result);
        return new RefundResultStore.Result(result.proposalId(),result.billId(),result.providerId(),result.state(),result.version(),reconciled);
    }
}
