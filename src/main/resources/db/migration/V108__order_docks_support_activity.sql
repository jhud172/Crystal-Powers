ALTER TABLE docks_report_support_audit
    ADD COLUMN event_order BIGINT GENERATED ALWAYS AS IDENTITY;
