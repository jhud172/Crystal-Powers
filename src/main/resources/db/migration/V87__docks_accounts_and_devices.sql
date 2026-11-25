CREATE TABLE docks_account (
    id UUID PRIMARY KEY,
    display_name VARCHAR(170) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE docks_identity (
    issuer VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    account_id UUID NOT NULL REFERENCES docks_account(id) ON DELETE CASCADE,
    PRIMARY KEY (issuer, subject)
);

CREATE TABLE docks_device (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES docks_account(id) ON DELETE CASCADE,
    installation_id UUID NOT NULL,
    label VARCHAR(120) NOT NULL,
    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (account_id, installation_id)
);
