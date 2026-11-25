CREATE TABLE docks_ai_budget_gate (id INTEGER PRIMARY KEY);
INSERT INTO docks_ai_budget_gate (id) VALUES (1);

CREATE TABLE docks_ai_budget (
    month_key VARCHAR(7) PRIMARY KEY,
    reserved_pence BIGINT NOT NULL CHECK (reserved_pence >= 0)
);

CREATE TABLE docks_ai_allowance (
    account_id UUID NOT NULL REFERENCES docks_account(id) ON DELETE CASCADE,
    month_key VARCHAR(7) NOT NULL,
    attempts INTEGER NOT NULL CHECK (attempts > 0),
    PRIMARY KEY (account_id, month_key)
);
