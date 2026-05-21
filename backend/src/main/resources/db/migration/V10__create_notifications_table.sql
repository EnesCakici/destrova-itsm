CREATE TYPE notification_type AS ENUM (
    'TICKET_CREATED',
    'TICKET_ASSIGNED',
    'STATUS_CHANGED',
    'COMMENT_ADDED',
    'SLA_WARNING',
    'SLA_BREACHED',
    'TICKET_CLOSED'
);

CREATE TABLE notifications (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES app_users (id),
    related_ticket_id   BIGINT REFERENCES tickets (id),
    message             VARCHAR(500) NOT NULL,
    type                notification_type NOT NULL,
    is_read             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
