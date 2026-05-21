-- Destrova ürün kataloğu için products tablosuna yeni kolonlar ekleniyor.

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS category       VARCHAR(80),
    ADD COLUMN IF NOT EXISTS latest_version VARCHAR(40),
    ADD COLUMN IF NOT EXISTS is_active      BOOLEAN NOT NULL DEFAULT TRUE;
