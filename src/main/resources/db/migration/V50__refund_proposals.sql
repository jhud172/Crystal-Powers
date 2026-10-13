CREATE TABLE billing_refund_request (
 id UUID PRIMARY KEY,
 submission_key UUID NOT NULL UNIQUE,
 bill_id UUID NOT NULL REFERENCES billing_intent(bill_id),
 payment_id VARCHAR(100) NOT NULL REFERENCES billing_provider_payment(payment_id),
 charge_id VARCHAR(100) NOT NULL,
 live_mode BOOLEAN NOT NULL,
 amount_pence BIGINT NOT NULL CHECK(amount_pence BETWEEN 1 AND 99999999),
 reason VARCHAR(30) NOT NULL CHECK(reason IN ('requested_by_customer','duplicate','fraudulent')),
 note VARCHAR(1000) NOT NULL,
 state VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK(state IN ('DRAFT','RUNNING','PENDING','SUCCEEDED','FAILED','CANCELLED','RECONCILE_REQUIRED')),
 captured_pence BIGINT NOT NULL CHECK(captured_pence>=0),
 refunded_pence BIGINT NOT NULL CHECK(refunded_pence>=0 AND refunded_pence<=captured_pence),
 linked_bills INTEGER NOT NULL CHECK(linked_bills>=1),
 actor_owner_id UUID REFERENCES admin_account(id),
 actor_team_id UUID REFERENCES team_account(id),
 version INTEGER NOT NULL DEFAULT 0,
 provider_id VARCHAR(100),
 provider_state VARCHAR(50),
 created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK((actor_owner_id IS NOT NULL AND actor_team_id IS NULL) OR (actor_owner_id IS NULL AND actor_team_id IS NOT NULL))
);
CREATE INDEX billing_refund_page_idx ON billing_refund_request(bill_id,live_mode,created_at,id);
