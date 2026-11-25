CREATE TABLE docks_google_challenge (
    state_hash VARCHAR(64) PRIMARY KEY,
    browser_hash VARCHAR(64) NOT NULL,
    nonce VARCHAR(43) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX docks_google_challenge_expiry ON docks_google_challenge(expires_at);

CREATE TABLE docks_google_ticket (
    token_hash VARCHAR(64) PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES docks_account(id) ON DELETE CASCADE,
    destination VARCHAR(8) NOT NULL CHECK (destination IN ('BROWSER', 'DESKTOP')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX docks_google_ticket_expiry ON docks_google_ticket(expires_at);
