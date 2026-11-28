CREATE TABLE docks_subscription_checkout (
    account_id UUID NOT NULL REFERENCES docks_account(id) ON DELETE CASCADE,
    attempt_id UUID PRIMARY KEY,
    plan VARCHAR(24) NOT NULL,
    stripe_price VARCHAR(100) NOT NULL,
    expires_at_epoch BIGINT NOT NULL,
    stripe_session VARCHAR(100) UNIQUE,
    checkout_url VARCHAR(2048)
);
CREATE INDEX docks_subscription_checkout_account ON docks_subscription_checkout(account_id, expires_at_epoch);
