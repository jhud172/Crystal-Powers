ALTER TABLE billing_intent ADD COLUMN withdrawal_requested_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE billing_intent ADD COLUMN withdrawn_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE billing_stripe_event ADD COLUMN last_failure_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE billing_stripe_event ADD COLUMN retry_after BIGINT NOT NULL DEFAULT 0;
