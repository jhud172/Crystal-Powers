CREATE INDEX billing_event_queue_idx ON billing_stripe_event(live_mode,state,received_at,event_id);
