CREATE TABLE billing_customer (
    account_id UUID NOT NULL REFERENCES client_account(id),
    live_mode BOOLEAN NOT NULL,
    customer_id VARCHAR(100) NOT NULL UNIQUE,
    PRIMARY KEY(account_id, live_mode)
);
CREATE TABLE billing_intent (
    bill_id UUID PRIMARY KEY REFERENCES billing_payment_request(id),
    account_id UUID NOT NULL REFERENCES client_account(id),
    live_mode BOOLEAN NOT NULL,
    payment_state VARCHAR(20) NOT NULL DEFAULT 'ISSUED' CHECK (payment_state IN ('ISSUED','PENDING','PAID')),
    subscription_id VARCHAR(100) UNIQUE,
    subscription_state VARCHAR(40) NOT NULL DEFAULT 'NOT_STARTED',
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    period_end BIGINT,
    latest_invoice_id VARCHAR(100),
    latest_invoice_state VARCHAR(40),
    invoice_url TEXT,
    accepted_at TIMESTAMP WITH TIME ZONE,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX billing_intent_client_idx ON billing_intent(account_id, issued_at);
CREATE TABLE billing_checkout_attempt (
    id UUID PRIMARY KEY,
    bill_id UUID NOT NULL REFERENCES billing_intent(bill_id),
    state VARCHAR(30) NOT NULL DEFAULT 'PREPARING' CHECK (state IN ('PREPARING','OPEN','COMPLETE','EXPIRED','RECONCILE_REQUIRED')),
    expires_at BIGINT NOT NULL,
    lease_until BIGINT NOT NULL DEFAULT 0,
    session_id VARCHAR(100) UNIQUE,
    checkout_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX billing_checkout_bill_idx ON billing_checkout_attempt(bill_id, created_at);
CREATE TABLE billing_stripe_event (
    event_id VARCHAR(100) PRIMARY KEY,
    event_type VARCHAR(150) NOT NULL,
    object_id VARCHAR(100) NOT NULL,
    event_created BIGINT NOT NULL,
    live_mode BOOLEAN NOT NULL,
    state VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING','DONE')),
    attempts INTEGER NOT NULL DEFAULT 0,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);
