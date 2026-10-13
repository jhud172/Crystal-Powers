ALTER TABLE team_workspace ADD COLUMN tagline VARCHAR(240) NOT NULL DEFAULT '';
ALTER TABLE team_workspace ADD COLUMN settings_version INTEGER NOT NULL DEFAULT 0;
CREATE TABLE team_preferences (
    actor_key VARCHAR(50) PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES team_workspace(id),
    owner_id UUID REFERENCES admin_account(id),
    member_id UUID REFERENCES team_account(id),
    compact BOOLEAN NOT NULL DEFAULT FALSE,
    unread_badges BOOLEAN NOT NULL DEFAULT TRUE,
    mention_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    version INTEGER NOT NULL DEFAULT 0,
    CHECK((owner_id IS NULL) <> (member_id IS NULL))
);
