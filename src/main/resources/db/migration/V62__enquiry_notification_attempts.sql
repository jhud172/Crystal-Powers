-- Keep enquiry notification results bound to the attempt that dispatched them.
ALTER TABLE support_request ADD COLUMN notification_attempt_token UUID;
