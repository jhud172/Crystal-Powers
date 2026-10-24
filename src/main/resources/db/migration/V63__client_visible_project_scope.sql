-- Optional client-visible scope, versioned with existing request tracking.
-- Older applications omit this column on updates and therefore preserve it.
ALTER TABLE support_request ADD COLUMN project_scope TEXT NOT NULL DEFAULT '';
