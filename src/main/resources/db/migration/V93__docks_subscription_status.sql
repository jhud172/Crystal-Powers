CREATE TABLE docks_subscription_status (
    stripe_subscription_id VARCHAR(100) PRIMARY KEY,
    attempt_id UUID NOT NULL UNIQUE REFERENCES docks_subscription_checkout(attempt_id) ON DELETE CASCADE,
    provider_state VARCHAR(24) NOT NULL,
    paid_until_epoch BIGINT,
    updated_at_epoch BIGINT NOT NULL
);

CREATE TABLE docks_subscription_event (
    stripe_event_id VARCHAR(100) PRIMARY KEY,
    attempt_id UUID NOT NULL REFERENCES docks_subscription_checkout(attempt_id) ON DELETE CASCADE,
    handled_at_epoch BIGINT NOT NULL
);
