# Destrova — Login Deneyimi Master Plan (P16 + P17)
> React Login Landing (P16) + Keycloak Custom Theme (P17)  
> Gerçek kaynak kodu okunarak hazırlandı.  
> Kod yazılmaz — sadece Cursor prompt'ları ve el adımları.

---

## 1 — UX Vizyon Özeti

Kullanıcı bu planın sonunda şu deneyimi yaşar:

**1. React Landing (`/login`):**  
İki sütunlu premium B2B SaaS ekranı açılır. Sol panel koyu navy-violet gradyanı; üstte Destrova logosu, altında özellik listesi, en altta SSO güvenlik notu. Sağ panel beyaz; "Welcome back" başlığı, tek büyük buton ("Continue with Keycloak"), altında 2×2 rol grid'i. Loading durumunda spinner görünür.

**2. Keycloak Login (`http://localhost:8081/...`):**  
Keycloak sayfası artık varsayılan Patternfly değil — Destrova renk paleti, Inter font, aynı logo, koyu navy submit butonu, yumuşatılmış input'lar. Tek sütun merkezi kart, ama React landing ile aynı "dil"i konuşuyor.

**3. Execute-Actions-Email (`update-password` / password setup):**  
Yeni kullanıcı e-postasındaki linke tıkladığında gelen Keycloak sayfası da aynı tema. "Set your password for Destrova" başlığı, iki input (new + confirm), büyük navy submit butonu.

Teknik olarak iki ayrı uygulama ama kullanıcı bunun farkında olmuyor.

---

## 2 — Güvenlik ve Mimari Prensip

### Neden React içinde username/password formu yapılmaz?

