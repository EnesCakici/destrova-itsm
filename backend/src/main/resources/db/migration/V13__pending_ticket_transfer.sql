ALTER TABLE tickets
    ADD COLUMN IF NOT EXISTS pending_transfer_to_agent_id BIGINT REFERENCES app_users(id),
    ADD COLUMN IF NOT EXISTS pending_transfer_from_agent_id BIGINT REFERENCES app_users(id),
    ADD COLUMN IF NOT EXISTS pending_transfer_reason VARCHAR(50),
    ADD COLUMN IF NOT EXISTS pending_transfer_note TEXT,
    ADD COLUMN IF NOT EXISTS pending_transfer_at TIMESTAMP;
