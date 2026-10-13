ALTER TABLE team_message ADD COLUMN submission_key UUID;
ALTER TABLE team_message ADD COLUMN submission_fingerprint VARCHAR(64);
ALTER TABLE team_message ADD COLUMN reply_to_id BIGINT REFERENCES team_message(id);
CREATE UNIQUE INDEX team_message_submission_idx ON team_message(submission_key);
CREATE INDEX team_message_reply_idx ON team_message(reply_to_id);
