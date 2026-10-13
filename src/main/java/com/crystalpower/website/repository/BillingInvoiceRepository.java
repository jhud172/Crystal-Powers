package com.crystalpower.website.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.util.*;
import java.time.OffsetDateTime;

@Repository
public class BillingInvoiceRepository {
    public record Job(String invoiceId,UUID billId,String state,String cursor,UUID token,OffsetDateTime leaseUntil,int version,int failures,OffsetDateTime retryAfter,OffsetDateTime lastFailureAt) {}
    public record Allocation(String id,String invoiceId,String kind,String reference,String state,long requestedPence,Long paidPence,OffsetDateTime updatedAt) {}
    private final JdbcTemplate db;
    private final RowMapper<Job> jobs=(row,index)->new Job(row.getString("invoice_id"),row.getObject("bill_id",UUID.class),row.getString("state"),row.getString("cursor_id"),row.getObject("lease_token",UUID.class),row.getObject("lease_until",OffsetDateTime.class),row.getInt("version"),row.getInt("failure_count"),row.getObject("retry_after",OffsetDateTime.class),row.getObject("last_failure_at",OffsetDateTime.class));
    public BillingInvoiceRepository(JdbcTemplate db) { this.db=db; }
    public Optional<Job> job(String invoice,boolean lock) { return db.query("SELECT * FROM billing_invoice_sync WHERE invoice_id=?"+(lock ? " FOR UPDATE" : ""),jobs,invoice).stream().findFirst(); }
    public void enqueue(UUID bill,String invoice,String fingerprint) {
        var existing=job(invoice,true);
        if(existing.isEmpty()){db.update("INSERT INTO billing_invoice_sync(invoice_id,bill_id,fingerprint) VALUES(?,?,?)",invoice,bill,fingerprint);return;}
        if(!existing.get().billId().equals(bill))throw new IllegalStateException("Invoice ownership changed");
        db.update("UPDATE billing_invoice_sync SET fingerprint=?,state='PENDING',cursor_id=NULL,lease_token=NULL,lease_until=NULL,failure_count=0,retry_after=CURRENT_TIMESTAMP,last_failure_at=NULL,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE invoice_id=? AND fingerprint<>?",fingerprint,invoice,fingerprint);
    }
    public boolean lease(String invoice,int version,UUID token,OffsetDateTime now) { return db.update("UPDATE billing_invoice_sync SET state='RUNNING',lease_token=?,lease_until=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE invoice_id=? AND version=? AND (state IN ('PENDING','ERROR') OR (state='RUNNING' AND lease_until<?))",token,now.plusMinutes(5),invoice,version,now)==1; }
    public void finish(String invoice,UUID token,String cursor,boolean more) { if(db.update("UPDATE billing_invoice_sync SET state=?,cursor_id=?,lease_token=NULL,lease_until=NULL,failure_count=0,retry_after=CURRENT_TIMESTAMP,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE invoice_id=? AND lease_token=?",more ? "PENDING" : "DONE",cursor,invoice,token)!=1)throw new IllegalStateException("Invoice lease changed"); }
    public void fail(String invoice,UUID token) {
        var job=job(invoice,true);if(job.isEmpty() || !token.equals(job.get().token()))return;
        int failures=job.get().failures()+1;var now=OffsetDateTime.now(java.time.ZoneOffset.UTC);long delay=Math.min(3600,60L << Math.min(6,failures-1));
        db.update("UPDATE billing_invoice_sync SET state='ERROR',lease_token=NULL,lease_until=NULL,failure_count=?,retry_after=?,last_failure_at=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE invoice_id=? AND lease_token=?",failures,now.plusSeconds(delay),now,invoice,token);
    }
    public List<Job> due(boolean live) { return db.query("SELECT s.* FROM billing_invoice_sync s JOIN billing_intent i ON i.bill_id=s.bill_id WHERE i.live_mode=? AND s.failure_count<10 AND s.retry_after<=CURRENT_TIMESTAMP AND (s.state IN ('PENDING','ERROR') OR (s.state='RUNNING' AND s.lease_until<CURRENT_TIMESTAMP)) ORDER BY s.retry_after,s.invoice_id LIMIT 2",jobs,live); }
    public void failedStart(String invoice,int version) {
        var current=job(invoice,true);if(current.isEmpty() || current.get().version()!=version || (current.get().state().equals("RUNNING") && current.get().leaseUntil()!=null && current.get().leaseUntil().isAfter(OffsetDateTime.now(java.time.ZoneOffset.UTC))) || current.get().state().equals("DONE"))return;
        int failures=current.get().failures()+1;var now=OffsetDateTime.now(java.time.ZoneOffset.UTC);long delay=Math.min(3600,60L << Math.min(6,failures-1));
        db.update("UPDATE billing_invoice_sync SET state='ERROR',lease_token=NULL,lease_until=NULL,failure_count=?,retry_after=?,last_failure_at=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE invoice_id=? AND version=?",failures,now.plusSeconds(delay),now,invoice,version);
    }
    public boolean restart(String invoice,int version) { return db.update("UPDATE billing_invoice_sync SET state='PENDING',cursor_id=NULL,lease_token=NULL,lease_until=NULL,failure_count=0,retry_after=CURRENT_TIMESTAMP,last_failure_at=NULL,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE invoice_id=? AND version=? AND (state<>'RUNNING' OR lease_until<CURRENT_TIMESTAMP)",invoice,version)==1; }
    public void allocation(String id,String invoice,String kind,String reference,String state,long requested,Long paid) {
        int changed=db.update("UPDATE billing_invoice_allocation SET payment_kind=?,payment_reference=?,state=?,requested_pence=?,paid_pence=?,updated_at=CURRENT_TIMESTAMP WHERE allocation_id=? AND invoice_id=? AND payment_kind=? AND (payment_reference=? OR (payment_reference IS NULL AND ? IS NULL))",kind,reference,state,requested,paid,id,invoice,kind,reference,reference);
        if(changed==0)db.update("INSERT INTO billing_invoice_allocation(allocation_id,invoice_id,payment_kind,payment_reference,state,requested_pence,paid_pence) VALUES(?,?,?,?,?,?,?)",id,invoice,kind,reference,state,requested,paid);
    }
    public List<Job> jobs(UUID bill,String after) { return db.query("SELECT * FROM billing_invoice_sync WHERE bill_id=? AND invoice_id>? ORDER BY invoice_id LIMIT 51",jobs,bill,after==null ? "" : after); }
    public List<Allocation> allocations(UUID bill,String after) { return db.query("SELECT a.* FROM billing_invoice_allocation a JOIN billing_invoice_sync s ON s.invoice_id=a.invoice_id WHERE s.bill_id=? AND a.allocation_id>? ORDER BY a.allocation_id LIMIT 51",(row,index)->new Allocation(row.getString("allocation_id"),row.getString("invoice_id"),row.getString("payment_kind"),row.getString("payment_reference"),row.getString("state"),row.getLong("requested_pence"),row.getObject("paid_pence",Long.class),row.getObject("updated_at",OffsetDateTime.class)),bill,after==null ? "" : after); }
    public boolean hasAllocation(UUID bill,String id) { return !db.query("SELECT a.allocation_id FROM billing_invoice_allocation a JOIN billing_invoice_sync s ON s.invoice_id=a.invoice_id WHERE s.bill_id=? AND a.allocation_id=?",(row,index)->row.getString(1),bill,id).isEmpty(); }
}
