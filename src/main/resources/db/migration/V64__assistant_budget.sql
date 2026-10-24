CREATE TABLE assistant_budget (
 month_key VARCHAR(7) PRIMARY KEY,
 reserved_pence BIGINT NOT NULL DEFAULT 0 CHECK (reserved_pence >= 0)
);
