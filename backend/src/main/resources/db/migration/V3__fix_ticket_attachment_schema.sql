-- Ticket/Attachment schema alignment for JWT-sub based ownership.

-- 1) tickets.creator_id kolonunu ekle (yoksa).
ALTER TABLE tickets
    ADD COLUMN IF NOT EXISTS creator_id BIGINT;

-- 2) creator_sub -> app_users.keycloak_sub eslesmesine gore creator_id backfill.
UPDATE tickets t
SET creator_id = u.id
FROM app_users u
WHERE t.creator_id IS NULL
  AND t.creator_sub IS NOT NULL
  AND t.creator_sub = u.keycloak_sub;

-- 3) creator_id tum kayitlarda doluysa NOT NULL yap.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM tickets WHERE creator_id IS NULL) THEN
        RAISE NOTICE 'tickets.creator_id NULL kalan satirlar var; NOT NULL uygulanmadi.';
    ELSE
        ALTER TABLE tickets ALTER COLUMN creator_id SET NOT NULL;
    END IF;
END $$;

-- 4) attachments eski uploaded_by kolonunu kaldir.
ALTER TABLE attachments
    DROP COLUMN IF EXISTS uploaded_by;

-- 5) attachments.uploaded_by_sub bos olanlari ticket sahibinin creator_sub degeriyle tamamla.
UPDATE attachments a
SET uploaded_by_sub = t.creator_sub
FROM tickets t
WHERE a.ticket_id = t.id
  AND a.uploaded_by_sub IS NULL
  AND t.creator_sub IS NOT NULL;

-- 6) uploaded_by_sub tum kayitlarda doluysa NOT NULL yap.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM attachments WHERE uploaded_by_sub IS NULL) THEN
        RAISE NOTICE 'attachments.uploaded_by_sub NULL kalan satirlar var; NOT NULL uygulanmadi.';
    ELSE
        ALTER TABLE attachments ALTER COLUMN uploaded_by_sub SET NOT NULL;
    END IF;
END $$;
