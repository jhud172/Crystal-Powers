package com.crystalpower.website.service;

import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class DocksAiAllowance {
    private final JdbcTemplate db;
    private final TransactionTemplate tx;

    public DocksAiAllowance(JdbcTemplate db, TransactionTemplate tx) {
        this.db = db;
        this.tx = tx;
    }

    // A request with an uncertain provider outcome still uses its reservation.
    public boolean reserve(UUID account, int accountLimit, long monthlyPence, long requestPence) {
        if (accountLimit < 1 || requestPence < 1 || monthlyPence < requestPence) return false;
        return Boolean.TRUE.equals(tx.execute(status -> {
            db.queryForObject("SELECT id FROM docks_ai_budget_gate WHERE id = 1 FOR UPDATE", Integer.class);
            String month = YearMonth.now(ZoneOffset.UTC).toString();
            int attempts = db.query("""
                    SELECT attempts FROM docks_ai_allowance WHERE account_id = ? AND month_key = ?
                    """, (row, i) -> row.getInt(1), account, month).stream().findFirst().orElse(0);
            if (attempts >= accountLimit) return false;
            var reserved = reserved(month);
            if (reserved.orElse(0L) > monthlyPence - requestPence) return false;
            if (reserved.isEmpty()) {
                db.update("INSERT INTO docks_ai_budget(month_key, reserved_pence) VALUES (?, ?)", month, requestPence);
            } else {
                db.update("UPDATE docks_ai_budget SET reserved_pence = reserved_pence + ? WHERE month_key = ?", requestPence, month);
            }
            if (attempts == 0) {
                db.update("INSERT INTO docks_ai_allowance(account_id, month_key, attempts) VALUES (?, ?, 1)", account, month);
            } else {
                db.update("UPDATE docks_ai_allowance SET attempts = attempts + 1 WHERE account_id = ? AND month_key = ?", account, month);
            }
            return true;
        }));
    }

    long reservedPence(YearMonth month) {
        return reserved(month.toString()).orElse(0L);
    }

    private Optional<Long> reserved(String month) {
        return db.query("SELECT reserved_pence FROM docks_ai_budget WHERE month_key = ?",
                (row, i) -> row.getLong(1), month).stream().findFirst();
    }
}
