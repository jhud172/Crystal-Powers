ALTER TABLE team_message ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX team_message_pin_idx ON team_message(channel_id,pinned,deleted,id);
