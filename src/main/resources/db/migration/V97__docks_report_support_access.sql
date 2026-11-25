CREATE TABLE docks_report_support_grant (
    account_id UUID PRIMARY KEY REFERENCES docks_report_consent(account_id) ON DELETE CASCADE,
    reference UUID NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX docks_report_support_expiry ON docks_report_support_grant(expires_at, account_id);

CREATE TABLE docks_report_support_audit (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES docks_account(id) ON DELETE CASCADE,
    owner_actor UUID,
    action VARCHAR(8) NOT NULL CHECK (action IN ('GRANTED', 'REVOKED', 'VIEWED')),
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX docks_report_support_audit_account ON docks_report_support_audit(account_id, recorded_at);
CREATE INDEX docks_report_support_audit_expiry ON docks_report_support_audit(recorded_at, id);
