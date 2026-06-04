# Destrova P17 — Keycloak Custom Theme Revize Master Plan
> Keycloak 26.6.1 · parent=keycloak.v2 · Gerçek deneyime dayalı, güvenli uygulama planı
> P16 tamamlandı ve korunuyor. Bu belge yalnızca P17'yi kapsar.

---

## 1 — Güncellenmiş UX Kararı

### P16 ve P17 Rolleri

| | P16 — React Landing (`/login`) | P17 — Keycloak Auth Ekranı |
|--|------|------|
| **Amaç** | Marka deneyimi, karşılama, yönlendirme | Kimlik doğrulama — hızlı ve odaklı |
| **Tasarım** | İki sütun, sol koyu panel + sağ kart | Tek kart, merkezi, minimal |
| **İçerik** | Logo, slogan, özellik listesi, SSO notu | Logo, başlık, form, submit |
| **Aksiyon** | "Continue to Destrova" butonu | Kullanıcı adı + şifre + Sign in |
| **Duygu** | "Bu profesyonel bir platform" | "Güvenli ve hızlı giriş" |

### Neden P17 İki Sütunlu Olmayacak?

Kullanıcı P16'da marka deneyimini zaten yaşadı. P17'de aynı pazarlama panelini tekrar görmek:
- Gereksiz bilişsel yük yaratır
- Kullanıcının dikkatini asıl görevden (giriş yapmak) uzaklaştırır
- "İki farklı uygulama" hissini **pekiştirir**, azaltmaz

Premium B2B SaaS ürünleri (Okta, Auth0, Vercel, Linear) tek kartlı, sade, odaklı auth ekranı kullanır. Sadelik güven verir.

### P17 Hedef Deneyimi

```
Kullanıcı "Continue to Destrova"'ya basar
  ↓
Sayfa geçişi
  ↓
Sade, açık arka plan
Ortada tek beyaz kart
  ┌──────────────────────────────────┐
  │  [Destrova logosu — küçük]       │
  │                                  │
  │  Sign in to Destrova             │
  │  Use your organization account   │
  │  to continue.                    │
  │                                  │
  │  Email or username               │
  │  [________________________]      │
  │                                  │
  │  Password                        │
  │  [________________________]  👁  │
  │                                  │
  │  □ Remember me   Forgot password?│
  │                                  │
  │  [       Sign In              ]  │
  │                                  │
  └──────────────────────────────────┘
```

---

## 2 — Hedef Tasarım Spesifikasyonu

### Renkler

| Token | Hex | Nerede |
|-------|-----|--------|
| `--d-navy` | `#0F0E47` | Submit butonu arka planı |
| `--d-navy-hover` | `#1a1960` | Submit butonu hover |
| `--d-violet` | `#6d28d9` | Input focus ring, linkler |
| `--d-bg` | `#f8fafc` | Sayfa arka planı |
| `--d-white` | `#ffffff` | Kart arka planı |
| `--d-text` | `#0f172a` | Başlık ve label |
| `--d-muted` | `#475569` | Alt metin, placeholder |
| `--d-border` | `#e2e8f0` | Input kenarlığı |
| `--d-error` | `#ef4444` | Hata rengi |
| `--d-error-bg` | `#fef2f2` | Hata arka planı |

### Kart

```
max-width: 420px
padding: 40px
border-radius: 20px
border: 1px solid #e2e8f0
background: #ffffff
box-shadow: 0 24px 64px rgba(15,14,71,0.10)
```

### Tipografi

```
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif
Başlık:  font-size 24px, font-weight 700
Alt metin: font-size 14px, color #475569
Label:   font-size 13px, font-weight 600, color #334155
```

### Inputlar

```
height: 46px
border: 1.5px solid #e2e8f0
border-radius: 10px
background: #f8fafc
font-size: 15px
focus → border: #6d28d9, box-shadow: 0 0 0 3px rgba(109,40,217,0.16)
```

### Submit Butonu

```
height: 48px
border-radius: 12px
background: #0F0E47
font-size: 15px, font-weight 700, color: #ffffff
box-shadow: 0 8px 24px rgba(15,14,71,0.25)
hover → background: #1a1960, translateY(-1px)
```

### Logo

```
Kaynak: frontend/public/Destrova_logo.png
Hedef:  keycloak-theme/destrova/login/resources/img/logo.png (zaten mevcut)
Boyut:  40px height, border-radius: 10px, kart üstünde solda
```

---

## 3 — Teknik Strateji

### Keycloak 26.6.1 + `parent=keycloak.v2` Gerçeği

Keycloak 26.x `keycloak.v2` teması **Patternfly 5** (`pf-v5-*`) class'ları kullanır.

Default login sayfasının HTML iskeletinin sadeleştirilmiş hali:

