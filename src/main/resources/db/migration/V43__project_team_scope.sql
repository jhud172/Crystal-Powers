ALTER TABLE project ADD COLUMN workspace_id UUID REFERENCES team_workspace(id);
CREATE INDEX project_workspace_idx ON project(workspace_id, archived, sort_order, created_at);
