package com.crystalpower.website.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class DocksReports {
    private static final int RETENTION_DAYS = 30;
    private static final int PURGE_BATCH = 500;
    public record Report(String deviceLabel, OffsetDateTime checkedAt, Integer cpuPercent, Integer memoryPercent) {}
    public record View(boolean enabled, List<Report> reports) {}
    public enum Upload { SAVED, UNCHANGED, DISABLED, DEVICE_UNKNOWN, INVALID }

    private final JdbcTemplate db;
    private final TransactionTemplate tx;

    public DocksReports(JdbcTemplate db, TransactionTemplate tx) {
        this.db = db;
        this.tx = tx;
    }

    public View read(UUID account) {
        return tx.execute(status -> {
            lock(account);
            if (!enabled(account)) return new View(false, List.of());
            return new View(true, db.query("""
                    SELECT d.label, r.checked_at, r.cpu_percent, r.memory_percent
                    FROM docks_device_report r JOIN docks_device d ON d.id = r.device_id
                    WHERE d.account_id = ? AND r.checked_at > ? ORDER BY r.checked_at DESC, d.id
                    """, (row, i) -> new Report(row.getString(1), row.getObject(2, OffsetDateTime.class),
                        row.getObject(3, Integer.class), row.getObject(4, Integer.class)), account, expiryCutoff()));
        });
    }

    public void setEnabled(UUID account, boolean allow) {
        tx.executeWithoutResult(status -> {
            lock(account);
            if (allow) {
                if (!enabled(account)) db.update(
                        "INSERT INTO docks_report_consent (account_id, granted_at) VALUES (?, ?)", account, now());
            } else {
                deleteOwned(account);
                db.update("DELETE FROM docks_report_consent WHERE account_id = ?", account);
            }
        });
    }

    public void clear(UUID account) {
        tx.executeWithoutResult(status -> {
            lock(account);
            deleteOwned(account);
        });
    }

    private void deleteOwned(UUID account) {
        db.update("""
                DELETE FROM docks_device_report
                WHERE device_id IN (SELECT id FROM docks_device WHERE account_id = ?)
                """, account);
    }

    public int purgeExpired() {
        var cutoff = expiryCutoff();
        // Check the cutoff again in the delete so a simultaneous fresh upload
        // survives even if its former row was selected in the expiring batch.
        return db.update("""
                DELETE FROM docks_device_report WHERE checked_at <= ? AND device_id IN (
                    SELECT device_id FROM docks_device_report WHERE checked_at <= ?
                    ORDER BY checked_at, device_id LIMIT ?
                )
                """, cutoff, cutoff, PURGE_BATCH);
    }

    public Upload upload(UUID account, UUID installation, OffsetDateTime checkedAt, Integer cpu, Integer memory) {
        if (checkedAt == null || checkedAt.isAfter(now().plusMinutes(10)) || (cpu == null && memory == null)
                || invalid(cpu) || invalid(memory)) return Upload.INVALID;

        return tx.execute(status -> {
            lock(account);
            if (!checkedAt.isAfter(expiryCutoff())) return Upload.INVALID;
            if (!enabled(account)) return Upload.DISABLED;
            var devices = db.query("""
                    SELECT id FROM docks_device WHERE account_id = ? AND installation_id = ? FOR UPDATE
                    """, (row, i) -> row.getObject(1, UUID.class), account, installation);
            if (devices.isEmpty()) return Upload.DEVICE_UNKNOWN;

            UUID device = devices.get(0);
            var previous = db.query("SELECT checked_at FROM docks_device_report WHERE device_id = ? FOR UPDATE",
                    (row, i) -> row.getObject(1, OffsetDateTime.class), device);
            if (previous.isEmpty()) {
                db.update("""
                        INSERT INTO docks_device_report (device_id, checked_at, cpu_percent, memory_percent)
                        VALUES (?, ?, ?, ?)
                        """, device, checkedAt, cpu, memory);
            } else {
                if (!checkedAt.isAfter(previous.get(0))) return Upload.UNCHANGED;
                db.update("""
                        UPDATE docks_device_report SET checked_at = ?, cpu_percent = ?, memory_percent = ?
                        WHERE device_id = ?
                        """, checkedAt, cpu, memory, device);
            }
            return Upload.SAVED;
        });
    }

    private boolean enabled(UUID account) {
        return db.queryForObject("SELECT COUNT(*) FROM docks_report_consent WHERE account_id = ?",
                Integer.class, account) > 0;
    }

    private void lock(UUID account) {
        db.query("SELECT id FROM docks_account WHERE id = ? FOR UPDATE",
                (row, i) -> row.getObject(1, UUID.class), account);
    }

    private static boolean invalid(Integer percent) { return percent != null && (percent < 0 || percent > 100); }
    private static OffsetDateTime now() { return OffsetDateTime.now(ZoneOffset.UTC); }
    private static OffsetDateTime expiryCutoff() { return now().minusDays(RETENTION_DAYS); }
}
