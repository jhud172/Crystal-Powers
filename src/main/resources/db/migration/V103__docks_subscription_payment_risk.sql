CREATE TABLE docks_subscription_payment_risk (
    attempt_id UUID NOT NULL REFERENCES docks_subscription_checkout(attempt_id) ON DELETE CASCADE,
    invoice_id VARCHAR(100) NOT NULL,
    risk_id VARCHAR(100) NOT NULL,
    charge_id VARCHAR(100) NOT NULL,
    kind VARCHAR(16) NOT NULL CHECK (kind IN ('refund', 'dispute', 'fraud_warning')),
    outcome VARCHAR(32) NOT NULL,
    holds_access BOOLEAN NOT NULL,
    observed_at_epoch BIGINT NOT NULL,
    PRIMARY KEY (attempt_id, invoice_id, risk_id)
);

CREATE INDEX docks_subscription_payment_risk_recent ON docks_subscription_payment_risk(observed_at_epoch);
