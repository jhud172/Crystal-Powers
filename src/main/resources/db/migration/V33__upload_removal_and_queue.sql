ALTER TABLE support_attachment ADD COLUMN removed_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX support_attachment_queue_idx ON support_attachment(review_state,created_at,id);
