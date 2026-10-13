CREATE TABLE team_role_profile (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES team_workspace(id),
    name VARCHAR(80) NOT NULL,
    base_role VARCHAR(20) NOT NULL,
    permissions VARCHAR(2000) NOT NULL,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 0,
    UNIQUE(workspace_id,name),
    CHECK(base_role IN ('ADMIN','MODERATOR','SUPPORT','MEMBER'))
);
ALTER TABLE team_account ADD COLUMN role_profile_id UUID REFERENCES team_role_profile(id);
CREATE INDEX team_account_role_profile_idx ON team_account(role_profile_id);
