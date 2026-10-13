CREATE TABLE team_channel_read (
    channel_id UUID NOT NULL REFERENCES team_channel(id),
    reader_key VARCHAR(50) NOT NULL,
    reader_owner_id UUID REFERENCES admin_account(id),
    reader_team_id UUID REFERENCES team_account(id),
    last_read_id BIGINT NOT NULL DEFAULT 0 CHECK(last_read_id>=0),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(channel_id,reader_key),
    CHECK ((reader_owner_id IS NULL) <> (reader_team_id IS NULL))
);
