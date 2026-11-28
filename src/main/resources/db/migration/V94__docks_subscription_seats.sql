CREATE TABLE docks_subscription_seat (
    stripe_subscription_id VARCHAR(100) NOT NULL
        REFERENCES docks_subscription_status(stripe_subscription_id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES docks_device(id) ON DELETE CASCADE,
    PRIMARY KEY (stripe_subscription_id, device_id)
);

CREATE INDEX docks_subscription_seat_device ON docks_subscription_seat(device_id);
