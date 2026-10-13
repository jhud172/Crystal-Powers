package com.crystalpower.website.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class BillingRepository {
    public record Draft(UUID id, UUID workspaceId, UUID requestId, UUID submissionKey, String purpose, String title, long amountPence, String currency, String terms, String state, UUID createdByOwner, UUID createdByTeam, OffsetDateTime createdAt) {}
    private final JdbcTemplate jdbc;
    private static final RowMapper<Draft> ROW = (r, n) -> new Draft(r.getObject("id", UUID.class), r.getObject("workspace_id", UUID.class), r.getObject("request_id", UUID.class), r.getObject("submission_key", UUID.class), r.getString("purpose"), r.getString("title"), r.getLong("amount_pence"), r.getString("currency"), r.getString("terms"), r.getString("state"), r.getObject("created_by_owner", UUID.class), r.getObject("created_by_team", UUID.class), r.getObject("created_at", OffsetDateTime.class));
    public BillingRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public Optional<Draft> draft(UUID id) { return jdbc.query("SELECT * FROM billing_payment_request WHERE id=?",ROW,id).stream().findFirst(); }
    public List<Draft> list(UUID workspace, UUID request) { return jdbc.query("SELECT * FROM billing_payment_request WHERE workspace_id=? AND request_id=? ORDER BY created_at DESC, id DESC LIMIT 100", ROW, workspace, request); }
    public Optional<Draft> anchor(UUID workspace,UUID request,UUID id) { return jdbc.query("SELECT * FROM billing_payment_request WHERE workspace_id=? AND request_id=? AND id=?",ROW,workspace,request,id).stream().findFirst(); }
    public List<Draft> page(UUID workspace,UUID request,Draft after) {
        var args=new java.util.ArrayList<Object>();args.add(workspace);args.add(request);String cursor="";
        if(after!=null){cursor=" AND (created_at<? OR (created_at=? AND id<?))";args.add(after.createdAt());args.add(after.createdAt());args.add(after.id());}
        return jdbc.query("SELECT * FROM billing_payment_request WHERE workspace_id=? AND request_id=?"+cursor+" ORDER BY created_at DESC,id DESC LIMIT 51",ROW,args.toArray());
    }
    public long total(UUID workspace,UUID request) { return jdbc.queryForObject("SELECT COUNT(*) FROM billing_payment_request WHERE workspace_id=? AND request_id=?",Long.class,workspace,request); }
    public long unissuedTotal(UUID workspace,UUID request) { return jdbc.queryForObject("SELECT COUNT(*) FROM billing_payment_request b WHERE b.workspace_id=? AND b.request_id=? AND b.state='DRAFT' AND NOT EXISTS(SELECT 1 FROM billing_intent i WHERE i.bill_id=b.id)",Long.class,workspace,request); }
    public Optional<Draft> submission(UUID key) { return jdbc.query("SELECT * FROM billing_payment_request WHERE submission_key=?", ROW, key).stream().findFirst(); }
    public Draft insert(UUID workspace, UUID request, UUID key, String purpose, String title, long pence, String terms, UUID owner, UUID team) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO billing_payment_request(id,workspace_id,request_id,submission_key,purpose,title,amount_pence,terms,created_by_owner,created_by_team) VALUES (?,?,?,?,?,?,?,?,?,?)", id, workspace, request, key, purpose, title, pence, terms, owner, team);
        return submission(key).orElseThrow();
    }
    public int cancel(UUID workspace, UUID request, UUID id) { return jdbc.update("UPDATE billing_payment_request SET state='CANCELLED', updated_at=CURRENT_TIMESTAMP WHERE workspace_id=? AND request_id=? AND id=? AND state='DRAFT' AND NOT EXISTS (SELECT 1 FROM billing_intent WHERE bill_id=?)", workspace, request, id,id); }
}
