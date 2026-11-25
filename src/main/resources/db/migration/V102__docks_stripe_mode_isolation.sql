ALTER TABLE docks_subscription_checkout ADD COLUMN live_mode BOOLEAN DEFAULT FALSE NOT NULL;
CREATE INDEX docks_checkout_mode_account ON docks_subscription_checkout(account_id, live_mode, expires_at_epoch);

ALTER TABLE docks_household_invitation ADD COLUMN live_mode BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE docks_household_invitation RENAME COLUMN member_account_id TO legacy_member_account_id;
ALTER TABLE docks_household_invitation ADD COLUMN member_account_id UUID REFERENCES docks_account(id) ON DELETE CASCADE;
UPDATE docks_household_invitation SET member_account_id = legacy_member_account_id;
ALTER TABLE docks_household_invitation ADD CONSTRAINT docks_household_member_mode UNIQUE (member_account_id, live_mode);
ALTER TABLE docks_household_invitation DROP COLUMN legacy_member_account_id;
