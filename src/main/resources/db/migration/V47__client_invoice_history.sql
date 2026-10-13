CREATE TABLE billing_client_invoice (
 invoice_id VARCHAR(100) PRIMARY KEY,
 bill_id UUID NOT NULL REFERENCES billing_intent(bill_id),
 live_mode BOOLEAN NOT NULL,
 provider_created BIGINT NOT NULL CHECK(provider_created>=0),
 invoice_number VARCHAR(200),
 state VARCHAR(30) NOT NULL CHECK(state IN ('draft','open','paid','uncollectible','void')),
 total_pence BIGINT NOT NULL,
 paid_pence BIGINT NOT NULL CHECK(paid_pence>=0),
 hosted_url VARCHAR(2048),
 recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX billing_client_invoice_page_idx ON billing_client_invoice(bill_id,live_mode,provider_created,invoice_id);
