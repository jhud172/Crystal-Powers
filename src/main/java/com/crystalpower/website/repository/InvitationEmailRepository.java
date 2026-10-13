package com.crystalpower.website.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Repository
public class InvitationEmailRepository {
    public enum Kind { TEAM, CLIENT }
    public record Delivery(UUID id,String state,OffsetDateTime startedAt) {}
    private final JdbcTemplate db;
    public InvitationEmailRepository(JdbcTemplate db){this.db=db;}
    private String table(Kind kind){return kind==Kind.TEAM ? "team_invitation" : "client_invitation";}
    public Delivery read(Kind kind,String hash){return db.queryForObject("SELECT mail_id,mail_state,mail_started_at FROM "+table(kind)+" WHERE token_hash=? FOR UPDATE",(r,n)->new Delivery(r.getObject("mail_id",UUID.class),r.getString("mail_state"),r.getObject("mail_started_at",OffsetDateTime.class)),hash);}
    public void expire(Kind kind,String hash){db.update("UPDATE "+table(kind)+" SET mail_state='UNKNOWN' WHERE token_hash=? AND mail_state='RUNNING' AND mail_started_at<?",hash,OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(5));}
    public boolean claim(Kind kind,String hash,UUID id,UUID nonce){return db.update("UPDATE "+table(kind)+" SET mail_id=?,mail_nonce=?,mail_state='RUNNING',mail_started_at=CURRENT_TIMESTAMP WHERE token_hash=? AND mail_state='NOT_SENT' AND used_at IS NULL AND expires_at>CURRENT_TIMESTAMP",id,nonce,hash)==1;}
    public boolean finish(Kind kind,String hash,UUID id,UUID nonce,boolean accepted){return db.update("UPDATE "+table(kind)+" SET mail_state=?,mail_completed_at=CURRENT_TIMESTAMP WHERE token_hash=? AND mail_id=? AND mail_nonce=? AND mail_state IN ('RUNNING','UNKNOWN')",accepted ? "ACCEPTED" : "UNKNOWN",hash,id,nonce)==1;}
}
