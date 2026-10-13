ALTER TABLE team_invitation ALTER COLUMN created_by_owner DROP NOT NULL;
ALTER TABLE team_invitation ADD COLUMN created_by_team UUID REFERENCES team_account(id);
ALTER TABLE team_invitation ADD CONSTRAINT team_invitation_actor CHECK ((created_by_owner IS NULL) <> (created_by_team IS NULL));
