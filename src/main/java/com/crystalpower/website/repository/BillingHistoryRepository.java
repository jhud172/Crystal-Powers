package com.crystalpower.website.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.apache.commons.codec.digest.DigestUtils;

@Repository
public class BillingHistoryRepository {
    public record Observation(String id,String category,String reference,String state,long amountPence,String detail,OffsetDateTime recordedAt) {}
    private final JdbcTemplate db;
    public BillingHistoryRepository(JdbcTemplate db) { this.db=db; }
    /** Call inside the transaction holding this bill's intent/request lock. Deduplicate only consecutive identical observations. */
    public void observe(UUID bill,boolean live,String category,String reference,String state,long amount,String detail) {
        String hash=DigestUtils.sha256Hex((category+"\n"+reference+"\n"+state+"\n"+amount+"\n"+detail).getBytes(StandardCharsets.UTF_8));
        var latest=db.query("SELECT fingerprint FROM billing_observation WHERE bill_id=? AND live_mode=? AND category=? AND provider_reference=? ORDER BY id DESC LIMIT 1",(row,index)->row.getString(1),bill,live,category,reference);
        if(!latest.isEmpty() && latest.get(0).equals(hash))return;
        db.update("INSERT INTO billing_observation(bill_id,live_mode,category,provider_reference,state,amount_pence,detail,fingerprint) VALUES(?,?,?,?,?,?,?,?)",bill,live,category,reference,state,amount,detail,hash);
    }
    public boolean cursor(UUID bill,boolean live,long id) { return !db.query("SELECT id FROM billing_observation WHERE bill_id=? AND live_mode=? AND id=?",(row,index)->row.getLong(1),bill,live,id).isEmpty(); }
    public List<Observation> page(UUID bill,boolean live,Long before) { var args=new java.util.ArrayList<Object>();args.add(bill);args.add(live);if(before!=null)args.add(before);return db.query("SELECT * FROM billing_observation WHERE bill_id=? AND live_mode=?"+(before==null ? "" : " AND id<?")+" ORDER BY id DESC LIMIT 51",(row,index)->new Observation(row.getString("id"),row.getString("category"),row.getString("provider_reference"),row.getString("state"),row.getLong("amount_pence"),row.getString("detail"),row.getObject("recorded_at",OffsetDateTime.class)),args.toArray()); }
}
