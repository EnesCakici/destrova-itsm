ALTER TABLE tickets
    ADD COLUMN IF NOT EXISTS process_instance_id BIGINT;
