package com.crystalpower.website.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class BillingFlowRepository {
    public record Intent(UUID billId,UUID accountId,boolean liveMode,String paymentState,String subscriptionId,String subscriptionState,boolean cancelAtPeriodEnd,Long periodEnd,String invoiceId,String invoiceState,String invoiceUrl,OffsetDateTime acceptedAt,OffsetDateTime issuedAt,OffsetDateTime withdrawalRequestedAt,OffsetDateTime withdrawnAt) {}
    public record Attempt(UUID id,UUID billId,String state,long expiresAt,long leaseUntil,String sessionId,String url) {}
    public record Event(String id,String type,String objectId,long created,boolean liveMode,String state) {}
    public record PendingEvent(String id,String type,String objectId,int attempts,long retryAfter,OffsetDateTime receivedAt,OffsetDateTime lastFailureAt) {}
    public record EventCursor(String id,OffsetDateTime receivedAt) {}
    public record EventTotals(long pending,long due,long waiting,long review) {}
    private final JdbcTemplate db;
    private final RowMapper<Intent> intents=(r,n) -> new Intent(r.getObject("bill_id",UUID.class),r.getObject("account_id",UUID.class),r.getBoolean("live_mode"),r.getString("payment_state"),r.getString("subscription_id"),r.getString("subscription_state"),r.getBoolean("cancel_at_period_end"),r.getObject("period_end",Long.class),r.getString("latest_invoice_id"),r.getString("latest_invoice_state"),r.getString("invoice_url"),r.getObject("accepted_at",OffsetDateTime.class),r.getObject("issued_at",OffsetDateTime.class),r.getObject("withdrawal_requested_at",OffsetDateTime.class),r.getObject("withdrawn_at",OffsetDateTime.class));
    private final RowMapper<Attempt> attempts=(r,n) -> new Attempt(r.getObject("id",UUID.class),r.getObject("bill_id",UUID.class),r.getString("state"),r.getLong("expires_at"),r.getLong("lease_until"),r.getString("session_id"),r.getString("checkout_url"));
    public BillingFlowRepository(JdbcTemplate db) { this.db=db; }
    public Optional<Intent> intent(UUID bill,boolean lock) { return db.query("SELECT * FROM billing_intent WHERE bill_id=?"+(lock ? " FOR UPDATE" : ""),intents,bill).stream().findFirst(); }
    public Intent issue(UUID bill,UUID account,boolean liveMode) { db.update("INSERT INTO billing_intent(bill_id,account_id,live_mode) VALUES (?,?,?)",bill,account,liveMode); return intent(bill,false).orElseThrow(); }
    public Optional<String> customer(UUID account,boolean liveMode) { return db.query("SELECT customer_id FROM billing_customer WHERE account_id=? AND live_mode=?",(r,n) -> r.getString(1),account,liveMode).stream().findFirst(); }
    public boolean managedCustomer(String id,boolean liveMode) { return !db.query("SELECT account_id FROM billing_customer WHERE customer_id=? AND live_mode=?",(row,index)->row.getObject(1,UUID.class),id,liveMode).isEmpty(); }
    public void customer(UUID account,boolean liveMode,String id) { db.update("INSERT INTO billing_customer(account_id,live_mode,customer_id) SELECT ?,?,? WHERE NOT EXISTS (SELECT 1 FROM billing_customer WHERE account_id=? AND live_mode=?)",account,liveMode,id,account,liveMode); }
    private static final String CLIENT_BILLS=" FROM billing_intent i JOIN billing_payment_request b ON b.id=i.bill_id JOIN client_request cr ON cr.request_id=b.request_id AND cr.account_id=i.account_id JOIN support_request sr ON sr.id=b.request_id AND sr.workspace_id=b.workspace_id WHERE i.account_id=? AND i.live_mode=? AND b.workspace_id=?";
    public List<UUID> clientBills(UUID account,UUID workspace,boolean liveMode) { return db.query("SELECT i.bill_id"+CLIENT_BILLS+" ORDER BY i.issued_at DESC,i.bill_id DESC LIMIT 100",(r,n)->r.getObject(1,UUID.class),account,liveMode,workspace); }
    public Optional<Intent> clientBillAnchor(UUID account,UUID workspace,boolean liveMode,UUID id) { return db.query("SELECT i.*"+CLIENT_BILLS+" AND i.bill_id=?",intents,account,liveMode,workspace,id).stream().findFirst(); }
    public List<Intent> clientBillPage(UUID account,UUID workspace,boolean liveMode,Intent after) {
        var args=new java.util.ArrayList<Object>();args.add(account);args.add(liveMode);args.add(workspace);
        String cursor="";if(after!=null){cursor=" AND (i.issued_at<? OR (i.issued_at=? AND i.bill_id<?))";args.add(after.issuedAt());args.add(after.issuedAt());args.add(after.billId());}
        return db.query("SELECT i.*"+CLIENT_BILLS+cursor+" ORDER BY i.issued_at DESC,i.bill_id DESC LIMIT 51",intents,args.toArray());
    }
    public long clientBillTotal(UUID account,UUID workspace,boolean liveMode) { return db.queryForObject("SELECT COUNT(*)"+CLIENT_BILLS,Long.class,account,liveMode,workspace); }
    public Optional<Attempt> latest(UUID bill) { return db.query("SELECT * FROM billing_checkout_attempt WHERE bill_id=? ORDER BY created_at DESC,id DESC LIMIT 1",attempts,bill).stream().findFirst(); }
    public Optional<Attempt> attempt(UUID id) { return db.query("SELECT * FROM billing_checkout_attempt WHERE id=?",attempts,id).stream().findFirst(); }
    public Attempt createAttempt(UUID bill,long expiry) { UUID id=UUID.randomUUID(); db.update("INSERT INTO billing_checkout_attempt(id,bill_id,expires_at) VALUES (?,?,?)",id,bill,expiry); return attempt(id).orElseThrow(); }
    public boolean lease(UUID id,long now) { return db.update("UPDATE billing_checkout_attempt SET lease_until=? WHERE id=? AND lease_until<=? AND state IN ('PREPARING','OPEN')",now+60,id,now)==1; }
    public void release(UUID id) { db.update("UPDATE billing_checkout_attempt SET lease_until=0 WHERE id=?",id); }
    public void session(UUID id,String session,String url,String state) { db.update("UPDATE billing_checkout_attempt SET session_id=?,checkout_url=?,state=CASE WHEN state IN ('COMPLETE','EXPIRED') AND ?='OPEN' THEN state ELSE ? END,lease_until=0 WHERE id=? AND (session_id IS NULL OR session_id=?)",session,url,state,state,id,session); }
    public void uncertain(UUID id) { db.update("UPDATE billing_checkout_attempt SET state='RECONCILE_REQUIRED',lease_until=0 WHERE id=?",id); }
    public void accept(UUID bill) { db.update("UPDATE billing_intent SET accepted_at=COALESCE(accepted_at,CURRENT_TIMESTAMP) WHERE bill_id=?",bill); }
    public void payment(UUID bill,boolean paid) { db.update("UPDATE billing_intent SET payment_state=CASE WHEN payment_state='PAID' OR ? THEN 'PAID' ELSE 'PENDING' END,updated_at=CURRENT_TIMESTAMP WHERE bill_id=?",paid,bill); }
    public void subscription(UUID bill,String id,String state,boolean cancel,Long end,String invoice,String invoiceState,String invoiceUrl) { db.update("UPDATE billing_intent SET subscription_id=?,subscription_state=?,cancel_at_period_end=?,period_end=?,latest_invoice_id=?,latest_invoice_state=?,invoice_url=?,updated_at=CURRENT_TIMESTAMP WHERE bill_id=? AND (subscription_id IS NULL OR subscription_id=?)",id,state,cancel,end,invoice,invoiceState,invoiceUrl,bill,id); }
    public void receipt(UUID bill,String invoice,String state,String url) { db.update("UPDATE billing_intent SET latest_invoice_id=?,latest_invoice_state=?,invoice_url=?,updated_at=CURRENT_TIMESTAMP WHERE bill_id=?",invoice,state,url,bill); }
    public Optional<UUID> subscriptionBill(String subscription) { return db.query("SELECT bill_id FROM billing_intent WHERE subscription_id=?",(r,n) -> r.getObject(1,UUID.class),subscription).stream().findFirst(); }
    public Optional<Event> event(String id,boolean lock) { return db.query("SELECT * FROM billing_stripe_event WHERE event_id=?"+(lock ? " FOR UPDATE" : ""),(r,n) -> new Event(r.getString("event_id"),r.getString("event_type"),r.getString("object_id"),r.getLong("event_created"),r.getBoolean("live_mode"),r.getString("state")),id).stream().findFirst(); }
    public void event(String id,String type,String object,long created,boolean liveMode) { db.update("INSERT INTO billing_stripe_event(event_id,event_type,object_id,event_created,live_mode) VALUES (?,?,?,?,?)",id,type,object,created,liveMode); }
    public void eventDone(String id) { db.update("UPDATE billing_stripe_event SET state='DONE',attempts=attempts+1,processed_at=CURRENT_TIMESTAMP WHERE event_id=?",id); }
    public void requestWithdrawal(UUID bill) { db.update("UPDATE billing_intent SET withdrawal_requested_at=COALESCE(withdrawal_requested_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP WHERE bill_id=? AND withdrawn_at IS NULL",bill); }
    public void withdraw(UUID bill) { db.update("UPDATE billing_intent SET withdrawn_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE bill_id=? AND withdrawn_at IS NULL",bill); }
    public void withdrawalFailed(UUID bill) { db.update("UPDATE billing_intent SET withdrawal_requested_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE bill_id=? AND withdrawn_at IS NULL",bill); }
    public Optional<EventCursor> eventCursor(boolean liveMode,String id) { return db.query("SELECT event_id,received_at FROM billing_stripe_event WHERE live_mode=? AND event_id=?",(r,n)->new EventCursor(r.getString("event_id"),r.getObject("received_at",OffsetDateTime.class)),liveMode,id).stream().findFirst(); }
    public List<PendingEvent> pendingEvents(boolean liveMode,String filter,EventCursor after,long now) {
        String selection=switch(filter) { case "DUE" -> " AND attempts<10 AND retry_after<=?";case "WAITING" -> " AND attempts<10 AND retry_after>?";case "REVIEW" -> " AND attempts>=10";default -> ""; };
        var args=new java.util.ArrayList<Object>();args.add(liveMode);
        if(filter.equals("DUE") || filter.equals("WAITING"))args.add(now);
        String cursor=after==null ? "" : " AND (received_at>? OR (received_at=? AND event_id>?))";
        if(after!=null){args.add(after.receivedAt());args.add(after.receivedAt());args.add(after.id());}
        return db.query("SELECT * FROM billing_stripe_event WHERE state='PENDING' AND live_mode=?"+selection+cursor+" ORDER BY received_at,event_id LIMIT 51",(r,n)->new PendingEvent(r.getString("event_id"),r.getString("event_type"),r.getString("object_id"),r.getInt("attempts"),r.getLong("retry_after"),r.getObject("received_at",OffsetDateTime.class),r.getObject("last_failure_at",OffsetDateTime.class)),args.toArray());
    }
    public EventTotals eventTotals(boolean liveMode,long now) { return db.queryForObject("SELECT COUNT(*) AS pending,COALESCE(SUM(CASE WHEN attempts<10 AND retry_after<=? THEN 1 ELSE 0 END),0) AS due,COALESCE(SUM(CASE WHEN attempts<10 AND retry_after>? THEN 1 ELSE 0 END),0) AS waiting,COALESCE(SUM(CASE WHEN attempts>=10 THEN 1 ELSE 0 END),0) AS review FROM billing_stripe_event WHERE state='PENDING' AND live_mode=?",(r,n)->new EventTotals(r.getLong("pending"),r.getLong("due"),r.getLong("waiting"),r.getLong("review")),now,now,liveMode); }
    public List<String> dueEvents(boolean liveMode,long now) { return db.query("SELECT event_id FROM billing_stripe_event WHERE state='PENDING' AND live_mode=? AND retry_after<=? AND attempts<10 ORDER BY received_at,event_id LIMIT 3",(r,n)->r.getString(1),liveMode,now); }
    public void eventFailure(String id) { var current=event(id,true); if(current.isEmpty() || current.get().state().equals("DONE")) return; Integer attempts=db.queryForObject("SELECT attempts FROM billing_stripe_event WHERE event_id=?",Integer.class,id); long seconds=Math.min(3600L,60L << Math.min(6,attempts==null ? 0 : attempts)); db.update("UPDATE billing_stripe_event SET attempts=attempts+1,last_failure_at=CURRENT_TIMESTAMP,retry_after=? WHERE event_id=? AND state='PENDING'",java.time.Instant.now().getEpochSecond()+seconds,id); }
}
