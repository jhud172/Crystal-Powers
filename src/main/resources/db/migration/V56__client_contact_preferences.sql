ALTER TABLE client_account ADD COLUMN contact_preference VARCHAR(24) NOT NULL DEFAULT 'PORTAL_AND_EMAIL' CHECK (contact_preference IN ('PORTAL_ONLY','PORTAL_AND_EMAIL'));
ALTER TABLE client_account ADD COLUMN preferences_version INTEGER NOT NULL DEFAULT 0 CHECK (preferences_version >= 0);
