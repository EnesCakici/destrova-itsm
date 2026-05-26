CREATE TABLE webhook_processed_events (
    event_id      VARCHAR(36) PRIMARY KEY,
    ticket_id     BIGINT NOT NULL,
    event_type    VARCHAR(50) NOT NULL,
    processed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
