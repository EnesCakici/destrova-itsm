-- Ürün oluşturulma zamanı (admin tablosu Created sütunu için).
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
