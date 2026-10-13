package com.crystalpower.website.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.UUID;
import java.util.Optional;
import java.util.List;
import java.time.OffsetDateTime;

@Repository
public class BillingLedgerRepository {
    public record Payment(String id,String kind,String state,long amountPence,long receivedPence,String chargeId,long capturedPence,long refundedPence,boolean disputed,OffsetDateTime updatedAt) {}
    public record Adjustment(String id,String kind,String state,long amountPence,OffsetDateTime updatedAt) {}
    public record Link(UUID bill,String reference,String invoice,long amount) {}
    // Whole-payment data is visible only when all allocations share this bill's workspace/client/mode.
    private static final String PRIVATE_PAYMENT_SCOPE=" AND NOT EXISTS (SELECT 1 FROM billing_payment_link x JOIN billing_payment_request b ON b.id=x.bill_id JOIN billing_intent i ON i.bill_id=x.bill_id JOIN support_request sr ON sr.id=b.request_id WHERE x.payment_id=p.payment_id AND (b.workspace_id<>(SELECT workspace_id FROM billing_payment_request WHERE id=l.bill_id) OR sr.workspace_id IS NULL OR sr.workspace_id<>b.workspace_id OR i.account_id<>(SELECT account_id FROM billing_intent WHERE bill_id=l.bill_id) OR i.live_mode<>p.live_mode))";
    private final JdbcTemplate db;
    public BillingLedgerRepository(JdbcTemplate db) { this.db=db; }
    public void lockPayment(String id) {
        db.update("INSERT INTO billing_payment_mutex(payment_id) SELECT ? WHERE NOT EXISTS(SELECT 1 FROM billing_payment_mutex WHERE payment_id=?)",id,id);
        db.queryForObject("SELECT payment_id FROM billing_payment_mutex WHERE payment_id=? FOR UPDATE",String.class,id);
    }
    public void payment(String id,String customer,boolean live,String state,long amount,long received,String charge,long captured,long refunded,boolean disputed) {
        payment(id,"PAYMENT_INTENT",customer,live,state,amount,received,charge,captured,refunded,disputed);
    }
    public void payment(String id,String kind,String customer,boolean live,String state,long amount,long received,String charge,long captured,long refunded,boolean disputed) {
        int changed=db.update("UPDATE billing_provider_payment SET state=?,amount_pence=?,received_pence=?,charge_id=?,captured_pence=?,refunded_pence=?,disputed=?,updated_at=CURRENT_TIMESTAMP WHERE payment_id=? AND kind=? AND (customer_id=? OR (customer_id IS NULL AND ? IS NULL)) AND live_mode=?",state,amount,received,charge,captured,refunded,disputed,id,kind,customer,customer,live);
        if(changed==0)db.update("INSERT INTO billing_provider_payment(payment_id,kind,customer_id,live_mode,state,amount_pence,received_pence,charge_id,captured_pence,refunded_pence,disputed) VALUES(?,?,?,?,?,?,?,?,?,?,?)",id,kind,customer,live,state,amount,received,charge,captured,refunded,disputed);
    }
    public int receipt(String payment,String charge,boolean live,String url) { return db.update("UPDATE billing_provider_payment SET receipt_url=? WHERE payment_id=? AND live_mode=? AND (charge_id=? OR (charge_id IS NULL AND ? IS NULL))",url,payment,live,charge,charge); }
    public record Receipt(String id,String chargeId,String url,OffsetDateTime updatedAt) {}
    private static final String CLIENT_RECEIPTS=" FROM billing_provider_payment p JOIN billing_payment_link l ON l.payment_id=p.payment_id WHERE l.bill_id=? AND p.live_mode=? AND p.customer_id=? AND p.receipt_url IS NOT NULL AND p.captured_pence>0"+PRIVATE_PAYMENT_SCOPE;
    public List<Receipt> clientReceipts(UUID bill,boolean live,String customer,String after) { return db.query("SELECT DISTINCT p.payment_id,p.charge_id,p.receipt_url,p.updated_at"+CLIENT_RECEIPTS+" AND p.payment_id>? ORDER BY p.payment_id LIMIT 51",(row,index)->new Receipt(row.getString("payment_id"),row.getString("charge_id"),row.getString("receipt_url"),row.getObject("updated_at",OffsetDateTime.class)),bill,live,customer,after==null ? "" : after); }
    public boolean hasClientReceipt(UUID bill,boolean live,String customer,String id) { return !db.query("SELECT p.payment_id"+CLIENT_RECEIPTS+" AND p.payment_id=?",(row,index)->row.getString(1),bill,live,customer,id).isEmpty(); }
    public void link(UUID bill,String payment,String reference,String invoice,long allocation) {
        int changed=db.update("UPDATE billing_payment_link SET allocated_pence=? WHERE allocation_reference=? AND bill_id=? AND payment_id=? AND (invoice_id=? OR (invoice_id IS NULL AND ? IS NULL))",allocation,reference,bill,payment,invoice,invoice);
        if(changed==0)db.update("INSERT INTO billing_payment_link(allocation_reference,bill_id,payment_id,invoice_id,allocated_pence) VALUES(?,?,?,?,?)",reference,bill,payment,invoice,allocation);
    }
    public Optional<UUID> billForPayment(String id) { return db.query("SELECT bill_id FROM billing_payment_link WHERE payment_id=? ORDER BY allocation_reference LIMIT 1",(row,index)->row.getObject(1,UUID.class),id).stream().findFirst(); }
    public Optional<Link> firstLink(String id) { return db.query("SELECT * FROM billing_payment_link WHERE payment_id=? ORDER BY allocation_reference LIMIT 1",(row,index)->new Link(row.getObject("bill_id",UUID.class),row.getString("allocation_reference"),row.getString("invoice_id"),row.getLong("allocated_pence")),id).stream().findFirst(); }
    public Optional<String> paymentForCharge(String charge) { return db.query("SELECT payment_id FROM billing_provider_payment WHERE charge_id=?",(row,index)->row.getString(1),charge).stream().findFirst(); }
    public void adjustment(String id,String payment,String kind,String state,long amount) {
        int changed=db.update("UPDATE billing_provider_adjustment SET state=?,amount_pence=?,updated_at=CURRENT_TIMESTAMP WHERE provider_id=? AND payment_id=? AND kind=?",state,amount,id,payment,kind);
        if(changed==0)db.update("INSERT INTO billing_provider_adjustment(provider_id,payment_id,kind,state,amount_pence) VALUES(?,?,?,?,?)",id,payment,kind,state,amount);
    }
    public List<Payment> payments(UUID bill,boolean live,String after) { return db.query("SELECT DISTINCT p.* FROM billing_provider_payment p JOIN billing_payment_link l ON l.payment_id=p.payment_id WHERE l.bill_id=? AND p.live_mode=? AND p.payment_id>?"+PRIVATE_PAYMENT_SCOPE+" ORDER BY p.payment_id LIMIT 51",(row,index)->new Payment(row.getString("payment_id"),row.getString("kind"),row.getString("state"),row.getLong("amount_pence"),row.getLong("received_pence"),row.getString("charge_id"),row.getLong("captured_pence"),row.getLong("refunded_pence"),row.getBoolean("disputed"),row.getObject("updated_at",OffsetDateTime.class)),bill,live,after==null ? "" : after); }
    public List<Adjustment> adjustments(UUID bill,boolean live,String after) { return db.query("SELECT DISTINCT a.* FROM billing_provider_adjustment a JOIN billing_provider_payment p ON p.payment_id=a.payment_id JOIN billing_payment_link l ON l.payment_id=p.payment_id WHERE l.bill_id=? AND p.live_mode=? AND a.provider_id>?"+PRIVATE_PAYMENT_SCOPE+" ORDER BY a.provider_id LIMIT 51",(row,index)->new Adjustment(row.getString("provider_id"),row.getString("kind"),row.getString("state"),row.getLong("amount_pence"),row.getObject("updated_at",OffsetDateTime.class)),bill,live,after==null ? "" : after); }
    public boolean hasPayment(UUID bill,boolean live,String id) { return !db.query("SELECT p.payment_id FROM billing_provider_payment p JOIN billing_payment_link l ON l.payment_id=p.payment_id WHERE l.bill_id=? AND p.live_mode=? AND p.payment_id=?"+PRIVATE_PAYMENT_SCOPE,(row,index)->row.getString(1),bill,live,id).isEmpty(); }
    public boolean hasAdjustment(UUID bill,boolean live,String id) { return !db.query("SELECT a.provider_id FROM billing_provider_adjustment a JOIN billing_provider_payment p ON p.payment_id=a.payment_id JOIN billing_payment_link l ON l.payment_id=p.payment_id WHERE l.bill_id=? AND p.live_mode=? AND a.provider_id=?"+PRIVATE_PAYMENT_SCOPE,(row,index)->row.getString(1),bill,live,id).isEmpty(); }
}
