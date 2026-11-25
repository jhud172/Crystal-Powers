CREATE TABLE docks_household_invitation (
    id UUID PRIMARY KEY,
    stripe_subscription_id VARCHAR(100) NOT NULL
        REFERENCES docks_subscription_status(stripe_subscription_id) ON DELETE CASCADE,
    invited_email VARCHAR(254) NOT NULL,
    expires_at_epoch BIGINT NOT NULL,
    member_account_id UUID UNIQUE REFERENCES docks_account(id) ON DELETE CASCADE,
    UNIQUE (stripe_subscription_id, invited_email)
);

CREATE INDEX docks_household_invitation_email ON docks_household_invitation(invited_email);
