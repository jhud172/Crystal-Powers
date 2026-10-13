CREATE TABLE billing_payment_mutex (payment_id VARCHAR(100) PRIMARY KEY);
CREATE TABLE billing_invoice_sync (
    invoice_id VARCHAR(100) PRIMARY KEY,
    bill_id UUID NOT NULL REFERENCES billing_intent(bill_id),
    fingerprint VARCHAR(64) NOT NULL,
    state VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','RUNNING','DONE','ERROR')),
    cursor_id VARCHAR(100),
    lease_token UUID,
    lease_until TIMESTAMP WITH TIME ZONE,
    version INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX billing_invoice_sync_bill_idx ON billing_invoice_sync(bill_id,invoice_id);
CREATE TABLE billing_invoice_allocation (
    allocation_id VARCHAR(100) PRIMARY KEY,
    invoice_id VARCHAR(100) NOT NULL REFERENCES billing_invoice_sync(invoice_id),
    payment_kind VARCHAR(30) NOT NULL,
    payment_reference VARCHAR(100),
    state VARCHAR(20) NOT NULL,
    requested_pence BIGINT NOT NULL,
    paid_pence BIGINT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
