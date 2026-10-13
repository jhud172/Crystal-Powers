CREATE TABLE team_mention (
    message_id BIGINT NOT NULL REFERENCES team_message(id),
    channel_id UUID NOT NULL REFERENCES team_channel(id),
    recipient_key VARCHAR(50) NOT NULL,
    recipient_owner_id UUID REFERENCES admin_account(id),
    recipient_team_id UUID REFERENCES team_account(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY(message_id,recipient_key),
    CHECK ((recipient_owner_id IS NULL) <> (recipient_team_id IS NULL))
);
CREATE INDEX team_mention_recipient_idx ON team_mention(recipient_key,acknowledged_at,message_id);
