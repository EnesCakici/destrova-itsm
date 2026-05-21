-- Durum alanını Active | Disabled ile hizala (V8 sonrası mevcut satırlar için).
-- E-posta için sahte değer üretilmez; adres Keycloak / admin düzenlemesi ile dolar.

UPDATE app_users
SET status = 'Active'
WHERE status IS NULL OR TRIM(COALESCE(status, '')) = '';

UPDATE app_users
SET status = 'Disabled'
WHERE LOWER(TRIM(status)) IN ('suspended', 'invited', 'inactive');
