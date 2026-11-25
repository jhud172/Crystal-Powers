package com.crystalpower.website.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class DocksDiagnosticLogs {
    public record Readings(@Min(0) @Max(100) Integer cpuPercent, @Min(0) @Max(100) Integer memoryPercent,
                           @Min(0) @Max(100) Integer batteryPercent, @Min(1) @Max(65535) int logicalProcessors,
                           @Min(0) @Max(8796093022207L) Long freeStorageMiB,
                           @Min(0) @Max(1000000) Integer startupEntries, @NotNull @Min(0) @Max(1000000) Integer installedApps,
                           @NotNull DriveStatus driveStatus) {}
    public enum DriveStatus { HEALTHY, ATTENTION, UNKNOWN, UNAVAILABLE }
    public record Request(@NotNull UUID installationId, @NotNull OffsetDateTime checkedAt,
                          @NotNull @Valid Readings readings, @AssertTrue boolean approved) {}
    public record Grant(UUID reference, OffsetDateTime expiresAt) {}
    public record State(Grant grant, List<DocksReports.SupportEvent> activity) {}
    public record SupportView(OffsetDateTime expiresAt, OffsetDateTime checkedAt, Readings readings) {}

    private final JdbcTemplate db;
    private final TransactionTemplate tx;
    private final ObjectMapper json;

    public DocksDiagnosticLogs(JdbcTemplate db, TransactionTemplate tx, ObjectMapper json) {
        this.db = db;
        this.tx = tx;
        this.json = json;
    }

    public State state(UUID account) {
        return tx.execute(status -> {
            lock(account);
            return new State(grant(account).orElse(null), db.query("""
                    SELECT action, recorded_at FROM docks_report_support_audit
                    WHERE account_id = ? AND scope = 'LOG' AND recorded_at > ?
                    ORDER BY recorded_at DESC, event_order DESC LIMIT 20
                    """, (row, i) -> new DocksReports.SupportEvent(row.getString(1), row.getObject(2, OffsetDateTime.class)),
                    account, now().minusDays(90)));
        });
    }

    public Optional<Grant> share(UUID account, Request request) {
        return tx.execute(status -> {
            lock(account);
            var time = now();
            if (!request.approved() || !request.checkedAt().isAfter(time.minusDays(7))
                    || request.checkedAt().isAfter(time.plusMinutes(10))) return Optional.empty();
            var devices = db.query("SELECT id FROM docks_device WHERE account_id = ? AND installation_id = ? FOR UPDATE",
                    (row, i) -> row.getObject(1, UUID.class), account, request.installationId());
            if (devices.isEmpty()) return Optional.empty();
            revokeLocked(account);
            var grant = new Grant(UUID.randomUUID(), time.plusHours(1));
            db.update("""
                    INSERT INTO docks_support_diagnostic_log (account_id, device_id, reference, checked_at, expires_at, readings)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, account, devices.get(0), grant.reference(), request.checkedAt(), grant.expiresAt(), encode(request.readings()));
            audit(account, null, "GRANTED");
            return Optional.of(grant);
        });
    }

    public void revoke(UUID account) {
        tx.executeWithoutResult(status -> {
            lock(account);
            revokeLocked(account);
        });
    }

    public Optional<SupportView> open(UUID owner, UUID reference) {
        return tx.execute(status -> {
            var accounts = db.query("SELECT account_id FROM docks_support_diagnostic_log WHERE reference = ?",
                    (row, i) -> row.getObject(1, UUID.class), reference);
            if (accounts.isEmpty()) return Optional.empty();
            UUID account = accounts.get(0);
            lock(account);
            var logs = db.query("""
                    SELECT expires_at, checked_at, readings FROM docks_support_diagnostic_log
                    WHERE account_id = ? AND reference = ? AND expires_at > ?
                    """, (row, i) -> new SupportView(row.getObject(1, OffsetDateTime.class),
                    row.getObject(2, OffsetDateTime.class), decode(row.getString(3))), account, reference, now());
            if (logs.isEmpty() || !logs.get(0).expiresAt().isAfter(now())) return Optional.empty();
            audit(account, owner, "VIEWED");
            return Optional.of(logs.get(0));
        });
    }

    public int purgeExpired() {
        var time = now();
        return db.update("""
                DELETE FROM docks_support_diagnostic_log WHERE expires_at <= ? AND account_id IN (
                    SELECT account_id FROM docks_support_diagnostic_log WHERE expires_at <= ?
                    ORDER BY expires_at, account_id LIMIT 500
                )
                """, time, time);
    }

    private Optional<Grant> grant(UUID account) {
        return db.query("""
                SELECT reference, expires_at FROM docks_support_diagnostic_log WHERE account_id = ? AND expires_at > ?
                """, (row, i) -> new Grant(row.getObject(1, UUID.class), row.getObject(2, OffsetDateTime.class)),
                account, now()).stream().findFirst();
    }

    private void revokeLocked(UUID account) {
        if (grant(account).isPresent()) audit(account, null, "REVOKED");
        db.update("DELETE FROM docks_support_diagnostic_log WHERE account_id = ?", account);
    }

    private void audit(UUID account, UUID owner, String action) {
        db.update("""
                INSERT INTO docks_report_support_audit (id, account_id, owner_actor, action, recorded_at, scope)
                VALUES (?, ?, ?, ?, ?, 'LOG')
                """, UUID.randomUUID(), account, owner, action, now());
    }

    private void lock(UUID account) {
        db.query("SELECT id FROM docks_account WHERE id = ? FOR UPDATE",
                (row, i) -> row.getObject(1, UUID.class), account);
    }

    private String encode(Readings data) {
        try { return json.writeValueAsString(data); }
        catch (JsonProcessingException ex) { throw new IllegalStateException("Could not serialise diagnostic readings", ex); }
    }

    private Readings decode(String data) {
        try { return json.readValue(data, Readings.class); }
        catch (JsonProcessingException ex) { throw new IllegalStateException("Could not read diagnostic readings", ex); }
    }

    private static OffsetDateTime now() { return OffsetDateTime.now(ZoneOffset.UTC); }
}
