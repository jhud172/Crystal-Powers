package com.crystalpower.website.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.EnumMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class DocksResearch {
    public enum Band { LOW, MEDIUM, HIGH, UNAVAILABLE }
    public record State(boolean enabled, OffsetDateTime submittedAt) {}
    public record Totals(long total, Map<Band, Long> cpu, Map<Band, Long> memory) {}
    private record Group(Band cpu, Band memory, long count) {}
    private final JdbcTemplate db;
    private final TransactionTemplate tx;

    public DocksResearch(JdbcTemplate db, TransactionTemplate tx) {
        this.db = db;
        this.tx = tx;
    }

    public State state(UUID account) {
        return db.query("""
                SELECT c.submitted_at FROM docks_research_consent p
                LEFT JOIN docks_research_contribution c
                  ON c.account_id = p.account_id AND c.submitted_at > ?
                WHERE p.account_id = ?
                """, (row, i) -> new State(true, row.getObject(1, OffsetDateTime.class)), cutoff(), account)
                .stream().findFirst().orElse(new State(false, null));
    }

    public void setEnabled(UUID account, boolean enable) {
        tx.executeWithoutResult(status -> {
            lock(account);
            if (!enable) {
                db.update("DELETE FROM docks_research_consent WHERE account_id = ?", account);
            } else if (!state(account).enabled()) {
                db.update("INSERT INTO docks_research_consent (account_id, granted_at) VALUES (?, ?)", account, now());
            }
        });
    }

    public State submit(UUID account, Band cpu, Band memory) {
        return tx.execute(status -> {
            lock(account);
            if (!state(account).enabled()) return new State(false, null);
            OffsetDateTime time = now();
            int updated = db.update("""
                    UPDATE docks_research_contribution SET cpu_band = ?, memory_band = ?, submitted_at = ?
                    WHERE account_id = ?
                    """, cpu.name(), memory.name(), time, account);
            if (updated == 0) db.update("""
                    INSERT INTO docks_research_contribution (account_id, cpu_band, memory_band, submitted_at)
                    VALUES (?, ?, ?, ?)
                    """, account, cpu.name(), memory.name(), time);
            return state(account);
        });
    }

    public Totals totals() {
        var groups = db.query("""
                SELECT cpu_band, memory_band, COUNT(*) FROM docks_research_contribution
                WHERE submitted_at > ? GROUP BY cpu_band, memory_band
                """, (row, i) -> new Group(Band.valueOf(row.getString(1)), Band.valueOf(row.getString(2)), row.getLong(3)),
                cutoff());
        long total = groups.stream().mapToLong(Group::count).sum();
        if (total < 5) return new Totals(0, Map.of(), Map.of());
        var cpu = new EnumMap<Band, Long>(Band.class);
        var memory = new EnumMap<Band, Long>(Band.class);
        groups.forEach(group -> {
            cpu.merge(group.cpu(), group.count(), Long::sum);
            memory.merge(group.memory(), group.count(), Long::sum);
        });
        return new Totals(total, cpu, memory);
    }

    public int purgeExpired() {
        var cutoff = cutoff();
        return db.update("""
                DELETE FROM docks_research_contribution WHERE submitted_at <= ? AND account_id IN (
                    SELECT account_id FROM docks_research_contribution WHERE submitted_at <= ?
                    ORDER BY submitted_at, account_id LIMIT 500
                )
                """, cutoff, cutoff);
    }

    private void lock(UUID account) {
        db.queryForObject("SELECT id FROM docks_account WHERE id = ? FOR UPDATE", UUID.class, account);
    }

    private static OffsetDateTime now() { return OffsetDateTime.now(ZoneOffset.UTC); }
    private static OffsetDateTime cutoff() { return now().minusDays(30); }
}
