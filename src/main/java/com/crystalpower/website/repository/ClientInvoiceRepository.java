package com.crystalpower.website.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.time.OffsetDateTime;

@Repository
public class ClientInvoiceRepository {
    public record Invoice(String id,long created,String number,String state,long totalPence,long paidPence,String hostedUrl,OffsetDateTime recordedAt) {}
    private final JdbcTemplate db;
    public ClientInvoiceRepository(JdbcTemplate db) { this.db=db; }
    private final org.springframework.jdbc.core.RowMapper<Invoice> row=(r,n)->new Invoice(r.getString("invoice_id"),r.getLong("provider_created"),r.getString("invoice_number"),r.getString("state"),r.getLong("total_pence"),r.getLong("paid_pence"),r.getString("hosted_url"),r.getObject("recorded_at",OffsetDateTime.class));
    public void save(UUID bill,boolean live,String id,long created,String number,String state,long total,long paid,String url) {
        int changed=db.update("UPDATE billing_client_invoice SET invoice_number=?,state=?,total_pence=?,paid_pence=?,hosted_url=?,recorded_at=CURRENT_TIMESTAMP WHERE invoice_id=? AND bill_id=? AND live_mode=? AND provider_created=?",number,state,total,paid,url,id,bill,live,created);
        if(changed==0)db.update("INSERT INTO billing_client_invoice(invoice_id,bill_id,live_mode,provider_created,invoice_number,state,total_pence,paid_pence,hosted_url) VALUES(?,?,?,?,?,?,?,?,?)",id,bill,live,created,number,state,total,paid,url);
    }
    public Optional<Invoice> anchor(UUID bill,boolean live,String id) { return db.query("SELECT * FROM billing_client_invoice WHERE bill_id=? AND live_mode=? AND invoice_id=?",row,bill,live,id).stream().findFirst(); }
    public List<Invoice> page(UUID bill,boolean live,Invoice before) {
        var args=new java.util.ArrayList<Object>();args.add(bill);args.add(live);String cursor="";
        if(before!=null){cursor=" AND (provider_created<? OR (provider_created=? AND invoice_id<?))";args.add(before.created());args.add(before.created());args.add(before.id());}
        return db.query("SELECT * FROM billing_client_invoice WHERE bill_id=? AND live_mode=?"+cursor+" ORDER BY provider_created DESC,invoice_id DESC LIMIT 51",row,args.toArray());
    }
    public long total(UUID bill,boolean live) { return db.queryForObject("SELECT COUNT(*) FROM billing_client_invoice WHERE bill_id=? AND live_mode=?",Long.class,bill,live); }
}
