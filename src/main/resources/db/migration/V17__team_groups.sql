CREATE TABLE team_group (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES team_workspace(id),
    name VARCHAR(80) NOT NULL,
    name_key VARCHAR(80) NOT NULL,
    description VARCHAR(500) NOT NULL DEFAULT '',
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id,name_key)
);
CREATE TABLE team_group_member (
    group_id UUID NOT NULL REFERENCES team_group(id),
    member_id UUID NOT NULL REFERENCES team_account(id),
    PRIMARY KEY(group_id,member_id)
);
CREATE INDEX team_group_member_account_idx ON team_group_member(member_id,group_id);
ALTER TABLE team_channel ADD COLUMN group_id UUID REFERENCES team_group(id);
CREATE INDEX team_channel_group_idx ON team_channel(group_id);