```html
<body>
  <div class="pf-v5-c-login">
    <div class="pf-v5-c-login__container">
      <header class="pf-v5-c-login__header">
        <!-- realm logosu / başlığı -->
        <div class="pf-v5-c-login__header-brand">
          <img .../>
        </div>
        <div>
          <h1>ticket-realm</h1>
        </div>
      </header>
      <main class="pf-v5-c-login__main">
        <header class="pf-v5-c-login__main-header">
          <h1 class="pf-v5-c-title pf-m-3xl">Sign in to your account</h1>
        </header>
        <div class="pf-v5-c-login__main-body">
          <form ...>
            <div class="pf-v5-c-form">
              <div class="pf-v5-c-form__group">
                <label class="pf-v5-c-form__label">...</label>
                <span class="pf-v5-c-form-control">
                  <input .../>
                </span>
              </div>
              ...
            </div>
            <button class="pf-v5-c-button pf-m-primary pf-m-block">Sign In</button>
          </form>
        </div>
        <footer class="pf-v5-c-login__main-footer">
          <!-- register link -->
        </footer>
      </main>
    </div>
  </div>
</body>
```

### Neden Önceki CSS Çalışmadı?

Önceki `login.css` `.destrova-brand-panel`, `.destrova-form-panel` gibi **özel class'ları** hedefliyordu. Bu class'lar yalnızca özel bir `template.ftl` ile HTML'e eklenebilir. Keycloak'ın kendi `template.ftl`'i bunları üretmez. CSS hiçbir şeyi etkileyemedi.

### Neden CSS-Only Yeterli Olabilir?

Keycloak.v2 zaten tek kartlı merkezi layout üretiyor. Yapmamız gereken:
1. Patternfly 5 CSS değişkenlerini Destroya paletine yönlendir
2. Doğru `pf-v5-*` class'larını hedefle
3. Font'u değiştir
4. Kart görünümünü ince ayarla

Logo için minimal `login.ftl` override gerekecek ama bu küçük ve güvenli.

### FTL Stratejisi: "Sadece Header Section"

Önceki hatanın nedeni: `template.ftl`'i sıfırdan yazmak. Bu çok riskli.

