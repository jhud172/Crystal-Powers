ALTER TABLE support_attachment ADD COLUMN scan_state VARCHAR(20) NOT NULL DEFAULT 'UNSCANNED' CHECK(scan_state IN ('UNSCANNED','SCANNING','CLEAN','INFECTED','ERROR'));
ALTER TABLE support_attachment ADD COLUMN scanned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE support_attachment ADD COLUMN scan_token UUID;
ALTER TABLE support_attachment ADD COLUMN scan_started_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX support_attachment_scan_idx ON support_attachment(scan_state,scan_started_at);
