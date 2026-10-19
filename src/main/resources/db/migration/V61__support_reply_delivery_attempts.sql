-- A late provider response must never complete or fail a replacement attempt.
ALTER TABLE support_message ADD COLUMN delivery_attempt_token UUID;
