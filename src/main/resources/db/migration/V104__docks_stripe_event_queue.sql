CREATE TABLE docks_stripe_delivery (
    event_id VARCHAR(100) PRIMARY KEY,
    event_type VARCHAR(60) NOT NULL,
    live_mode BOOLEAN NOT NULL,
    subscription_id VARCHAR(100),
    checkout_attempt_id UUID,
    session_id VARCHAR(100),
    risk_id VARCHAR(100),
    charge_id VARCHAR(100),
    received_at_epoch BIGINT NOT NULL,
    next_attempt_epoch BIGINT NOT NULL,
    attempts INTEGER DEFAULT 0 NOT NULL,
    lease_id UUID,
    lease_until_epoch BIGINT,
    finished_at_epoch BIGINT,
    retried_by UUID,
    retried_at_epoch BIGINT,
    CHECK ((subscription_id IS NOT NULL AND risk_id IS NULL AND charge_id IS NULL)
        OR (subscription_id IS NULL AND risk_id IS NOT NULL AND charge_id IS NOT NULL
            AND checkout_attempt_id IS NULL AND session_id IS NULL))
);

CREATE INDEX docks_stripe_delivery_due ON docks_stripe_delivery(live_mode, finished_at_epoch, next_attempt_epoch);
