-- is_active kolonunu güvenli şekilde ekle:
-- Önce nullable olarak ekle, mevcut satırları doldur, sonra NOT NULL yap.
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN;

UPDATE products SET is_active = TRUE WHERE is_active IS NULL;

ALTER TABLE products ALTER COLUMN is_active SET NOT NULL;
ALTER TABLE products ALTER COLUMN is_active SET DEFAULT TRUE;
