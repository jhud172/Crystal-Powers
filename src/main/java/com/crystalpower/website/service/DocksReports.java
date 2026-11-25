package com.crystalpower.website.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
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
    public record SupportGrant(UUID reference, OffsetDateTime expiresAt) {}
    public record SupportEvent(String action, OffsetDateTime recordedAt) {}
    public record SupportState(SupportGrant grant, List<SupportEvent> activity) {}
    public record SupportView(OffsetDateTime expiresAt, List<Report> reports) {}
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
            return new View(true, available(account));
        });
    }

    private List<Report> available(UUID account) {
        return db.query("""
                SELECT d.label, r.checked_at, r.cpu_percent, r.memory_percent
                FROM docks_device_report r JOIN docks_device d ON d.id = r.device_id
                WHERE d.account_id = ? AND r.checked_at > ? ORDER BY r.checked_at DESC, d.id
                """, (row, i) -> new Report(row.getString(1), row.getObject(2, OffsetDateTime.class),
                    row.getObject(3, Integer.class), row.getObject(4, Integer.class)), account, expiryCutoff());
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
        revokeLocked(account);
        db.update("""
                DELETE FROM docks_device_report
                WHERE device_id IN (SELECT id FROM docks_device WHERE account_id = ?)
                """, account);
    }

    public SupportState supportState(UUID account) {
        return tx.execute(status -> {
            lock(account);
            return new SupportState(activeGrant(account).orElse(null), db.query("""
                    SELECT action, recorded_at FROM docks_report_support_audit
                    WHERE account_id = ? AND scope = 'SUMMARY' AND recorded_at > ? ORDER BY recorded_at DESC, id LIMIT 20
                    """, (row, i) -> new SupportEvent(row.getString(1), row.getObject(2, OffsetDateTime.class)),
                    account, now().minusDays(90)));
        });
    }

    public Optional<SupportGrant> grantSupport(UUID account) {
        return tx.execute(status -> {
            lock(account);
            if (!enabled(account) || available(account).isEmpty()) return Optional.empty();
            var existing = activeGrant(account);
            if (existing.isPresent()) return existing;
            db.update("DELETE FROM docks_report_support_grant WHERE account_id = ?", account);
            var grant = new SupportGrant(UUID.randomUUID(), now().plusHours(1));
            db.update("INSERT INTO docks_report_support_grant (account_id, reference, expires_at) VALUES (?, ?, ?)",
                    account, grant.reference(), grant.expiresAt());
            audit(account, null, "GRANTED");
            return Optional.of(grant);
        });
    }

    public void revokeSupport(UUID account) {
        tx.executeWithoutResult(status -> {
            lock(account);
            revokeLocked(account);
        });
    }

    public Optional<SupportView> openForSupport(UUID owner, UUID reference) {
        return tx.execute(status -> {
            var match = db.query("SELECT account_id FROM docks_report_support_grant WHERE reference = ?",
                    (row, i) -> row.getObject(1, UUID.class), reference);
            if (match.isEmpty()) return Optional.empty();
            var account = match.get(0);
            lock(account);
            var grant = activeGrant(account);
            if (grant.isEmpty() || !grant.get().reference().equals(reference) || !enabled(account)) return Optional.empty();
            var reports = available(account);
            if (reports.isEmpty() || !grant.get().expiresAt().isAfter(now())) return Optional.empty();
            audit(account, owner, "VIEWED");
            return Optional.of(new SupportView(grant.get().expiresAt(), reports));
        });
    }

    private Optional<SupportGrant> activeGrant(UUID account) {
        return db.query("""
                SELECT reference, expires_at FROM docks_report_support_grant WHERE account_id = ? AND expires_at > ?
                """, (row, i) -> new SupportGrant(row.getObject(1, UUID.class), row.getObject(2, OffsetDateTime.class)),
                account, now()).stream().findFirst();
    }

    private void revokeLocked(UUID account) {
        int removed = db.update("DELETE FROM docks_report_support_grant WHERE account_id = ? AND expires_at > ?",
                account, now());
        if (removed > 0) audit(account, null, "REVOKED");
    }

    private void audit(UUID account, UUID owner, String action) {
        db.update("""
                INSERT INTO docks_report_support_audit (id, account_id, owner_actor, action, recorded_at)
                VALUES (?, ?, ?, ?, ?)
                """, UUID.randomUUID(), account, owner, action, now());
    }

    public void purgeExpiredSupport() {
        var time = now();
        db.update("""
                DELETE FROM docks_report_support_grant WHERE expires_at <= ? AND account_id IN (
                    SELECT account_id FROM docks_report_support_grant WHERE expires_at <= ? LIMIT ?
                )
                """, time, time, PURGE_BATCH);
        var cutoff = time.minusDays(90);
        db.update("""
                DELETE FROM docks_report_support_audit WHERE id IN (
                    SELECT id FROM docks_report_support_audit WHERE recorded_at <= ? LIMIT ?
                )
                """, cutoff, PURGE_BATCH);
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
