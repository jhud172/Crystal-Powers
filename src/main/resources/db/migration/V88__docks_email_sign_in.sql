CREATE TABLE docks_email_challenge (
    token_hash VARCHAR(64) PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX docks_email_challenge_expiry ON docks_email_challenge(expires_at);

CREATE TABLE docks_email_rate (
    bucket VARCHAR(64) PRIMARY KEY,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX docks_email_rate_expiry ON docks_email_rate(sent_at);
CREATE TABLE docks_email_gate (id INTEGER PRIMARY KEY);
INSERT INTO docks_email_gate(id) VALUES (1);

CREATE TABLE docks_session (
    token_hash VARCHAR(64) PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES docks_account(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX docks_session_expiry ON docks_session(expires_at);
