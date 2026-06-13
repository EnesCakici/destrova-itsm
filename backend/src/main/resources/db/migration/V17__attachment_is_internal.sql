-- Team-only attachments (internal notes) must not be visible to customers.
ALTER TABLE attachments
    ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;
