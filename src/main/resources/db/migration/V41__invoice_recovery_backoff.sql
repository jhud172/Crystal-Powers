ALTER TABLE billing_invoice_sync ADD COLUMN failure_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE billing_invoice_sync ADD COLUMN retry_after TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE billing_invoice_sync ADD COLUMN last_failure_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX billing_invoice_sync_due_idx ON billing_invoice_sync(state,retry_after,invoice_id);
