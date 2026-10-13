CREATE TABLE billing_provider_payment (
    payment_id VARCHAR(100) PRIMARY KEY,
    customer_id VARCHAR(100) NOT NULL,
    live_mode BOOLEAN NOT NULL,
    state VARCHAR(40) NOT NULL,
    amount_pence BIGINT NOT NULL,
    received_pence BIGINT NOT NULL,
    charge_id VARCHAR(100) UNIQUE,
    captured_pence BIGINT NOT NULL DEFAULT 0,
    refunded_pence BIGINT NOT NULL DEFAULT 0,
    disputed BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE billing_payment_link (
    allocation_reference VARCHAR(150) PRIMARY KEY,
    bill_id UUID NOT NULL REFERENCES billing_intent(bill_id),
    payment_id VARCHAR(100) NOT NULL REFERENCES billing_provider_payment(payment_id),
    invoice_id VARCHAR(100),
    allocated_pence BIGINT NOT NULL,
    UNIQUE(bill_id,payment_id,allocation_reference)
);
CREATE INDEX billing_payment_link_bill_idx ON billing_payment_link(bill_id,allocation_reference);
CREATE TABLE billing_provider_adjustment (
    provider_id VARCHAR(100) PRIMARY KEY,
    payment_id VARCHAR(100) NOT NULL REFERENCES billing_provider_payment(payment_id),
    kind VARCHAR(20) NOT NULL CHECK(kind IN ('REFUND','DISPUTE')),
    state VARCHAR(50) NOT NULL,
    amount_pence BIGINT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
