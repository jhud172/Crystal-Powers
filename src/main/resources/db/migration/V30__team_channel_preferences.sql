CREATE TABLE team_channel_preferences (
    actor_key VARCHAR(50) NOT NULL,
    channel_id UUID NOT NULL REFERENCES team_channel(id),
    workspace_id UUID NOT NULL REFERENCES team_workspace(id),
    owner_id UUID REFERENCES admin_account(id),
    member_id UUID REFERENCES team_account(id),
    unread_badges BOOLEAN NOT NULL DEFAULT TRUE,
    mention_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    favourite BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(actor_key,channel_id),
    CHECK((owner_id IS NULL) <> (member_id IS NULL))
);
