CREATE TABLE client_account (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES team_workspace(id),
    email VARCHAR(254) NOT NULL UNIQUE,
    display_name VARCHAR(170) NOT NULL,
    password_hash VARCHAR(100),
    state VARCHAR(20) NOT NULL DEFAULT 'INVITED' CHECK (state IN ('INVITED','ACTIVE','SUSPENDED')),
    credentials_version INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE client_invitation (
    token_hash VARCHAR(64) PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES client_account(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE
);
CREATE TABLE client_request (
    request_id UUID PRIMARY KEY REFERENCES support_request(id),
    account_id UUID NOT NULL REFERENCES client_account(id)
);
CREATE INDEX client_request_account_idx ON client_request(account_id);
CREATE TABLE client_reply (
    id UUID PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES support_request(id),
    account_id UUID NOT NULL REFERENCES client_account(id),
    submission_key UUID NOT NULL UNIQUE,
    body VARCHAR(4000) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX client_reply_request_idx ON client_reply(request_id, created_at);
ALTER TABLE support_message ADD COLUMN portal_visible BOOLEAN NOT NULL DEFAULT FALSE;
