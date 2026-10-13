CREATE TABLE support_request (
    id UUID PRIMARY KEY,
    submission_key UUID NOT NULL UNIQUE,
    fingerprint VARCHAR(64) NOT NULL,
    workspace_id UUID REFERENCES team_workspace(id),
    client_name VARCHAR(170) NOT NULL,
    client_email VARCHAR(150) NOT NULL,
    intent VARCHAR(20) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    source_label VARCHAR(80) NOT NULL,
    payload TEXT NOT NULL,
    state VARCHAR(30) NOT NULL DEFAULT 'NEW' CHECK (state IN ('NEW','REVIEWING','QUOTED','IN_PROGRESS','WAITING_CLIENT','COMPLETED','CLOSED')),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    next_step VARCHAR(1000) NOT NULL DEFAULT '',
    assigned_member_id UUID REFERENCES team_account(id),
    notification_state VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (notification_state IN ('PENDING','SENDING','SENT','FAILED')),
    notification_started_at TIMESTAMP WITH TIME ZONE,
    version INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE support_message (
    id UUID PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES support_request(id),
    submission_key UUID NOT NULL UNIQUE,
    author_owner_id UUID REFERENCES admin_account(id),
    author_team_id UUID REFERENCES team_account(id),
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('INTERNAL','CLIENT')),
    body VARCHAR(4000) NOT NULL,
    delivery_state VARCHAR(20) NOT NULL DEFAULT 'SAVED' CHECK (delivery_state IN ('SAVED','SENDING','SENT','FAILED')),
    delivery_started_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ((author_owner_id IS NULL) <> (author_team_id IS NULL))
);
CREATE TABLE support_event (
    id UUID PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES support_request(id),
    actor_owner_id UUID REFERENCES admin_account(id),
    actor_team_id UUID REFERENCES team_account(id),
    event VARCHAR(80) NOT NULL,
    detail VARCHAR(1200) NOT NULL,
    customer_visible BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE support_attachment (
    id UUID PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES support_request(id),
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(150) NOT NULL,
    size_bytes BIGINT NOT NULL,
    content BYTEA NOT NULL,
    review_state VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (review_state IN ('PENDING','APPROVED','REJECTED')),
    review_note VARCHAR(500) NOT NULL DEFAULT '',
    version INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX support_request_workspace_time ON support_request(workspace_id, created_at, id);
CREATE INDEX support_request_workspace_state ON support_request(workspace_id, state, updated_at);
CREATE INDEX support_message_request_time ON support_message(request_id, created_at, id);
CREATE INDEX support_event_request_time ON support_event(request_id, created_at, id);
CREATE INDEX support_attachment_request ON support_attachment(request_id, review_state);
