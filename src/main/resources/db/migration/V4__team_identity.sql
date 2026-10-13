CREATE TABLE team_workspace (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL UNIQUE REFERENCES admin_account(id),
    name VARCHAR(120) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE team_account (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES team_workspace(id),
    email VARCHAR(254) NOT NULL UNIQUE,
    display_name VARCHAR(120) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('ADMIN', 'MODERATOR', 'SUPPORT', 'MEMBER')),
    password_hash VARCHAR(255),
    state VARCHAR(20) NOT NULL DEFAULT 'INVITED' CHECK (state IN ('INVITED', 'ACTIVE', 'SUSPENDED')),
    credentials_version INTEGER NOT NULL DEFAULT 0,
    encrypted_totp TEXT,
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_totp_step BIGINT NOT NULL DEFAULT -1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE team_invitation (
    token_hash VARCHAR(64) PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES team_account(id),
    created_by_owner UUID NOT NULL REFERENCES admin_account(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE team_audit (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES team_workspace(id),
    actor_owner_id UUID REFERENCES admin_account(id),
    actor_team_id UUID REFERENCES team_account(id),
    event VARCHAR(80) NOT NULL,
    resource_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX team_account_workspace ON team_account (workspace_id, state, display_name);
CREATE INDEX team_invitation_account ON team_invitation (account_id, expires_at);
CREATE INDEX team_audit_workspace_time ON team_audit (workspace_id, created_at);
