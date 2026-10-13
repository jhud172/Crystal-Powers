package com.crystalpower.website.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class RefundRepository {
    public record Proposal(UUID id,UUID submissionKey,UUID billId,String paymentId,String chargeId,boolean liveMode,long amountPence,String reason,String note,String state,long capturedPence,long refundedPence,int linkedBills,UUID actorOwnerId,UUID actorTeamId,int version,String providerId,String providerState,String candidateProviderId,boolean ledgerReconciled,OffsetDateTime createdAt,OffsetDateTime updatedAt) {}
    public record Payment(String id,String kind,String chargeId,String customer,boolean liveMode) {}
    private final JdbcTemplate db;
    public RefundRepository(JdbcTemplate db) { this.db=db; }
    private final org.springframework.jdbc.core.RowMapper<Proposal> row=(r,n)->new Proposal(r.getObject("id",UUID.class),r.getObject("submission_key",UUID.class),r.getObject("bill_id",UUID.class),r.getString("payment_id"),r.getString("charge_id"),r.getBoolean("live_mode"),r.getLong("amount_pence"),r.getString("reason"),r.getString("note"),r.getString("state"),r.getLong("captured_pence"),r.getLong("refunded_pence"),r.getInt("linked_bills"),r.getObject("actor_owner_id",UUID.class),r.getObject("actor_team_id",UUID.class),r.getInt("version"),r.getString("provider_id"),r.getString("provider_state"),r.getString("candidate_provider_id"),r.getBoolean("ledger_reconciled"),r.getObject("created_at",OffsetDateTime.class),r.getObject("updated_at",OffsetDateTime.class));
    public Optional<Proposal> byId(UUID id) { return db.query("SELECT * FROM billing_refund_request WHERE id=?",row,id).stream().findFirst(); }
    public Optional<Proposal> provider(String id) { return db.query("SELECT * FROM billing_refund_request WHERE provider_id=? OR candidate_provider_id=?",row,id,id).stream().findFirst(); }
    public Optional<Proposal> submission(UUID key) { return db.query("SELECT * FROM billing_refund_request WHERE submission_key=?",row,key).stream().findFirst(); }
    public Optional<Proposal> proposal(UUID bill,boolean mode,UUID id) { return db.query("SELECT * FROM billing_refund_request WHERE bill_id=? AND live_mode=? AND id=?",row,bill,mode,id).stream().findFirst(); }
    public record Execution(UUID token,int version,OffsetDateTime firstSubmissionAt,OffsetDateTime leaseUntil) {}
    public Optional<Proposal> lock(UUID bill,boolean mode,UUID id) { return db.query("SELECT * FROM billing_refund_request WHERE bill_id=? AND live_mode=? AND id=? FOR UPDATE",row,bill,mode,id).stream().findFirst(); }
    public boolean otherActive(String charge,boolean mode,UUID id) { return Boolean.TRUE.equals(db.queryForObject("SELECT COUNT(*)>0 FROM billing_refund_request WHERE charge_id=? AND live_mode=? AND id<>? AND state IN ('RUNNING','PENDING','RECONCILE_REQUIRED')",Boolean.class,charge,mode,id)); }
    public Execution confirm(Proposal proposal,UUID owner,UUID member) {
        UUID token=UUID.randomUUID();int changed=db.update("UPDATE billing_refund_request SET state='RUNNING',confirmation_owner_id=?,confirmation_team_id=?,confirmed_at=CURRENT_TIMESTAMP,first_submission_at=COALESCE(first_submission_at,CURRENT_TIMESTAMP),lease_token=?,lease_until=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=? AND state='DRAFT'",owner,member,token,OffsetDateTime.now(java.time.ZoneOffset.UTC).plusMinutes(5),proposal.id(),proposal.version());
        if(changed!=1)throw new org.springframework.dao.OptimisticLockingFailureException("Refund proposal changed");
        return execution(proposal.id()).orElseThrow();
    }
    public Optional<Execution> execution(UUID id) { return db.query("SELECT lease_token,version,first_submission_at,lease_until FROM billing_refund_request WHERE id=? AND confirmed_at IS NOT NULL",(r,n)->new Execution(r.getObject("lease_token",UUID.class),r.getInt("version"),r.getObject("first_submission_at",OffsetDateTime.class),r.getObject("lease_until",OffsetDateTime.class)),id).stream().findFirst(); }
    public int uncertain(UUID id,Execution lease) { return db.update("UPDATE billing_refund_request SET state='RECONCILE_REQUIRED',lease_token=NULL,lease_until=NULL,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='RUNNING' AND version=? AND lease_token=?",id,lease.version(),lease.token()); }
    public int candidate(UUID id,Execution lease,String providerId) { return db.update("UPDATE billing_refund_request SET candidate_provider_id=? WHERE id=? AND state='RUNNING' AND version=? AND lease_token=? AND (candidate_provider_id IS NULL OR candidate_provider_id=?)",providerId,id,lease.version(),lease.token(),providerId); }
    public int result(Proposal proposal,String id,String providerState,String state) { return db.update("UPDATE billing_refund_request SET provider_id=?,provider_state=?,state=?,ledger_reconciled=FALSE,lease_token=NULL,lease_until=NULL,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=? AND confirmed_at IS NOT NULL AND state NOT IN ('DRAFT','CANCELLED') AND (provider_id IS NULL OR provider_id=?)",id,providerState,state,proposal.id(),proposal.version(),id); }
    public int ledgerReconciled(UUID id,int version,String providerId) { return db.update("UPDATE billing_refund_request SET ledger_reconciled=TRUE WHERE id=? AND version=? AND provider_id=?",id,version,providerId); }
    public Optional<Payment> payment(UUID bill,boolean mode,String id) { return db.query("SELECT DISTINCT p.* FROM billing_provider_payment p JOIN billing_payment_link l ON l.payment_id=p.payment_id WHERE l.bill_id=? AND p.live_mode=? AND p.payment_id=?",(r,n)->new Payment(r.getString("payment_id"),r.getString("kind"),r.getString("charge_id"),r.getString("customer_id"),r.getBoolean("live_mode")),bill,mode,id).stream().findFirst(); }
    public long draftCount(UUID bill,boolean mode) { return db.queryForObject("SELECT COUNT(*) FROM billing_refund_request WHERE bill_id=? AND live_mode=? AND state='DRAFT'",Long.class,bill,mode); }
    public int linkedBills(String payment) { return db.queryForObject("SELECT COUNT(DISTINCT bill_id) FROM billing_payment_link WHERE payment_id=?",Integer.class,payment); }
    public boolean foreignLink(String payment,UUID workspace,UUID account,boolean mode) { return Boolean.TRUE.equals(db.queryForObject("SELECT COUNT(*)>0 FROM billing_payment_link l JOIN billing_payment_request b ON b.id=l.bill_id JOIN billing_intent i ON i.bill_id=l.bill_id JOIN support_request r ON r.id=b.request_id WHERE l.payment_id=? AND (b.workspace_id<>? OR r.workspace_id IS NULL OR r.workspace_id<>? OR i.account_id<>? OR i.live_mode<>?)",Boolean.class,payment,workspace,workspace,account,mode)); }
    public Proposal insert(UUID key,UUID bill,Payment payment,long amount,String reason,String note,long captured,long refunded,int linked,UUID owner,UUID member) {
        UUID id=UUID.randomUUID();db.update("INSERT INTO billing_refund_request(id,submission_key,bill_id,payment_id,charge_id,live_mode,amount_pence,reason,note,captured_pence,refunded_pence,linked_bills,actor_owner_id,actor_team_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",id,key,bill,payment.id(),payment.chargeId(),payment.liveMode(),amount,reason,note,captured,refunded,linked,owner,member);return proposal(bill,payment.liveMode(),id).orElseThrow();
    }
    public int cancel(UUID bill,boolean mode,UUID id,int version) { return db.update("UPDATE billing_refund_request SET state='CANCELLED',version=version+1,updated_at=CURRENT_TIMESTAMP WHERE bill_id=? AND live_mode=? AND id=? AND version=? AND state='DRAFT'",bill,mode,id,version); }
    public List<Proposal> page(UUID bill,boolean mode,Proposal before) { var args=new java.util.ArrayList<Object>();args.add(bill);args.add(mode);String cursor="";if(before!=null){cursor=" AND (created_at<? OR (created_at=? AND id<?))";args.add(before.createdAt());args.add(before.createdAt());args.add(before.id());}return db.query("SELECT * FROM billing_refund_request WHERE bill_id=? AND live_mode=?"+cursor+" ORDER BY created_at DESC,id DESC LIMIT 51",row,args.toArray()); }
}