React uygulamamız `check-sso` + PKCE S256 flow ile çalışıyor (`keycloak.js`'de görüldü). Bu akışta:

- Kimlik doğrulama **Keycloak authorization endpoint**'inde gerçekleşir
- React uygulaması hiçbir zaman şifre görmez, işlemez, iletmez
- PKCE (Proof Key for Code Exchange) ortadaki adam saldırılarını önler
- `code_verifier` / `code_challenge` çifti her login'de benzersiz üretilir

React'ta kullanıcı adı/şifre formu yapsaydık:
- XSS saldırısına maruz kalınabilirdi (credential harvesting)
- PKCE'nin güvenlik garantileri bozulurdu
- OAuth 2.0 / OIDC standartları ihlal edilirdi
- Keycloak tarafındaki brute-force koruması, 2FA, account lockout özellikleri devre dışı kalırdı

### Neden Keycloak login ekranı ayrı kalmalı?

Keycloak'ın login sayfası şunları yapar:
- Session cookie'yi `localhost:8081` domain'inde yönetir
- CSRF token üretir ve doğrular  
- Brute-force detection uygular
- "Forgot Password", account lockout, OTP challenge akışlarını yönetir

Bunların hepsi Keycloak'ın kendi domain'inde, kendi güvenlik bağlamında çalışmalıdır.

### Neden çözüm "React landing + Keycloak custom theme" olmalı?

```
Kullanıcı görüşü:    "Tek bir güzel uygulama"
Teknik gerçek:       İki ayrı güvenlik katmanı
Çözüm:              Görsel dil senkronizasyonu
```

React landing → marka deneyimi, yönlendirme
Keycloak theme → kimlik doğrulamanın güvenli tamamlanması  
Aynı renkler + font + logo → kesintisiz his

---

## 3 — Renk ve Branding Senkronizasyonu

### Ana Palet

| Değişken | Hex | Kullanım |
|----------|-----|---------|
| `--d-navy` | `#0F0E47` | Sol panel arka plan, CTA buton |
| `--d-navy-deep` | `#1a1960` | Gradient bitis, hover state |
| `--d-violet` | `#6d28d9` | Accent, focus ring, link hover |
| `--d-violet-light` | `#7c3aed` | Hover gradient vurgu |
| `--d-bg` | `#f8fafc` | Sayfa arka planı (slate-50) |
| `--d-white` | `#ffffff` | Kart arka planı |
| `--d-text-primary` | `#0f172a` | Başlıklar |
| `--d-text-secondary` | `#475569` | Açıklamalar |
| `--d-text-muted` | `#94a3b8` | Placeholder, alt metin |
| `--d-border` | `#e2e8f0` | Input kenarlığı |
| `--d-border-focus` | `#6d28d9` | Input focus ring |
| `--d-error` | `#ef4444` | Hata mesajları |
| `--d-error-bg` | `#fef2f2` | Hata arka planı |
| `--d-success` | `#059669` | Başarı mesajları |

### Tipografi

```
Font: Inter (Google Fonts)
Import: https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap

Başlık (h1/main):   700-800 / 1.15 line-height
Alt başlık:         500 / 1.4
Body:               400 / 1.5
Label:              600 / 1
Caption:            400 / 1.4 — text-muted
```

### Spacing ve Shape

```
Border radius:
  Kart/panel:   16px (1rem)
  Buton:        12px (0.75rem)
  Input:        10px (0.625rem)
  Badge/chip:   999px

Shadow:
  Kart:    0 20px 60px rgba(15,14,71,0.10)
  Buton:   0 4px 14px rgba(15,14,71,0.30)
  Input fokus ring: 0 0 0 3px rgba(109,40,217,0.18)

Buton:
  Yükseklik: 48px (3rem)
  Padding:   0 24px
  Büyük:     font-size 15px, font-weight 600
```

### Sol Panel Gradient

```css
background: linear-gradient(145deg, #0F0E47 0%, #1a1960 60%, #2d2a7a 100%);
```

### Her İki Ekranda Ortak Unsurlar

| Unsur | React Landing | Keycloak Theme |
|-------|--------------|----------------|
| Logo | `/Destrova_logo.png` | `resources/img/logo.png` (aynı dosya) |
| Arka plan rengi | `#f8fafc` | `#f8fafc` |
| Submit/CTA butonu | `#0F0E47` → hover `#1a1960` | Aynı |
| Input odak rengi | `#6d28d9` | Aynı |
| Font | Tailwind sistem fontları | Inter (Google Fonts) |
| Başlık ağırlığı | 700-800 | 700-800 |

---

## 4 — P16: React LoginPage.jsx

### Mevcut Durum (Koddan Okundu)

```jsx
// LoginPage.jsx — mevcut durum:
// - center-auth, card auth-card, btn btn-primary → App.css'deki eski class'lar
// - useKeycloak() hook'u: { authenticated, loading, login, hasRole }
// - useEffect → authenticated'a göre role-based redirect (doğru, korunacak)
// - login() fonksiyonu → keycloak.login({ scope }) çağrısını tetikliyor
// SORUN: Hiçbir Destrova design token'ı kullanılmıyor
```

### Değiştirilecek Tek Dosya

`frontend/src/pages/auth/LoginPage.jsx` — TAM YENİDEN YAZIM

### Korunacak Mantık (değişmeyecek)

```jsx
const { authenticated, loading, login, hasRole } = useKeycloak(); // ← aynı
useEffect(() => {                                                   // ← aynı
  if (authenticated) {
    if (hasRole("ADMIN"))   navigate("/admin/overview",   { replace: true });
    else if (hasRole("MANAGER")) navigate("/manager/dashboard", { replace: true });
    else if (hasRole("AGENT"))   navigate("/agent/inbox",      { replace: true });
    else                         navigate("/customer/tickets",  { replace: true });
  }
}, [authenticated, hasRole, navigate]);
```

### Dokunulmayacak Dosyalar

- `keycloak.js` — DOKUNMA
- `KeycloakContext.jsx` — DOKUNMA
- `App.css` — DOKUNMA (sadece LoginPage.jsx artık bu class'ları kullanmayacak)
- `app/router.jsx` — DOKUNMA
- `main.jsx` — DOKUNMA

---

### Cursor Prompt — P16

```
Görev: LoginPage.jsx dosyasını tamamen yeniden yaz.
Sadece bu dosya değişecek. Başka hiçbir dosyaya dokunma.

Dosya: frontend/src/pages/auth/LoginPage.jsx

---

KORUNACAK MANTIK — Silme, taşıma, değiştirme:
  1. import { useKeycloak } from "../../context/KeycloakContext";
  2. import { useNavigate } from "react-router-dom";
  3. const { authenticated, loading, login, hasRole } = useKeycloak();
  4. Şu useEffect bloğu aynen kalacak:
       useEffect(() => {
         if (authenticated) {
           if (hasRole("ADMIN")) navigate("/admin/overview", { replace: true });
           else if (hasRole("MANAGER")) navigate("/manager/dashboard", { replace: true });
           else if (hasRole("AGENT")) navigate("/agent/inbox", { replace: true });
           else navigate("/customer/tickets", { replace: true });
         }
       }, [authenticated, hasRole, navigate]);

---

YENİ TASARIM GEREKSİNİMLERİ:

Logo:
  const logoSrc = "/Destrova_logo.png";
  (public klasöründe mevcut, import gerekmez)

Renkler (Tailwind class kullanılacak, CSS custom property değil):
  Koyu panel: bg-[#0F0E47]
  Gradient: bg-gradient-to-br from-[#0F0E47] to-[#1a1960]
  Accent violet: violet-700 (#6d28d9)
  Input focus: ring-violet-600

---

LAYOUT (iki katman: loading + normal):

LOADING DURUMU — loading=true iken render:
  <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div
        className="h-10 w-10 rounded-full border-[3px] border-slate-200 border-t-violet-700 animate-spin"
      />
      <p className="text-sm font-medium text-slate-500 tracking-wide">
        Checking your session…
      </p>
    </div>
  </div>

NORMAL DURUM — loading=false, authenticated=false:
  <div className="min-h-screen w-full flex">

    {/* SOL PANEL — büyük ekranda görünür, mobilde gizli */}
    <div className="hidden lg:flex lg:w-[52%] bg-gradient-to-br from-[#0F0E47] to-[#1a1960]
                    flex-col justify-between px-14 py-12">

      {/* Logo + İsim */}
      <div>
        <div className="flex items-center gap-3 mb-16">
          <img
            src={logoSrc}
            alt="Destrova"
            className="h-11 w-11 rounded-xl object-cover shadow-lg"
          />
          <span className="text-white text-2xl font-bold tracking-tight">
            Destrova
          </span>
        </div>

        {/* Başlık */}
        <h1 className="text-white text-[2.4rem] font-extrabold leading-[1.12] mb-4 max-w-md">
          IT Service Management,<br />Redefined.
        </h1>
        <p className="text-white/60 text-base leading-relaxed mb-12 max-w-sm">
          SLA-driven ticketing with intelligent routing,
          real-time monitoring and enterprise-grade access control.
        </p>

        {/* Özellik listesi */}
        <ul className="space-y-5">
          {[
            { icon: "⚡", label: "Smart SLA monitoring",
              sub: "Real-time breach detection and automated alerts" },
            { icon: "🎯", label: "Product-based team routing",
              sub: "Tickets auto-assigned to the right specialist team" },
            { icon: "🔄", label: "Full lifecycle tracking",
              sub: "From first request to resolution and closure" },
          ].map((f) => (
            <li key={f.label} className="flex items-start gap-3.5">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center
                              rounded-lg bg-white/10 text-base">
                {f.icon}
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-snug">{f.label}</p>
                <p className="text-white/50 text-xs leading-relaxed mt-0.5">{f.sub}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Alt güvenlik notu */}
      <div className="flex items-center gap-2 mt-12">
        <svg xmlns="http://www.w3.org/2000/svg"
             viewBox="0 0 20 20" fill="currentColor"
             className="h-4 w-4 text-white/30 shrink-0">
          <path fillRule="evenodd"
            d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10
               a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5
               a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd"/>
        </svg>
        <span className="text-white/30 text-[11px] tracking-wide">
          Enterprise SSO · PKCE S256 · OAuth 2.0 / OIDC
        </span>
      </div>
    </div>

    {/* SAĞ PANEL — login action */}
    <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-[400px]">

        {/* Mobil logo (sadece lg altında görünür) */}
        <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
          <img src={logoSrc} alt="Destrova"
               className="h-10 w-10 rounded-xl object-cover shadow" />
          <span className="text-slate-900 text-xl font-bold">Destrova</span>
        </div>

        {/* Başlık */}
        <div className="mb-8">
          <h2 className="text-slate-900 text-2xl font-bold mb-1">
            Welcome back
          </h2>
          <p className="text-slate-500 text-sm">
            Sign in to your workspace to continue.
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-[11px] text-slate-400 font-semibold tracking-widest uppercase">
            Organization SSO
          </span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Keycloak Login Butonu */}
        <button
          type="button"
          onClick={login}
          className="w-full flex items-center justify-center gap-3 h-12 rounded-xl
                     bg-[#0F0E47] text-white text-[15px] font-semibold
                     shadow-[0_4px_14px_rgba(15,14,71,0.35)]
                     transition-all duration-200
                     hover:bg-[#1a1960] hover:shadow-[0_6px_20px_rgba(15,14,71,0.45)]
                     active:scale-[0.98]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current opacity-80"
               xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2
                     12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
          </svg>
          Continue with Keycloak
        </button>

        <p className="mt-3 text-center text-[11px] text-slate-400 leading-relaxed">
          You'll be redirected to your organization's<br />
          identity provider to complete sign‑in.
        </p>

        {/* Rol açıklama grid */}
        <div className="mt-8 grid grid-cols-2 gap-2.5">
          {[
            { role: "Customers",  desc: "Submit & track requests" },
            { role: "Agents",     desc: "Resolve & manage tickets" },
            { role: "Managers",   desc: "Monitor SLAs & teams" },
            { role: "Admins",     desc: "Configure the platform" },
          ].map((r) => (
            <div key={r.role}
                 className="rounded-xl border border-slate-100 bg-white
                            px-3 py-2.5 shadow-sm">
              <p className="text-[11.5px] font-semibold text-slate-700">{r.role}</p>
              <p className="text-[10.5px] text-slate-400 mt-0.5 leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="mt-10 text-center text-[10px] text-slate-300">
          © {new Date().getFullYear()} Destrova ITSM. All rights reserved.
        </p>
      </div>
    </div>

  </div>

---

YASAK:
  - username / password input ekleme
  - form submit handler ekleme
  - KeycloakContext'i değiştirme
  - App.css'i değiştirme
  - router.jsx'i değiştirme
  - keycloak.js'i değiştirme

KURAL: Sadece LoginPage.jsx değişecek.
```

### Commit — P16

```bash
git add frontend/src/pages/auth/LoginPage.jsx
git commit -m "feat(frontend): redesigned login landing — split layout, Destrova premium B2B branding — P16"
```

---

## 5 — P17: Keycloak Custom Theme — Mimari

### Dosya Yapısı (Sıfırdan Oluşturulacak)

```
itsm-ticket-system/
└── keycloak-theme/
    └── destrova/
        └── login/
            ├── theme.properties
            ├── login.ftl
            ├── login-update-password.ftl
            └── resources/
                ├── css/
                │   └── login.css
                └── img/
                    └── logo.png          ← frontend/public/Destrova_logo.png kopyası
```

### Strateji

- **`parent=keycloak`** ile Keycloak'ın temel şablon mekanizmasını miras alıyoruz
- **FTL template'ler**: Minimal override — logo ve başlık ekliyoruz, Keycloak'ın form mekaniklerine dokunmuyoruz (CSRF, action URL, error handling)
- **CSS**: Kapsamlı override — tüm Patternfly değişkenlerini ve Keycloak class'larını ezerek Destrova paletini uyguluyoruz
- **Güvenlik**: Form action URL, CSRF token, error mesajları → tamamen Keycloak'ta

---

## 6 — P17: Cursor Prompt'ları

### Prompt KC-T1 — theme.properties

```
Görev: Keycloak tema ana konfigürasyon dosyasını oluştur.

Dosya (yeni): keycloak-theme/destrova/login/theme.properties

İçerik (aynen):
parent=keycloak
import=common/keycloak

styles=css/login.css

locales=en,tr

kcLogoLink=http://localhost:5173/login
kcLogoClass=destrova-logo

KURAL: Sadece bu dosya oluşturulacak.
```

---

### Prompt KC-T2 — login.css (Kapsamlı Tasarım Override)

```
Görev: Keycloak login tema CSS dosyasını oluştur.
Destrova renk sistemini Keycloak'ın tüm bileşenlerine uygulayacak.

Dosya (yeni): keycloak-theme/destrova/login/resources/css/login.css

İçeriği:

/* ============================================================
   DESTROVA KEYCLOAK THEME — login.css
   Palette: Navy #0F0E47 | Violet #6d28d9 | Slate tones
   ============================================================ */

/* Google Fonts — Inter */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* ── Global reset ── */
*, *::before, *::after { box-sizing: border-box; }

/* ── CSS Variables ── */
:root {
  --d-navy:           #0F0E47;
  --d-navy-deep:      #1a1960;
  --d-violet:         #6d28d9;
  --d-violet-hover:   #5b21b6;
  --d-bg:             #f8fafc;
  --d-white:          #ffffff;
  --d-text-primary:   #0f172a;
  --d-text-secondary: #475569;
  --d-text-muted:     #94a3b8;
  --d-border:         #e2e8f0;
  --d-border-focus:   #6d28d9;
  --d-error:          #ef4444;
  --d-error-bg:       #fef2f2;
  --d-error-border:   #fecaca;
  --d-shadow-card:    0 20px 60px rgba(15,14,71,0.10);
  --d-shadow-btn:     0 4px 14px rgba(15,14,71,0.30);
  --d-radius-card:    16px;
  --d-radius-btn:     12px;
  --d-radius-input:   10px;
}

/* ── Body / Page ── */
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
  background-color: var(--d-bg) !important;
  color: var(--d-text-primary) !important;
  min-height: 100vh;
  margin: 0;
  padding: 0;
}

/* ── Outer containers ── */
.pf-v5-c-login,
.pf-c-login,
#kc-container {
  background-color: var(--d-bg) !important;
  min-height: 100vh !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 2rem 1rem !important;
}

/* ── Main card ── */
.pf-v5-c-login__main,
.pf-c-login__main,
#kc-content,
#kc-content-wrapper {
  background: var(--d-white) !important;
  border-radius: var(--d-radius-card) !important;
  box-shadow: var(--d-shadow-card) !important;
  border: 1px solid var(--d-border) !important;
  width: 100% !important;
  max-width: 420px !important;
  padding: 0 !important;
  overflow: hidden !important;
}

/* ── Header area (logo + title) ── */
.pf-v5-c-login__main-header,
.pf-c-login__main-header,
#kc-header,
#kc-header-wrapper {
  background: var(--d-navy) !important;
  padding: 2rem 2rem 1.75rem !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  gap: 1rem !important;
}

/* ── Logo (img tag) ── */
.destrova-header-logo {
  width: 44px !important;
  height: 44px !important;
  border-radius: 10px !important;
  object-fit: cover !important;
  display: block !important;
}

/* ── Header title / subtitle ── */
.pf-v5-c-login__main-header-title,
.pf-c-login__main-header-title,
#kc-header h1,
.destrova-header-title {
  color: #ffffff !important;
  font-size: 1.4rem !important;
  font-weight: 700 !important;
  line-height: 1.2 !important;
  margin: 0 !important;
}

.destrova-header-subtitle {
  color: rgba(255,255,255,0.55) !important;
  font-size: 0.8125rem !important;
  font-weight: 400 !important;
  margin: 0 !important;
  line-height: 1.5 !important;
}

/* ── Form body ── */
.pf-v5-c-login__main-body,
.pf-c-login__main-body,
#kc-form,
#kc-form-wrapper {
  padding: 1.75rem 2rem !important;
  background: var(--d-white) !important;
}

/* ── Form groups / labels ── */
.pf-v5-c-form__group,
.pf-c-form__group,
.kcFormGroupClass {
  margin-bottom: 1rem !important;
}

.pf-v5-c-form__label,
.pf-c-form__label,
.kcLabelClass,
label {
  display: block !important;
  font-size: 0.8125rem !important;
  font-weight: 600 !important;
  color: var(--d-text-secondary) !important;
  margin-bottom: 0.375rem !important;
}

/* ── Inputs ── */
.pf-v5-c-form-control,
.pf-c-form-control,
.kcInputClass,
input[type="text"],
input[type="email"],
input[type="password"],
input[type="username"] {
  width: 100% !important;
  height: 44px !important;
  padding: 0 0.875rem !important;
  border: 1.5px solid var(--d-border) !important;
  border-radius: var(--d-radius-input) !important;
  background: #fafbfc !important;
  color: var(--d-text-primary) !important;
  font-family: inherit !important;
  font-size: 0.9375rem !important;
  font-weight: 400 !important;
  transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
  box-shadow: none !important;
  outline: none !important;
}

input[type="text"]:focus,
input[type="email"]:focus,
input[type="password"]:focus,
.pf-v5-c-form-control:focus,
.pf-c-form-control:focus,
.kcInputClass:focus {
  border-color: var(--d-border-focus) !important;
  box-shadow: 0 0 0 3px rgba(109,40,217,0.15) !important;
  background: var(--d-white) !important;
}

/* ── Password toggle button ── */
.pf-v5-c-input-group__item button,
.pf-c-input-group__item button {
  background: transparent !important;
  border: 1.5px solid var(--d-border) !important;
  border-left: none !important;
  border-radius: 0 var(--d-radius-input) var(--d-radius-input) 0 !important;
  color: var(--d-text-muted) !important;
  height: 44px !important;
  padding: 0 0.75rem !important;
  cursor: pointer !important;
  transition: color 0.15s ease !important;
}

.pf-v5-c-input-group__item button:hover,
.pf-c-input-group__item button:hover {
  color: var(--d-violet) !important;
}

/* ── Input group (password + toggle wrapper) ── */
.pf-v5-c-input-group,
.pf-c-input-group {
  display: flex !important;
}

.pf-v5-c-input-group .pf-v5-c-form-control,
.pf-c-input-group .pf-c-form-control {
  border-radius: var(--d-radius-input) 0 0 var(--d-radius-input) !important;
}

/* ── Submit button ── */
.pf-v5-c-button.pf-m-primary,
.pf-c-button.pf-m-primary,
input[type="submit"],
#kc-login,
.kcButtonPrimaryClass {
  width: 100% !important;
  height: 48px !important;
  background: var(--d-navy) !important;
  color: #ffffff !important;
  border: none !important;
  border-radius: var(--d-radius-btn) !important;
  font-family: inherit !important;
  font-size: 0.9375rem !important;
  font-weight: 600 !important;
  letter-spacing: 0.01em !important;
  cursor: pointer !important;
  box-shadow: var(--d-shadow-btn) !important;
  transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease !important;
  margin-top: 0.5rem !important;
}

.pf-v5-c-button.pf-m-primary:hover,
.pf-c-button.pf-m-primary:hover,
input[type="submit"]:hover,
#kc-login:hover {
  background: var(--d-navy-deep) !important;
  box-shadow: 0 6px 20px rgba(15,14,71,0.40) !important;
  transform: translateY(-1px) !important;
}

.pf-v5-c-button.pf-m-primary:active,
input[type="submit"]:active {
  transform: translateY(0) !important;
}

/* ── Secondary / ghost button ── */
.pf-v5-c-button.pf-m-secondary,
.pf-c-button.pf-m-secondary,
.kcButtonDefaultClass {
  background: transparent !important;
  color: var(--d-text-secondary) !important;
  border: 1.5px solid var(--d-border) !important;
  border-radius: var(--d-radius-btn) !important;
  font-family: inherit !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: background 0.15s ease, color 0.15s ease !important;
}

.pf-v5-c-button.pf-m-secondary:hover {
  background: var(--d-bg) !important;
  color: var(--d-text-primary) !important;
}

/* ── Form options (remember me, forgot password) ── */
.pf-v5-c-login__main-body .pf-v5-c-form__group:has(#rememberMe),
#kc-form-options {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  margin-bottom: 1.25rem !important;
}

#kc-form-options a,
.pf-v5-c-login__main-body a {
  color: var(--d-violet) !important;
  font-size: 0.8125rem !important;
  font-weight: 500 !important;
  text-decoration: none !important;
  transition: color 0.15s ease !important;
}

#kc-form-options a:hover,
.pf-v5-c-login__main-body a:hover {
  color: var(--d-violet-hover) !important;
  text-decoration: underline !important;
}

/* ── Checkbox ── */
input[type="checkbox"] {
  accent-color: var(--d-violet) !important;
  width: 14px !important;
  height: 14px !important;
}

/* ── Alert / Error messages ── */
.pf-v5-c-alert,
.pf-c-alert,
.alert,
.alert-error,
#input-error,
.kcFeedbackErrorIcon {
  background: var(--d-error-bg) !important;
  border: 1px solid var(--d-error-border) !important;
  border-radius: 8px !important;
  padding: 0.625rem 0.875rem !important;
  margin-bottom: 1rem !important;
  font-size: 0.8125rem !important;
  color: #991b1b !important;
  font-weight: 500 !important;
}

.pf-v5-c-alert.pf-m-success,
.alert-success {
  background: #ecfdf5 !important;
  border-color: #a7f3d0 !important;
  color: #065f46 !important;
}

.pf-v5-c-alert.pf-m-warning,
.alert-warning {
  background: #fffbeb !important;
  border-color: #fde68a !important;
  color: #92400e !important;
}

/* ── Input error state ── */
.pf-v5-c-form-control.pf-m-error,
input.error,
input[aria-invalid="true"] {
  border-color: var(--d-error) !important;
  box-shadow: 0 0 0 2px rgba(239,68,68,0.15) !important;
}

/* ── Footer links (info section) ── */
.pf-v5-c-login__main-footer,
.pf-c-login__main-footer,
#kc-info,
.kc-login-info {
  padding: 1.25rem 2rem 1.75rem !important;
  border-top: 1px solid var(--d-border) !important;
  text-align: center !important;
  font-size: 0.8125rem !important;
  color: var(--d-text-muted) !important;
}

/* ── Page/outer header (realm name displayed by Keycloak) ── */
.pf-v5-c-login__header,
.pf-c-login__header,
#kc-page-title,
header.pf-v5-c-masthead {
  display: none !important;
}

/* ── Responsive ── */
@media (max-width: 480px) {
  .pf-v5-c-login__main,
  .pf-c-login__main,
  #kc-content {
    max-width: 100% !important;
    border-radius: 0 !important;
    border: none !important;
    min-height: 100vh !important;
  }

  .pf-v5-c-login,
  .pf-c-login {
    padding: 0 !important;
    align-items: flex-start !important;
  }
}

KURAL: Sadece bu dosya oluşturulacak.
```

---

### Prompt KC-T3 — login.ftl

```
Görev: Keycloak login.ftl dosyasını oluştur.
Sadece header section'ını özelleştiriyoruz — logo, başlık, alt başlık.
Form mekaniklerini (action URL, CSRF, input name'leri) KESINLIKLE değiştirmiyoruz.
Keycloak'ın temel template.ftl'ini extend ediyoruz.

Dosya (yeni): keycloak-theme/destrova/login/login.ftl

İçeriği:

<#import "template.ftl" as layout>
<@layout.registrationLayout
    displayMessage=!messagesPerField.existsError('username','password')
    displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??
    ; section>

    <#if section = "header">
        <div class="destrova-header-content">
            <img
                src="${url.resourcesPath}/img/logo.png"
                alt="Destrova"
                class="destrova-header-logo"
                onerror="this.style.display='none'"
            />
            <div>
                <h1 class="destrova-header-title">Welcome back</h1>
                <p class="destrova-header-subtitle">Sign in to your Destrova workspace</p>
            </div>
        </div>

    <#elseif section = "form">
        <div id="kc-form">
            <div id="kc-form-wrapper">
                <#if realm.password>
                    <form id="kc-form-login"
                          onsubmit="login.disabled = true; return true;"
                          action="${url.loginAction}"
                          method="post">

                        <#if !usernameHidden??>
                            <div class="${properties.kcFormGroupClass!}">
                                <label for="username" class="${properties.kcLabelClass!}">
                                    <#if !realm.loginWithEmailAllowed>
                                        ${msg("username")}
                                    <#elseif !realm.registrationEmailAsUsername>
                                        ${msg("usernameOrEmail")}
                                    <#else>
                                        ${msg("email")}
                                    </#if>
                                </label>
                                <input
                                    tabindex="1"
                                    id="username"
                                    class="${properties.kcInputClass!}"
                                    name="username"
                                    value="${(login.username!'')?xml}"
                                    type="text"
                                    autofocus
                                    autocomplete="username"
                                    placeholder="${msg('email')}"
                                    aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"
                                />
                                <#if messagesPerField.existsError('username','password')>
                                    <span id="input-error" class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                                        ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
                                    </span>
                                </#if>
                            </div>
                        </#if>

                        <#if realm.password>
                            <div class="${properties.kcFormGroupClass!}">
                                <label for="password" class="${properties.kcLabelClass!}">
                                    ${msg("password")}
                                </label>
                                <div class="${properties.kcInputGroup!}">
                                    <input
                                        tabindex="2"
                                        id="password"
                                        class="${properties.kcInputClass!}"
                                        name="password"
                                        type="password"
                                        autocomplete="current-password"
                                        placeholder="••••••••"
                                        aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"
                                    />
                                    <#if passwordHidden??>
                                        <button
                                            class="${properties.kcFormPasswordVisibilityButtonClass!}"
                                            type="button"
                                            aria-label="${msg('showPassword')}"
                                            aria-controls="password"
                                            tabindex="3"
                                            data-password-toggle
                                            data-icon-show="${properties.kcFormPasswordVisibilityIconShow!}"
                                            data-icon-hide="${properties.kcFormPasswordVisibilityIconHide!}"
                                            data-label-show="${msg('showPassword')}"
                                            data-label-hide="${msg('hidePassword')}"
                                        >
                                            <i class="${properties.kcFormPasswordVisibilityIconShow!}" aria-hidden="true"></i>
                                        </button>
                                    </#if>
                                </div>
                            </div>
                        </#if>

                        <div class="${properties.kcFormGroupClass!} ${properties.kcFormSettingClass!}">
                            <div id="kc-form-options">
                                <#if realm.rememberMe && !usernameHidden??>
                                    <div class="checkbox">
                                        <label>
                                            <input
                                                tabindex="5"
                                                id="rememberMe"
                                                name="rememberMe"
                                                type="checkbox"
                                                <#if login.rememberMe??>checked</#if>
                                            />
                                            ${msg("rememberMe")}
                                        </label>
                                    </div>
                                </#if>
                                <#if realm.resetPasswordAllowed>
                                    <a tabindex="6" href="${url.loginResetCredentialsUrl}">
                                        ${msg("doForgotPassword")}
                                    </a>
                                </#if>
                            </div>
                        </div>

                        <div id="kc-form-buttons" class="${properties.kcFormGroupClass!}">
                            <input
                                tabindex="7"
                                class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}"
                                name="login"
                                id="kc-login"
                                type="submit"
                                value="${msg('doLogIn')}"
                            />
                        </div>
                    </form>
                </#if>
            </div>
        </div>

    <#elseif section = "info">
        <div id="kc-registration-container">
            <div id="kc-registration">
                <span>${msg("noAccount")} <a tabindex="8" href="${url.registrationUrl}">${msg("doRegister")}</a></span>
            </div>
        </div>
    </#if>
</@layout.registrationLayout>

KURAL: Sadece bu dosya oluşturulacak.
```

---

### Prompt KC-T4 — login-update-password.ftl

```
Görev: Şifre belirleme (execute-actions-email) ekranı için Keycloak template'i oluştur.
Bu ekran yeni kullanıcıların e-postasındaki linke tıkladığında açılır.

Dosya (yeni): keycloak-theme/destrova/login/login-update-password.ftl

İçeriği:

<#import "template.ftl" as layout>
<@layout.registrationLayout
    displayMessage=!messagesPerField.existsError('password','password-confirm')
    ; section>

    <#if section = "header">
        <div class="destrova-header-content">
            <img
                src="${url.resourcesPath}/img/logo.png"
                alt="Destrova"
                class="destrova-header-logo"
                onerror="this.style.display='none'"
            />
            <div>
                <h1 class="destrova-header-title">Set your password</h1>
                <p class="destrova-header-subtitle">Choose a strong password for your Destrova account</p>
            </div>
        </div>

    <#elseif section = "form">
        <form id="kc-passwd-update-form"
              class="${properties.kcFormClass!}"
              action="${url.loginAction}"
              method="post">

            <input type="text"
                   id="username"
                   name="username"
                   value="${username}"
                   autocomplete="username"
                   readonly
                   style="display:none" />

            <div class="${properties.kcFormGroupClass!}">
                <label for="password-new" class="${properties.kcLabelClass!}">
                    ${msg("passwordNew")}
                </label>
                <div class="${properties.kcInputGroup!}">
                    <input
                        type="password"
                        id="password-new"
                        name="password-new"
                        class="${properties.kcInputClass!}"
                        autofocus
                        autocomplete="new-password"
                        placeholder="At least 8 characters"
                        aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>"
                    />
                </div>
                <#if messagesPerField.existsError('password')>
                    <span class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                        ${kcSanitize(messagesPerField.getFirstError('password'))?no_esc}
                    </span>
                </#if>
            </div>

            <div class="${properties.kcFormGroupClass!}">
                <label for="password-confirm" class="${properties.kcLabelClass!}">
                    ${msg("passwordConfirm")}
                </label>
                <div class="${properties.kcInputGroup!}">
                    <input
                        type="password"
                        id="password-confirm"
                        name="password-confirm"
                        class="${properties.kcInputClass!}"
                        autocomplete="new-password"
                        placeholder="Repeat your password"
                        aria-invalid="<#if messagesPerField.existsError('password-confirm')>true</#if>"
                    />
                </div>
                <#if messagesPerField.existsError('password-confirm')>
                    <span class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                        ${kcSanitize(messagesPerField.getFirstError('password-confirm'))?no_esc}
                    </span>
                </#if>
            </div>

            <div class="${properties.kcFormGroupClass!}">
                <div id="kc-form-buttons" class="${properties.kcFormButtonsClass!}">
                    <#if isAppInitiatedAction??>
                        <input
                            class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonLargeClass!}"
                            type="submit"
                            value="${msg('doSubmit')}"
                        />
                        <button
                            class="${properties.kcButtonClass!} ${properties.kcButtonDefaultClass!} ${properties.kcButtonLargeClass!}"
                            type="submit"
                            name="cancel-aia"
                            value="true">
                            ${msg('doCancel')}
                        </button>
                    <#else>
                        <input
                            class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}"
                            type="submit"
                            value="${msg('doSubmit')}"
                        />
                    </#if>
                </div>
            </div>
        </form>
    </#if>
</@layout.registrationLayout>

KURAL: Sadece bu dosya oluşturulacak.
```

---

### Prompt KC-T5 — Logo Kopyalama

```
Görev: Logo dosyasını Keycloak tema klasörüne kopyala.

Kaynak: frontend/public/Destrova_logo.png
Hedef:  keycloak-theme/destrova/login/resources/img/logo.png

Adımlar:
  1. keycloak-theme/destrova/login/resources/img/ klasörünü oluştur
  2. frontend/public/Destrova_logo.png dosyasını
     keycloak-theme/destrova/login/resources/img/logo.png olarak kopyala

NOT: Bu bir dosya kopyalama işlemi. Kaynak dosyayı silme veya değiştirme.
```

---

## 7 — Docker ve Keycloak Uygulama Adımları

### Adım D-1: docker-compose.yml — Theme Mount + Cache Disable

#### Cursor Prompt

```
Görev: docker-compose.yml'de keycloak servisini güncelle.

Dosya: docker-compose.yml

keycloak: servisinin environment bölümüne şu 3 satırı ekle:
  KC_SPI_THEME_STATIC_MAX_AGE: "-1"
  KC_SPI_THEME_CACHE_THEMES: "false"
  KC_SPI_THEME_CACHE_TEMPLATES: "false"

Aynı keycloak servisine volumes bölümü ekle (yoksa yeni ekle, varsa altına ekle):
  volumes:
    - ./keycloak-theme/destrova:/opt/keycloak/themes/destrova

Sonuç olarak keycloak servisinin ilgili bölümü şöyle görünmeli:
  keycloak:
    image: quay.io/keycloak/keycloak:latest
    container_name: ticket-keycloak
    command: start-dev
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres-db:5432/ticket_db
      KC_DB_USERNAME: ticket_user
      KC_DB_PASSWORD: ticket_password
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
      KC_SPI_THEME_STATIC_MAX_AGE: "-1"        ← YENİ
      KC_SPI_THEME_CACHE_THEMES: "false"       ← YENİ
      KC_SPI_THEME_CACHE_TEMPLATES: "false"    ← YENİ
    volumes:                                   ← YENİ
      - ./keycloak-theme/destrova:/opt/keycloak/themes/destrova
    ports:
      - "8081:8080"
    depends_on:
      - postgres-db

KURAL: Sadece keycloak servisi değişecek. Diğer servislere dokunma.
```

### Adım D-2: Keycloak Container Restart

```bash
docker-compose stop keycloak
docker-compose up -d keycloak

# Log'u izle — tema yüklenme hatası var mı?
docker logs ticket-keycloak --tail 40 -f
# "Theme 'destrova' loaded" veya hata yoksa devam
```

### Adım D-3: Keycloak Admin'de Tema Seçimi (El Adımı)

1. `http://localhost:8081` → admin / admin
2. Sol üst → **ticket-realm** seç
3. Sol menü → **Realm settings**
4. Üstteki **Themes** sekmesi
5. **Login theme** → dropdown'dan **destrova** seç
6. **Save** butonuna tıkla

### Adım D-4: Tema Önbelleğini Temizle (Gerekirse)

CSS değişikliği sonrası browser cache'i temizle:

```
Chrome: Ctrl+Shift+R (hard refresh)
veya: DevTools → Network → "Disable cache" işaretle → Refresh
```

Keycloak container'ı restart etmek de template cache'i temizler:
```bash
docker restart ticket-keycloak
```

### Adım D-5: Test URL'leri

| Ekran | URL |
|-------|-----|
| React Login Landing | `http://localhost:5173/login` |
| Keycloak Login (direkt) | `http://localhost:8081/realms/ticket-realm/account` |
| Keycloak Login (PKCE flow) | React'taki "Continue with Keycloak" butonuna bas |
| Keycloak Login (admin test) | `http://localhost:8081/realms/ticket-realm/account` (logout yap, giriş dene) |
| Password Setup (email link) | MailHog `http://localhost:8025` → e-postadaki link |

---

## 8 — Test Checklist

### P16 — React Login Landing

- [ ] `http://localhost:5173/login` açılıyor
- [ ] Büyük ekranda (≥1024px): sol koyu panel + sağ beyaz panel görünüyor
- [ ] Sol panel: Destrova logosu + başlık + 3 özellik + SSO notu görünüyor
- [ ] Sağ panel: "Welcome back" başlığı + "Continue with Keycloak" butonu
- [ ] Buton tıklanınca Keycloak sayfasına yönleniyor
- [ ] Mobil (≤640px): sol panel gizli, sağ panel tam ekran
- [ ] Mobilde logo sağ panelde görünüyor
- [ ] Loading durumunda spinner gösteriliyor
- [ ] Admin hesabıyla giriş → `/admin/overview`'a redirect
- [ ] Manager hesabıyla giriş → `/manager/dashboard`'a redirect
- [ ] Agent hesabıyla giriş → `/agent/inbox`'a redirect
- [ ] Customer hesabıyla giriş → `/customer/tickets`'a redirect
- [ ] Zaten giriş yapılmışken `/login`'e gidince anında redirect

### P17 — Keycloak Login Teması

- [ ] Keycloak login sayfası Destrova renk paletini kullanıyor
- [ ] Destrova logosu Keycloak başlığında görünüyor
- [ ] "Welcome back" + "Sign in to your Destrova workspace" görünüyor
- [ ] Input'lar Destrova stili (yuvarlak köşe, violet focus ring)
- [ ] Submit butonu koyu navy, hover animasyonu çalışıyor
- [ ] Yanlış şifre → Kırmızı hata mesajı Destrova stiliyle görünüyor
- [ ] "Forgot password?" linki violet renkte
- [ ] Mobil görünümde kart tam ekran, köşe yok
- [ ] Update Password sayfası: "Set your password" başlığı + logo görünüyor
- [ ] Update Password: iki input field aynı Destrova stiliyle
- [ ] Update Password: Submit butonu çalışıyor, şifre belirleniyor
- [ ] Şifre belirleme sonrası Destrova'ya yönlendirme başarılı
- [ ] Disabled account mesajı Keycloak stiliyle (amber/warning) görünüyor

---

## 9 — Commit Planı

```bash
# P16 — React Login Landing
git add frontend/src/pages/auth/LoginPage.jsx
git commit -m "feat(frontend): redesigned login landing — split layout, Destrova premium branding — P16"

# P17 — Keycloak Theme dosyaları
git add keycloak-theme/
git commit -m "feat(keycloak): add destrova custom theme — login, update-password, CSS branding — P17-A"

# P17 — Docker compose güncellemesi
git add docker-compose.yml
git commit -m "chore(docker): mount destrova keycloak theme, disable theme cache for dev — P17-B"
```

---

## Referans: Olası Sorunlar

| Sorun | Neden | Çözüm |
|-------|-------|-------|
| Tema listede "destrova" görünmüyor | Volume mount yanlış veya klasör yapısı hatalı | `docker exec ticket-keycloak ls /opt/keycloak/themes/` ile kontrol et |
| CSS uygulanmıyor ama tema seçili | Browser cache | Ctrl+Shift+R veya DevTools cache disable |
| Logo görünmüyor | `logo.png` path yanlış | `${url.resourcesPath}/img/logo.png` olduğundan emin ol |
| FTL syntax hatası | Keycloak log'a yazıyor | `docker logs ticket-keycloak --tail 30` ile kontrol et |
| `template.ftl` bulunamadı | `parent=keycloak` çalışmıyor | `theme.properties`'de `parent=keycloak` satırını doğrula |
| CSS class'ları eşleşmiyor | Keycloak sürümü farklı (v2 theme) | Login theme'i `keycloak` değil `keycloak.v2` olarak dene, CSS'i buna göre ayarla |
