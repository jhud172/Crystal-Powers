CREATE TABLE admin_account (
    id UUID PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    encrypted_totp TEXT NOT NULL,
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_totp_step BIGINT NOT NULL DEFAULT -1,
    credentials_version INTEGER NOT NULL DEFAULT 0,
    owner_slot INTEGER NOT NULL DEFAULT 1 UNIQUE CHECK (owner_slot = 1),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recovery_code (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES admin_account(id),
    code_hash VARCHAR(64) NOT NULL UNIQUE,
    used_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE password_reset (
    token_hash VARCHAR(64) PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES admin_account(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE project (
    id UUID PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    draft_version INTEGER NOT NULL DEFAULT 1,
    published_version INTEGER,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE project_revision (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES project(id),
    version INTEGER NOT NULL,
    payload TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, version)
);

CREATE TABLE project_media (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES project(id),
    storage_key VARCHAR(255) NOT NULL UNIQUE,
    content_type VARCHAR(40) NOT NULL,
    bytes BIGINT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_audit (
    id UUID PRIMARY KEY,
    account_id UUID REFERENCES admin_account(id),
    event VARCHAR(80) NOT NULL,
    resource_id VARCHAR(120),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX project_public_order ON project (archived, sort_order, created_at);
CREATE INDEX project_media_owner ON project_media (project_id);
CREATE INDEX admin_audit_time ON admin_audit (created_at);