Doğru yaklaşım:
1. `template.ftl` asla oluşturulmaz (parent'ınkini kullanır)
2. `login.ftl`'de sadece `section = "header"` bloğu değiştirilir
3. `section = "form"` bloğu parent'a bırakılır

Bu şekilde:
- Form mekanikleri (CSRF, action URL, error handling) tamamen Keycloak'ın elinde kalır
- Sadece görsel başlık alanı değişir
- FTL syntax hatası riski minimuma iner

### Uygulama Yol Haritası

```
Aşama 0 → Kararlılığa dön (clean state)
Aşama 1 → Volume mount kalıcı çözümü
Aşama 2 → CSS rewrite (PF5 class'ları hedefle)
Aşama 3 → CSS-only sonucu değerlendir → yeterliyse dur
Aşama 4 → Login.ftl minimal logo override (gerekirse)
Aşama 5 → Update-password ekranı
Aşama 6 → Test ve rollback hazırlığı
```

---

## 4 — Güvenli Uygulama Sırası

---

### AŞAMA 0 — Kararlılığa Dön

**Amaç:** Kırık FTL dosyalarının tamamen temizlenmesi, sistemin stabil çalışması.

#### Adım 0.1 — Host Tarafı FTL Temizliği

Host'taki `.bak` dosyaları artık gerekmiyor ama zararsız — bırakılabilir.
Aktif FTL dosyası olmamalı. Kontrol:

```powershell
ls C:\Users\Enes\Desktop\itsm-ticket-system\keycloak-theme\destrova\login\
```

Görmemen gereken: `login.ftl`, `template.ftl`, `login-update-password.ftl` (aktif, `.bak` değil)
Olması normal: `login.ftl.bak`, `template.ftl.bak`

#### Adım 0.2 — Container İçi FTL Temizliği

```bash
# Aktif FTL dosyası var mı kontrol et
docker exec ticket-keycloak ls /opt/keycloak/themes/destrova/login/

# Varsa temizle (sadece aktif .ftl dosyaları — .bak yoktur zaten)
docker exec -u root ticket-keycloak sh -c "
  rm -f /opt/keycloak/themes/destrova/login/login.ftl
  rm -f /opt/keycloak/themes/destrova/login/template.ftl
  rm -f /opt/keycloak/themes/destrova/login/login-update-password.ftl
"
```

#### Adım 0.3 — Keycloak Admin'de Tema Kontrolü

1. `http://localhost:8081` → admin / admin
2. Realm Settings → Themes → Login Theme
3. `keycloak.v2` seçili mi? Değilse seç ve kaydet.
4. `http://localhost:8081/realms/ticket-realm/account` → temiz Keycloak login sayfası görünüyor mu?

Keycloak varsayılan login sayfası görünüyorsa Aşama 0 tamamlandı.

---

### AŞAMA 1 — Volume Mount Kalıcı Çözümü

#### Neden `docker inspect []` Döndü?

`docker-compose.yml`'de volume mount **doğru yazılmış**:
```yaml
volumes:
  - ./keycloak-theme/destrova:/opt/keycloak/themes/destrova
```

Ama container bu satır eklenmeden önce oluşturulmuştu. `docker-compose restart` container'ı yeniden oluşturmaz, sadece yeniden başlatır. Volume mount değişiklikleri için container'ın `recreate` edilmesi gerekir.

#### Adım 1.1 — Container'ı Force Recreate Et

```bash
# Keycloak'ı durdur ve sil (veriler postgres'te, silinmez)
docker-compose stop keycloak
docker-compose rm -f keycloak

# Yeniden oluştur ve başlat
docker-compose up -d keycloak

# Log'u izle (60 saniye)
docker logs ticket-keycloak --tail 50 -f
```

`Keycloak 26.x.x ... started in` satırını görünce devam et.

#### Adım 1.2 — Mount'u Doğrula

```bash
# Mounts [] DEĞİL, içinde bind mount görünmeli
docker inspect ticket-keycloak --format "{{json .Mounts}}"
```

Beklenen çıktı:
```json
[{"Type":"bind","Source":"C:\\Users\\Enes\\Desktop\\itsm-ticket-system\\keycloak-theme\\destrova","Destination":"/opt/keycloak/themes/destrova","Mode":"","RW":true,"Propagation":"rprivate"}]
```

#### Adım 1.3 — Container İçi Dosyaları Doğrula

```bash
docker exec ticket-keycloak ls /opt/keycloak/themes/destrova/login/
# Beklenen: resources/  theme.properties

docker exec ticket-keycloak ls /opt/keycloak/themes/destrova/login/resources/css/
# Beklenen: login.css

docker exec ticket-keycloak ls /opt/keycloak/themes/destrova/login/resources/img/
# Beklenen: logo.png
```

Her şey görünüyorsa Aşama 1 tamamlandı.

#### Adım 1.4 — theme.properties Doğrula

```bash
docker exec ticket-keycloak cat /opt/keycloak/themes/destrova/login/theme.properties
```

Şu an içeriği:
```
parent=keycloak.v2
import=common/keycloak
styles=css/login.css
```

Bu doğru. Değiştirme.

---

### AŞAMA 2 — CSS Rewrite (Patternfly 5 Hedefli)

**Amaç:** Mevcut CSS'i, Keycloak 26.6.1 + `keycloak.v2` parent'ın gerçek HTML class'larını hedefleyecek şekilde yeniden yaz.

**Önemli:** Mevcut `login.css`'deki değişkenler (renkler, font import) doğru — sadece selector'lar değiştirilecek.

#### Cursor Prompt — P17-CSS (login.css tam yeniden yazım)

```
Görev: keycloak-theme/destrova/login/resources/css/login.css dosyasını tamamen yeniden yaz.
Önceki CSS iki sütunlu custom class yapısına göre yazılmıştı. Bu sürüm
Keycloak 26.6.1 + parent=keycloak.v2 'nin gerçek Patternfly 5 HTML yapısını hedefler.

Dosya: keycloak-theme/destrova/login/resources/css/login.css
(Mevcut dosyanın tüm içeriğini sil, yeni içerikle değiştir)

Yeni içerik:

/* =============================================================
   DESTROVA — Keycloak 26 Theme · login.css
   parent=keycloak.v2 · Patternfly 5 hedefli
   Tasarım: Tek kartlı, merkezi, sade auth ekranı
   ============================================================= */

/* Inter font */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* CSS Değişkenleri */
:root {
  --d-navy:         #0F0E47;
  --d-navy-hover:   #1a1960;
  --d-violet:       #6d28d9;
  --d-bg:           #f8fafc;
  --d-white:        #ffffff;
  --d-text:         #0f172a;
  --d-label:        #334155;
  --d-muted:        #475569;
  --d-soft:         #94a3b8;
  --d-border:       #e2e8f0;
  --d-border-focus: #6d28d9;
  --d-error:        #ef4444;
  --d-error-bg:     #fef2f2;
  --d-error-border: #fecaca;
  --d-success-bg:   #ecfdf5;
  --d-success-text: #065f46;
}

/* Global */
*, *::before, *::after { box-sizing: border-box; }

html, body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
  background: var(--d-bg) !important;
  color: var(--d-text) !important;
  margin: 0 !important;
  padding: 0 !important;
}

/* ── Dış kapsayıcı: tam ekran merkez ── */
.pf-v5-c-login {
  background: var(--d-bg) !important;
  min-height: 100vh !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 2rem 1rem !important;
}

/* Keycloak.v2 bazen farklı wrapper kullanır */
.pf-v5-c-login__container {
  width: 100% !important;
  max-width: 440px !important;
}

/* ── Üst sayfa başlığı (realm adı) — gizle ── */
.pf-v5-c-login__header,
header.pf-v5-c-login__header {
  display: none !important;
}

/* ── Ana kart ── */
.pf-v5-c-login__main {
  background: var(--d-white) !important;
  border: 1px solid var(--d-border) !important;
  border-radius: 20px !important;
  box-shadow: 0 24px 64px rgba(15,14,71,0.10) !important;
  overflow: hidden !important;
  width: 100% !important;
}

/* ── Kart başlığı (logo + başlık alanı) ── */
.pf-v5-c-login__main-header {
  padding: 2.25rem 2.5rem 1.5rem !important;
  border-bottom: 0 !important;
}

/* Başlık h1 */
.pf-v5-c-login__main-header .pf-v5-c-title,
.pf-v5-c-login__main-header h1 {
  font-size: 1.5rem !important;
  font-weight: 700 !important;
  color: var(--d-text) !important;
  margin: 0 0 0.375rem !important;
  line-height: 1.2 !important;
  font-family: 'Inter', sans-serif !important;
}

/* Alt açıklama */
.pf-v5-c-login__main-header p,
.pf-v5-c-login__main-header .pf-v5-c-login__main-header-desc {
  color: var(--d-muted) !important;
  font-size: 0.875rem !important;
  margin: 0 !important;
  line-height: 1.5 !important;
}

/* ── Form gövdesi ── */
.pf-v5-c-login__main-body {
  padding: 0 2.5rem 1.75rem !important;
}

/* ── Form grupları ── */
.pf-v5-c-form__group {
  margin-bottom: 1rem !important;
}

/* Label */
.pf-v5-c-form__label,
.pf-v5-c-form__label-text {
  font-size: 0.8125rem !important;
  font-weight: 600 !important;
  color: var(--d-label) !important;
  display: block !important;
  margin-bottom: 0.375rem !important;
  font-family: 'Inter', sans-serif !important;
}

/* ── Input alanları ── */
.pf-v5-c-form-control,
.pf-v5-c-form-control input,
input[type="text"],
input[type="email"],
input[type="password"],
input[name="username"],
input[name="password"] {
  width: 100% !important;
  height: 46px !important;
  padding: 0 0.875rem !important;
  border: 1.5px solid var(--d-border) !important;
  border-radius: 10px !important;
  background: #f8fafc !important;
  color: var(--d-text) !important;
  font-family: 'Inter', sans-serif !important;
  font-size: 0.9375rem !important;
  font-weight: 400 !important;
  box-shadow: none !important;
  outline: none !important;
  transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
}

input[type="text"]:focus,
input[type="email"]:focus,
input[type="password"]:focus,
.pf-v5-c-form-control:focus-within {
  background: var(--d-white) !important;
  border-color: var(--d-border-focus) !important;
  box-shadow: 0 0 0 3px rgba(109,40,217,0.16) !important;
}

/* Input group (şifre + göster/gizle toggle) */
.pf-v5-c-input-group {
  display: flex !important;
  align-items: stretch !important;
}

.pf-v5-c-input-group .pf-v5-c-form-control {
  border-right: none !important;
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
}

/* Toggle butonu (şifreyi göster) */
.pf-v5-c-input-group__item:last-child button,
button[data-ouia-component-type="PF5/Button"].pf-m-control {
  height: 46px !important;
  border: 1.5px solid var(--d-border) !important;
  border-left: none !important;
  border-top-right-radius: 10px !important;
  border-bottom-right-radius: 10px !important;
  background: #f8fafc !important;
  color: var(--d-soft) !important;
  padding: 0 0.75rem !important;
  cursor: pointer !important;
  transition: color 0.15s ease !important;
}

.pf-v5-c-input-group__item:last-child button:hover {
  color: var(--d-violet) !important;
}

/* ── Submit butonu ── */
.pf-v5-c-button.pf-m-primary,
button[type="submit"],
input[type="submit"],
#kc-login {
  width: 100% !important;
  height: 48px !important;
  background: var(--d-navy) !important;
  color: #ffffff !important;
  border: none !important;
  border-radius: 12px !important;
  font-family: 'Inter', sans-serif !important;
  font-size: 0.9375rem !important;
  font-weight: 700 !important;
  cursor: pointer !important;
  box-shadow: 0 8px 24px rgba(15,14,71,0.25) !important;
  transition: background 0.2s, transform 0.1s, box-shadow 0.2s !important;
  margin-top: 0.375rem !important;
}

.pf-v5-c-button.pf-m-primary:hover,
button[type="submit"]:hover {
  background: var(--d-navy-hover) !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 12px 28px rgba(15,14,71,0.32) !important;
}

.pf-v5-c-button.pf-m-primary:active {
  transform: translateY(0) !important;
}

/* ── Form seçenekleri (remember me + forgot password) ── */
.pf-v5-c-form__group:has(#rememberMe),
#kc-form-options,
.pf-v5-c-login__main-body .checkbox {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  margin-bottom: 1.25rem !important;
  margin-top: 0.25rem !important;
}

/* Checkbox */
input[type="checkbox"] {
  accent-color: var(--d-violet) !important;
  width: 15px !important;
  height: 15px !important;
}

/* Remember me label */
.pf-v5-c-form__group:has(#rememberMe) label,
#kc-form-options label {
  color: var(--d-muted) !important;
  font-size: 0.8125rem !important;
  font-weight: 400 !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  cursor: pointer !important;
}

/* ── Linkler ── */
a,
.pf-v5-c-login__main-footer a,
.pf-v5-c-login__main-body a {
  color: var(--d-violet) !important;
  font-size: 0.8125rem !important;
  font-weight: 600 !important;
  text-decoration: none !important;
  transition: color 0.15s ease !important;
}

a:hover {
  color: var(--d-navy) !important;
  text-decoration: underline !important;
}

/* ── Alert ve hata mesajları ── */
.pf-v5-c-alert,
.alert,
.alert-error,
div[role="alert"],
#input-error,
.pf-v5-c-form__helper-text {
  background: var(--d-error-bg) !important;
  border: 1px solid var(--d-error-border) !important;
  border-radius: 10px !important;
  padding: 0.625rem 0.875rem !important;
  margin-bottom: 1rem !important;
  font-size: 0.8125rem !important;
  color: #991b1b !important;
  font-weight: 500 !important;
}

.pf-v5-c-alert.pf-m-success,
.alert-success {
  background: var(--d-success-bg) !important;
  border-color: #a7f3d0 !important;
  color: var(--d-success-text) !important;
}

.pf-v5-c-alert.pf-m-warning {
  background: #fffbeb !important;
  border-color: #fde68a !important;
  color: #92400e !important;
}

/* Hata olan input */
.pf-v5-c-form-control.pf-m-error,
input[aria-invalid="true"],
input.pf-m-error {
  border-color: var(--d-error) !important;
  box-shadow: 0 0 0 2px rgba(239,68,68,0.14) !important;
}

/* ── Footer (kayıt linki) ── */
.pf-v5-c-login__main-footer {
  padding: 1.25rem 2.5rem 1.75rem !important;
  border-top: 1px solid var(--d-border) !important;
  text-align: center !important;
  font-size: 0.8125rem !important;
  color: var(--d-muted) !important;
  background: var(--d-white) !important;
}

/* ── Sayfa footer (Keycloak alt çubuğu) — gizle ── */
.pf-v5-c-login__footer {
  display: none !important;
}

/* ── Social login butonları (varsa) ── */
.pf-v5-c-button.pf-m-secondary {
  background: var(--d-white) !important;
  border: 1.5px solid var(--d-border) !important;
  color: var(--d-label) !important;
  border-radius: 10px !important;
  font-family: 'Inter', sans-serif !important;
  font-weight: 600 !important;
  transition: background 0.15s, border-color 0.15s !important;
}

.pf-v5-c-button.pf-m-secondary:hover {
  background: var(--d-bg) !important;
  border-color: #cbd5e1 !important;
}

/* ── Responsive ── */
@media (max-width: 520px) {
  .pf-v5-c-login {
    padding: 0 !important;
    align-items: flex-start !important;
  }
  .pf-v5-c-login__main {
    border-radius: 0 !important;
    border: none !important;
    box-shadow: none !important;
    min-height: 100vh !important;
  }
  .pf-v5-c-login__main-header,
  .pf-v5-c-login__main-body {
    padding-left: 1.5rem !important;
    padding-right: 1.5rem !important;
  }
}

KURAL: Dosyanın TÜM içeriğini sil ve bu yeni içerikle değiştir.
```

---

### AŞAMA 2 Sonrası: CSS Sonucunu Değerlendir

Volume mount çalışıyor, yeni CSS deploy edildi. Şimdi test et:

**Manuel test (Docker cp yerine mount çalışıyorsa otomatik):**
```bash
# Container'ı restart et (cache temizle)
docker restart ticket-keycloak

# 30-60 sn bekle
# Keycloak login sayfasına git (React "Continue" butonundan veya direkt)
```

**Değerlendirme kriterleri:**
- [ ] Sayfa arka planı slate-50 gri mi?
- [ ] Ortada beyaz kart var mı?
- [ ] Input'lar Destrova stiliyle mi?
- [ ] Buton koyu navy mi?
- [ ] Linkler violet mi?
- [ ] "ticket-realm" başlığı/header gizlendi mi?

**Yeterli görünüyorsa Aşama 4'ü atla (logo için FTL gerek var ama sonraya bırakabilirsin)**
**Form solda kalıyor veya düzensizse Aşama 3'e geç**

---

### AŞAMA 3 — Sorun Giderme (CSS Çalışmıyorsa)

#### 3.1 — Gerçek Class'ları Tespit Et

Keycloak 26.6.1'in gerçek HTML yapısını browser DevTools ile kontrol et:

1. `http://localhost:8081/realms/ticket-realm/protocol/openid-connect/auth?client_id=ticket-frontend&...` adresine git
2. F12 → Elements sekmesi
3. Login formunu sarmalayan div'in class adını not al
4. Input'ların class adını not al
5. Submit butonunun class adını not al

Eğer class'lar `pf-v5-c-*` değil de `pf-c-*` (v4) ise:
CSS'de `pf-v5-c-` yazan tüm yerleri `pf-c-` ile değiştir.

#### 3.2 — Hangi Stil Uygulandığını Gör

DevTools → Elements → form'u seç → Styles paneli → hangi CSS kurallarının uygulandığını gör.
`login.css`'den kurallar geliyorsa mount çalışıyor demektir.

---

### AŞAMA 4 — Minimal Login.ftl (Logo Eklemek için)

**⚠️ Bu aşama FTL içeriyor. Dikkatli uygulanmalı.**

**Ön adım — Parent login.ftl'i oku:**

```bash
docker exec ticket-keycloak cat /opt/keycloak/themes/keycloak.v2/login/login.ftl > keycloak-theme/destrova/login/login.ftl.reference
```

Bu komutu çalıştır ve `login.ftl.reference` dosyasının içeriğini bir metin editörde aç. Dosyanın başındaki macro çağrısına bak:
```
<@layout.registrationLayout ...>
```
Bu satırı bul ve hangi değişkenleri aldığını not al.

Ayrıca `section = "header"` bloğunun yapısını gör.

---

#### Cursor Prompt — P17-FTL (Minimal logo override — parent template korunur)

```
Görev: login.ftl dosyasını minimal logo override ile oluştur.
Parent=keycloak.v2 template.ftl'ini KORUYORUZ.
SADECE header section'a logo ekleyeceğiz.
Form mekaniklerine hiç dokunmuyoruz.

Dosya (yeni): keycloak-theme/destrova/login/login.ftl

Ön adım: Önce login.ftl.reference dosyasını oku (parent'ın login.ftl kopyası).
Referans dosyadaki <#import, <@layout...>, section tanımlarını gör.

Oluşturulacak dosyanın içeriği:

<#import "template.ftl" as layout>
<@layout.registrationLayout
    displayMessage=!messagesPerField.existsError('username','password')
    displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??
    ; section>

    <#if section = "header">
        <div style="display:flex; flex-direction:column; gap:1rem; padding-bottom:0.5rem;">
            <img
                src="${url.resourcesPath}/img/logo.png"
                alt="Destrova"
                style="height:40px; width:40px; border-radius:10px; object-fit:cover;"
                onerror="this.style.display='none'"
            />
            <div>
                <h1 style="margin:0 0 4px; font-size:1.5rem; font-weight:700;
                           color:#0f172a; font-family:'Inter',sans-serif; line-height:1.2;">
                    Sign in to Destrova
                </h1>
                <p style="margin:0; font-size:0.875rem; color:#475569;
                          font-family:'Inter',sans-serif;">
                    Use your organization account to continue.
                </p>
            </div>
        </div>

    <#elseif section = "form">
        <#-- Form tamamen parent'tan geliyor, burada bir şey yazmıyoruz -->
        <#include "form-fields.ftl" ignore missing>

    <#elseif section = "info">
        <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
            <div id="kc-registration-container">
                <div id="kc-registration">
                    <span>${msg("noAccount")} <a tabindex="6" href="${url.registrationUrl}">${msg("doRegister")}</a></span>
                </div>
            </div>
        </#if>
    </#if>
</@layout.registrationLayout>

---

EĞER YUKARIDAKI YAKLAŞIM 500 HATASI VERİRSE:
login.ftl dosyasını sil ve aşağıdaki minimal sürümü dene:

<#import "template.ftl" as layout>
<@layout.registrationLayout; section>
    <#if section = "header">
        <img
            src="${url.resourcesPath}/img/logo.png"
            alt="Destrova"
            style="height:40px; width:40px; border-radius:10px; object-fit:cover; display:block; margin-bottom:12px;"
        />
        ${"Sign in to Destrova"}
    </#if>
</@layout.registrationLayout>

BU DA HATA VERİRSE:
login.ftl dosyasını tamamen sil. Sadece CSS ile devam et.

---

ÖNEMLİ NOTLAR:
- template.ftl oluşturma — KESINLIKLE YAPMA
- section = "form" bloğunu sıfırdan yazma — YAPMA
- form action URL'ini elle yazma — YAPMA
- CSRF token gibi hidden input'ları elle yazma — YAPMA

KURAL: Sadece login.ftl oluşturulacak. Başka hiçbir dosyaya dokunma.
```

#### FTL Sonrası Test

```bash
docker exec -u root ticket-keycloak cp /opt/keycloak/themes/destrova/login/login.ftl /tmp/login.ftl.backup 2>/dev/null || true
docker restart ticket-keycloak

# 30 saniye bekle
# Login sayfasına git
# 500 hatası görürse:
docker exec -u root ticket-keycloak rm -f /opt/keycloak/themes/destrova/login/login.ftl
docker restart ticket-keycloak
```

---

### AŞAMA 5 — Update Password Ekranı

**Bu ekran execute-actions-email linki tıklanınca açılır.**

Aşama 4 başarılıysa (FTL çalışıyor), update-password için de benzer minimal override yapılır.
Aşama 4 başarısızsa (sadece CSS), update-password ekranı CSS'ten otomatik Destrova stili alır.

#### Cursor Prompt — P17-UPDATE-PASSWORD

```
Görev: login-update-password.ftl dosyasını oluştur.
Sadece header section (logo + başlık). Form tamamen parent'tan.
Bu prompt yalnızca Aşama 4 başarılıysa uygulanır.

Dosya (yeni): keycloak-theme/destrova/login/login-update-password.ftl

İçerik:

<#import "template.ftl" as layout>
<@layout.registrationLayout
    displayMessage=!messagesPerField.existsError('password','password-confirm')
    ; section>

    <#if section = "header">
        <div style="display:flex; flex-direction:column; gap:1rem; padding-bottom:0.5rem;">
            <img
                src="${url.resourcesPath}/img/logo.png"
                alt="Destrova"
                style="height:40px; width:40px; border-radius:10px; object-fit:cover;"
                onerror="this.style.display='none'"
            />
            <div>
                <h1 style="margin:0 0 4px; font-size:1.5rem; font-weight:700;
                           color:#0f172a; font-family:'Inter',sans-serif; line-height:1.2;">
                    Set your password
                </h1>
                <p style="margin:0; font-size:0.875rem; color:#475569;
                          font-family:'Inter',sans-serif;">
                    Choose a strong password for your Destrova account.
                </p>
            </div>
        </div>
    </#if>
</@layout.registrationLayout>

---

HATA VERİRSE: Dosyayı sil. CSS zaten update-password ekranını da stilliyor.

KURAL: Sadece bu dosya oluşturulacak.
```

---

### AŞAMA 6 — Test ve Rollback Hazırlığı

Container'ı restart et:
```bash
docker restart ticket-keycloak
```

Test listesini uygula (Bölüm 7'ye bak).

---

## 5 — Rollback Planı

**Bir şeyler ters giderse bu adımları sırayla uygula.**

### Rollback R1 — FTL Hatasında Anında Müdahale

```bash
# FTL dosyalarını container'dan sil
docker exec -u root ticket-keycloak sh -c "
  rm -f /opt/keycloak/themes/destrova/login/login.ftl
  rm -f /opt/keycloak/themes/destrova/login/template.ftl
  rm -f /opt/keycloak/themes/destrova/login/login-update-password.ftl
"

# Host'ta da .bak yap
cd C:\Users\Enes\Desktop\itsm-ticket-system\keycloak-theme\destrova\login
ren login.ftl login.ftl.bak 2>nul
ren login-update-password.ftl login-update-password.ftl.bak 2>nul

# Restart
docker restart ticket-keycloak
```

### Rollback R2 — Temaya Dön (Keycloak Default)

1. `http://localhost:8081` → ticket-realm → Realm Settings → Themes
2. Login Theme → `keycloak.v2` seç → Save
3. Sayfa yenile

### Rollback R3 — Tam Temizlik

```bash
# Container'ın tema klasörünü temizle
docker exec -u root ticket-keycloak sh -c "
  rm -rf /opt/keycloak/themes/destrova
"

docker restart ticket-keycloak
```

Host dosyaları korun (silme), sadece container içi temizlendi.

**UYARI:** `volume rm` veya `docker-compose down -v` komutları kullanma — postgres verilerini silebilir.

---

## 6 — Uygulama Öncesi Uyarılar

| Uyarı | Açıklama |
|-------|---------|
| **FTL 500 riski** | Herhangi bir FTL syntax hatası Keycloak login sayfasını tamamen kırar. FTL yazıldıktan sonra MUTLAKA hemen test et. |
| **`docker restart ≠ recreate`** | `docker-compose restart` volume mount değişikliklerini uygulamaz. Container'ı `rm` + `up` ile recreate et. |
| **`docker inspect .Mounts []`** | Bu çıktı container'ın eski config ile çalıştığını gösterir. Aşama 1'i uygula. |
| **Browser extension hatası** | Chrome'da "content.js message port closed" hatası browser extension kaynaklıdır, Keycloak ile ilgisi yok. Gerçek hatalar için `docker logs ticket-keycloak` bak. |
| **CSS cache** | CSS değişikliği sonrası Ctrl+Shift+R ile hard refresh yap veya DevTools'da "Disable cache" aç. |
| **Keycloak log'u izle** | Her FTL değişikliğinden sonra: `docker logs ticket-keycloak --tail 30` |
| **Postgres'e dokunma** | `docker-compose down -v` KULLANMA. Sadece `keycloak` servisine müdahale et. |

---

## 7 — Test Checklist

### P16 — React Landing (Korunuyor)
- [ ] `http://localhost:5173/login` açılıyor
- [ ] Sol koyu panel + sağ beyaz kart görünüyor (büyük ekran)
- [ ] Mobil: sol panel gizli, tek kart
- [ ] "Continue to Destrova" butonuna basınca Keycloak'a yönleniyor
- [ ] Loading durumunda spinner görünüyor

### P17 — Keycloak Auth Ekranı
- [ ] Keycloak login sayfası açılıyor (500 yok)
- [ ] Sayfa arka planı slate-50 (#f8fafc)
- [ ] Ortada beyaz kart var
- [ ] Kart: rounded köşeler, hafif gölge
- [ ] Input'lar: rounded-10, focus ring violet
- [ ] Submit butonu: koyu navy (#0F0E47), hover effect
- [ ] Linkler: violet rengi
- [ ] Yanlış şifre → kırmızı hata mesajı, Destrova stili
- [ ] Disabled account → uyarı mesajı görünür
- [ ] "Forgot password?" linki çalışıyor
- [ ] Şifre gönder ekranı Destrova stiliyle görünüyor
- [ ] Logo görünüyor (FTL uygulandıysa)
- [ ] Mobil: padding azalıyor, kart tam ekran

### Giriş Akışı — Uçtan Uca
- [ ] `/login` → "Continue" → Keycloak login ekranı
- [ ] Doğru bilgilerle giriş → role-based redirect
- [ ] Admin → `/admin/overview`
- [ ] Manager → `/manager/dashboard`
- [ ] Agent → `/agent/inbox`
- [ ] Customer → `/customer/tickets`

### Execute-Actions-Email (Yeni Kullanıcı)
- [ ] Admin yeni kullanıcı oluşturur → MailHog'a e-posta gelir
- [ ] E-postadaki link → Keycloak update-password sayfası açılır (500 yok)
- [ ] "Set your password" başlığı görünüyor (FTL uygulandıysa)
- [ ] İki şifre alanı Destrova stiliyle
- [ ] Şifre belirlenince giriş yapılabiliyor

---

## 8 — Commit Planı

```bash
# CSS rewrite (Aşama 2)
git add keycloak-theme/destrova/login/resources/css/login.css
git commit -m "feat(keycloak): rewrite login.css targeting Patternfly 5 classes — P17-CSS"

# FTL logo override (Aşama 4 — başarılıysa)
git add keycloak-theme/destrova/login/login.ftl
git commit -m "feat(keycloak): minimal login.ftl header override — logo and title — P17-FTL"

# Update password (Aşama 5 — başarılıysa)
git add keycloak-theme/destrova/login/login-update-password.ftl
git commit -m "feat(keycloak): login-update-password.ftl minimal header — P17-PWD"

# Final
git add .
git commit -m "feat(keycloak): Destrova theme complete — single card auth design — P17 final"
```

---

## Hızlı Referans — Komut Seti

```bash
# Mount doğrula
docker inspect ticket-keycloak --format "{{json .Mounts}}"

# Container içi dosyaları gör
docker exec ticket-keycloak ls -la /opt/keycloak/themes/destrova/login/

# Log izle
docker logs ticket-keycloak --tail 40 -f

# CSS güncelleme sonrası restart
docker restart ticket-keycloak

# FTL hata verirse anında sil
docker exec -u root ticket-keycloak rm -f /opt/keycloak/themes/destrova/login/login.ftl
docker restart ticket-keycloak

# Parent FTL'i referans için çek
docker exec ticket-keycloak cat /opt/keycloak/themes/keycloak.v2/login/login.ftl

# Container recreate (mount değişikliği sonrası)
docker-compose stop keycloak && docker-compose rm -f keycloak && docker-compose up -d keycloak
```
