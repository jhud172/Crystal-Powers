ALTER TABLE billing_refund_request ADD COLUMN confirmation_owner_id UUID REFERENCES admin_account(id);
ALTER TABLE billing_refund_request ADD COLUMN confirmation_team_id UUID REFERENCES team_account(id);
ALTER TABLE billing_refund_request ADD COLUMN confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE billing_refund_request ADD COLUMN first_submission_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE billing_refund_request ADD COLUMN lease_token UUID;
ALTER TABLE billing_refund_request ADD COLUMN lease_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE billing_refund_request ADD COLUMN ledger_reconciled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE billing_refund_request ADD CONSTRAINT refund_confirmation_identity CHECK (
 (confirmed_at IS NULL AND confirmation_owner_id IS NULL AND confirmation_team_id IS NULL)
 OR (confirmed_at IS NOT NULL AND ((confirmation_owner_id IS NOT NULL AND confirmation_team_id IS NULL) OR (confirmation_owner_id IS NULL AND confirmation_team_id IS NOT NULL)))
);
CREATE INDEX billing_refund_charge_state_idx ON billing_refund_request(charge_id,live_mode,state);
