ALTER TABLE project ADD COLUMN creation_key UUID UNIQUE;
ALTER TABLE project ADD COLUMN creation_actor_owner UUID REFERENCES admin_account(id);
ALTER TABLE project ADD COLUMN creation_actor_team UUID REFERENCES team_account(id);
ALTER TABLE project ADD COLUMN creation_fingerprint VARCHAR(64);
ALTER TABLE project ADD CONSTRAINT project_creation_identity CHECK (
 (creation_key IS NULL AND creation_actor_owner IS NULL AND creation_actor_team IS NULL AND creation_fingerprint IS NULL)
 OR (creation_key IS NOT NULL AND creation_fingerprint IS NOT NULL AND
 ((creation_actor_owner IS NOT NULL AND creation_actor_team IS NULL) OR (creation_actor_owner IS NULL AND creation_actor_team IS NOT NULL)))
);
