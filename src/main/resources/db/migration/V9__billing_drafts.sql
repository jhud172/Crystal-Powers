CREATE TABLE billing_payment_request (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES team_workspace(id),
    request_id UUID NOT NULL REFERENCES support_request(id),
    submission_key UUID NOT NULL UNIQUE,
    purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('FULL', 'DEPOSIT', 'BALANCE', 'MONTHLY')),
    title VARCHAR(200) NOT NULL,
    amount_pence BIGINT NOT NULL CHECK (amount_pence BETWEEN 1 AND 99999999),
    currency VARCHAR(3) NOT NULL DEFAULT 'GBP' CHECK (currency = 'GBP'),
    terms VARCHAR(3000) NOT NULL,
    state VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (state IN ('DRAFT', 'CANCELLED')),
    created_by_owner UUID REFERENCES admin_account(id),
    created_by_team UUID REFERENCES team_account(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ((created_by_owner IS NOT NULL AND created_by_team IS NULL) OR (created_by_owner IS NULL AND created_by_team IS NOT NULL))
);
CREATE INDEX billing_request_idx ON billing_payment_request(workspace_id, request_id, created_at);
