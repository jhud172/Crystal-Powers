CREATE TABLE docks_report_consent (
    account_id UUID PRIMARY KEY REFERENCES docks_account(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE docks_device_report (
    device_id UUID PRIMARY KEY REFERENCES docks_device(id) ON DELETE CASCADE,
    checked_at TIMESTAMP WITH TIME ZONE NOT NULL,
    cpu_percent INTEGER CHECK (cpu_percent BETWEEN 0 AND 100),
    memory_percent INTEGER CHECK (memory_percent BETWEEN 0 AND 100),
    CHECK (cpu_percent IS NOT NULL OR memory_percent IS NOT NULL)
);
