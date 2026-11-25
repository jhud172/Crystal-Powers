CREATE TABLE docks_support_diagnostic_log (
    account_id UUID PRIMARY KEY REFERENCES docks_account(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES docks_device(id) ON DELETE CASCADE,
    reference UUID NOT NULL UNIQUE,
    checked_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    readings TEXT NOT NULL
);

CREATE INDEX docks_support_diagnostic_log_expiry ON docks_support_diagnostic_log(expires_at, account_id);
CREATE INDEX docks_support_diagnostic_log_device ON docks_support_diagnostic_log(device_id);

ALTER TABLE docks_report_support_audit ADD COLUMN scope VARCHAR(7) DEFAULT 'SUMMARY' NOT NULL
    CHECK (scope IN ('SUMMARY', 'LOG'));
