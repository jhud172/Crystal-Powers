CREATE TABLE docks_research_consent (
    account_id UUID PRIMARY KEY REFERENCES docks_account(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE docks_research_contribution (
    account_id UUID PRIMARY KEY REFERENCES docks_research_consent(account_id) ON DELETE CASCADE,
    cpu_band VARCHAR(12) NOT NULL CHECK (cpu_band IN ('LOW', 'MEDIUM', 'HIGH', 'UNAVAILABLE')),
    memory_band VARCHAR(12) NOT NULL CHECK (memory_band IN ('LOW', 'MEDIUM', 'HIGH', 'UNAVAILABLE')),
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX docks_research_expiry ON docks_research_contribution(submitted_at, account_id);
