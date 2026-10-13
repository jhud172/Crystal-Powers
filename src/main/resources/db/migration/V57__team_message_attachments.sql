ALTER TABLE team_message ADD CONSTRAINT team_message_channel_identity UNIQUE(channel_id,id);
CREATE TABLE team_message_attachment (
    id UUID PRIMARY KEY,
    channel_id UUID NOT NULL REFERENCES team_channel(id),
    message_id BIGINT NOT NULL,
    author_owner_id UUID REFERENCES admin_account(id),
    author_team_id UUID REFERENCES team_account(id),
    submission_key UUID NOT NULL UNIQUE,
    fingerprint VARCHAR(64) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL CHECK(size_bytes > 0 AND size_bytes <= 15728640),
    content BYTEA,
    review_state VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK(review_state IN ('PENDING','APPROVED','REJECTED')),
    review_note VARCHAR(1000) NOT NULL DEFAULT '',
    scan_state VARCHAR(20) NOT NULL DEFAULT 'UNSCANNED' CHECK(scan_state IN ('UNSCANNED','SCANNING','CLEAN','INFECTED','ERROR')),
    scan_token UUID,
    scan_started_at TIMESTAMP WITH TIME ZONE,
    scanned_at TIMESTAMP WITH TIME ZONE,
    removed_at TIMESTAMP WITH TIME ZONE,
    version INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(channel_id,message_id) REFERENCES team_message(channel_id,id),
    CHECK((author_owner_id IS NOT NULL AND author_team_id IS NULL) OR (author_owner_id IS NULL AND author_team_id IS NOT NULL)),
    CHECK((removed_at IS NULL AND content IS NOT NULL) OR (removed_at IS NOT NULL AND content IS NULL))
);
CREATE INDEX team_message_attachment_message_idx ON team_message_attachment(channel_id,message_id,created_at,id);
