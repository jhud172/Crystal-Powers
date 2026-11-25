CREATE TABLE docks_trial (
    account_id UUID PRIMARY KEY REFERENCES docks_account(id) ON DELETE CASCADE,
    device_id UUID NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CHECK (expires_at > started_at)
);
