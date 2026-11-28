CREATE TABLE docks_access_key (
    id UUID PRIMARY KEY,
    code_hash VARCHAR(64) NOT NULL UNIQUE,
    code_suffix VARCHAR(4) NOT NULL,
    duration_days INTEGER NOT NULL CHECK (duration_days BETWEEN 1 AND 3650),
    device_limit INTEGER NOT NULL CHECK (device_limit IN (1, 5)),
    state VARCHAR(12) NOT NULL CHECK (state IN ('ACTIVE', 'SUSPENDED', 'REVOKED')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    account_id UUID REFERENCES docks_account(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX docks_access_key_account ON docks_access_key(account_id);
CREATE TABLE docks_access_key_device (
    key_id UUID NOT NULL REFERENCES docks_access_key(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES docks_device(id) ON DELETE CASCADE,
    PRIMARY KEY (key_id, device_id)
);
CREATE TABLE docks_access_key_audit (
    id UUID PRIMARY KEY,
    key_id UUID NOT NULL,
    actor_id UUID NOT NULL,
    action VARCHAR(24) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
