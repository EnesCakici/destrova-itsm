# Destrova — İyileştirme Planı v3
> P5/P6/P7 tamamlandı. Bu sürüm P15/P16/P17 odaklanır.
> Gerçek kaynak kodu (AdminUsersRolesView, NotificationCenter, LoginPage) okunarak yazıldı.

---

# P15 — Admin Kullanıcı Yönetimi Paneli

## Mevcut Durum (Koddan Okundu)

### Frontend — Çok iyi durumda, eksikler az

`AdminUsersRolesView.jsx` zaten çalışır hâlde:
- ✅ Arama (name/email/department)
- ✅ Rol + statü filtresi
- ✅ `AdminTable` ile sıralanabilir tablo
- ✅ Row-click → `UserDrawer` (slide-in panel)
- ✅ Drawer'da name/role/status/department/maxTicketLimit düzenleme
- ✅ `getAdminUsers()` + `updateUser()` API çağrıları

**Eksikler:**
- ❌ "Add User" / "Create User" butonu ve modalı yok
- ❌ Drawer'da "Disable User" butonu yok
- ❌ api.js'te `createAdminUser()` ve `disableUser()` fonksiyonları yok

### Backend — Hiç yok

`UserController.java` mevcut değil.

`SecurityConfig.java` incelendi:
```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/public/**").permitAll()
    .requestMatchers("/api/webhook/**").permitAll()
    .anyRequest().authenticated()  // ← /api/admin/** için özel kural yok
)
```

`anyRequest().authenticated()` herhangi bir authenticated kullanıcının `/api/admin/**`'e erişmesine izin veriyor. Method-level `@PreAuthorize("hasRole('ADMIN')")` ile controller üzerinde çözülebilir — SecurityConfig'e ayrı kural eklenmeyecek (gereksiz).

### api.js — Kısmen hazır

```js
// MEVCUT — çalışıyor:
export const getAdminUsers = async () => publicApi.get("/admin/users");
export const updateUser = async (id, data) => publicApi.put(`/admin/users/${id}`, data);

// EKSİK:
createAdminUser   // POST /api/admin/users
disableUser       // DELETE /api/admin/users/{id} → soft delete
```

---

## Uygulama Sırası

```
P15-A → Backend: UserController (GET tümü, GET tek, POST yeni, PUT güncelle, DELETE soft)
P15-B → Backend: SecurityConfig güncelleme (opsiyonel — method-level yeterli)
P15-C → Frontend api.js: createAdminUser + disableUser ekle
P15-D → Frontend AdminUsersRolesView.jsx: Create User modal + Disable butonu
```

---

### Cursor Prompt P15-A — UserController.java

```
Görev: UserController.java oluştur.

Dosya (yeni): backend/src/main/java/com/ticket/backend/controller/UserController.java

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")    ← sınıf düzeyinde, tüm endpoint'lere uygulanır

Inject: UserRepository userRepository

--- Endpoint 1: Tüm kullanıcıları listele ---
@GetMapping
public List<User> getAllUsers()
  return userRepository.findAll();

--- Endpoint 2: Tek kullanıcı getir ---
@GetMapping("/{id}")
public ResponseEntity<User> getUserById(@PathVariable Long id)
  return userRepository.findById(id)
      .map(ResponseEntity::ok)
      .orElse(ResponseEntity.notFound().build());

--- Endpoint 3: Kullanıcı güncelle ---
@PutMapping("/{id}")
public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> body)
  User user = userRepository.findById(id)
      .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));

  if (body.containsKey("name") && body.get("name") != null)
    user.setName(body.get("name").toString().trim());
  if (body.containsKey("email") && body.get("email") != null)
    user.setEmail(body.get("email").toString().trim());
  if (body.containsKey("role") && body.get("role") != null) {
    try { user.setRole(UserRole.valueOf(body.get("role").toString().toUpperCase())); }
    catch (IllegalArgumentException ignored) {}
  }
  if (body.containsKey("status") && body.get("status") != null)
    user.setStatus(body.get("status").toString().trim());
  if (body.containsKey("department") && body.get("department") != null)
    user.setDepartment(body.get("department").toString().trim());
  if (body.containsKey("maxTicketLimit") && body.get("maxTicketLimit") != null)
    user.setMaxTicketLimit(((Number) body.get("maxTicketLimit")).intValue());

  return ResponseEntity.ok(userRepository.save(user));

--- Endpoint 4: Yeni kullanıcı oluştur ---
@PostMapping
@ResponseStatus(HttpStatus.CREATED)
public User createUser(@RequestBody User user)
  if (user.getStatus() == null || user.getStatus().isBlank()) user.setStatus("Active");
  if (user.getMaxTicketLimit() == null) user.setMaxTicketLimit(5);
  if (user.getRole() == null) user.setRole(UserRole.CUSTOMER);
  return userRepository.save(user);

--- Endpoint 5: Soft delete (Disabled) ---
@DeleteMapping("/{id}")
public ResponseEntity<User> disableUser(@PathVariable Long id)
  User user = userRepository.findById(id)
      .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
  user.setStatus("Disabled");
  return ResponseEntity.ok(userRepository.save(user));

Import'lar: UserRepository, User, UserRole, EntityNotFoundException, ResponseEntity,
  HttpStatus, ResponseStatus, Map, List, RequestBody, PathVariable, GetMapping,
  PostMapping, PutMapping, DeleteMapping, RequestMapping, RestController,
  RequiredArgsConstructor, PreAuthorize

KURAL: Sadece bu yeni dosya. Başka hiçbir dosyaya dokunma.
```

---

### Cursor Prompt P15-B — api.js: Eksik fonksiyonlar

```
Görev: services/api.js'e iki fonksiyon ekle.

Dosya: @api.js

Mevcut updateUser fonksiyonunun HEMEN ALTINA ekle:

  /** Admin — yeni kullanıcı oluştur. POST /api/admin/users */
  export const createAdminUser = async (data) => {
    const response = await publicApi.post("/admin/users", data);
    return response.data;
  };

  /** Admin — kullanıcıyı devre dışı bırak (soft delete). DELETE /api/admin/users/{id} */
  export const disableUser = async (id) => {
    const response = await publicApi.delete(`/admin/users/${id}`);
    return response.data;
  };

KURAL: Sadece bu iki fonksiyon eklenecek. Başka hiçbir şeye dokunma.
```

---

### Cursor Prompt P15-C — AdminUsersRolesView.jsx: Create modal + Disable butonu

```
Görev: AdminUsersRolesView.jsx'e iki özellik ekle.

Dosya: @AdminUsersRolesView.jsx (dosyayı context'e ekle)

ADIM 1 — Import ekle:
  import { getAdminUsers, getApiErrorMessage, updateUser, createAdminUser, disableUser } from "../../../../../services/api";

ADIM 2 — AdminSurface action prop'una "Add User" butonu ekle.
  AdminSurface component'inin action prop'u veya başlığın yanına:
  <AdminPrimaryButton onClick={() => setShowCreateModal(true)}>
    + Add User
  </AdminPrimaryButton>

ADIM 3 — State ekle:
  const [showCreateModal, setShowCreateModal] = useState(false);

ADIM 4 — CreateUserModal component (dosya içi, export olmayan):
  function CreateUserModal({ onClose, onCreated }) {
    const [form, setForm] = useState({ name: "", email: "", role: "CUSTOMER", department: "", maxTicketLimit: 5 });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const update = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

    const handleCreate = async () => {
      if (!form.name.trim()) { setError("Name is required."); return; }
      setSaving(true);
      setError(null);
      try {
        await createAdminUser({ ...form, role: form.role.toUpperCase(), status: "Active" });
        await onCreated();
        onClose();
      } catch (e) {
        setError(getApiErrorMessage(e, "Could not create user."));
      } finally {
        setSaving(false);
      }
    };

    return (
      <AdminModal
        open
        onClose={onClose}
        title="Add User"
        eyebrow="Admin"
        width={480}
        footer={
          <div className="flex items-center justify-end gap-2">
            <AdminGhostButton onClick={onClose} disabled={saving}>Cancel</AdminGhostButton>
            <AdminPrimaryButton onClick={handleCreate} disabled={saving}>
              {saving ? "Creating…" : "Create User"}
            </AdminPrimaryButton>
          </div>
        }
      >
        {error ? (
          <p className="mb-4 rounded-lg px-3 py-2 text-sm text-red-700 bg-red-50">{error}</p>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AdminField label="Full Name">
            <AdminInput value={form.name} onChange={update("name")} placeholder="Jane Smith" disabled={saving} />
          </AdminField>
          <AdminField label="Email">
            <AdminInput value={form.email} onChange={update("email")} type="email" placeholder="jane@company.com" disabled={saving} />
          </AdminField>
          <AdminField label="Role">
            <AdminSelect value={form.role} onChange={update("role")} options={ADMIN_ROLES} disabled={saving} />
          </AdminField>
          <AdminField label="Department">
            <AdminSelect value={form.department} onChange={update("department")} options={["", ...ADMIN_DEPARTMENTS]} disabled={saving} />
          </AdminField>
          <AdminField label="Max Open Tickets" hint="Per-agent ticket limit. 0 = unlimited.">
            <AdminInput value={String(form.maxTicketLimit)} onChange={(v) => update("maxTicketLimit")(Number(v) || 0)} type="number" disabled={saving} />
          </AdminField>
        </div>
      </AdminModal>
    );
  }

ADIM 5 — JSX'de showCreateModal iken render et:
  {showCreateModal && (
    <CreateUserModal onClose={() => setShowCreateModal(false)} onCreated={fetchUsers} />
  )}

ADIM 6 — UserDrawer component'ine "Disable User" butonu ekle.
  Drawer footer'ında Cancel / Save changes butonlarının SOLUNA (dirty false bile göster):
  {user.status !== "Disabled" && (
    <AdminGhostButton
      danger
      disabled={saving}
      onClick={async () => {
        setSaving(true);
        try {
          await disableUser(Number(userId));
          await onSaved();
          onClose();
        } catch (e) {
          setSaveError(getApiErrorMessage(e, "Could not disable user."));
        } finally {
          setSaving(false);
        }
      }}
    >
      Disable
    </AdminGhostButton>
  )}
  {user.status === "Disabled" && (
    <span className="text-[11px] text-amber-600 font-medium">This user is disabled</span>
  )}

KURAL: Sadece AdminUsersRolesView.jsx değişecek. Import eklenir, iki yeni parça eklenir.
Mevcut table / filter / drawer mantığına dokunma.
```

### Test Checklist — P15

- [ ] `POST /api/admin/users` body → DB'de yeni user, status=Active
- [ ] `PUT /api/admin/users/{id}` role güncelle → DB yansıdı
- [ ] `DELETE /api/admin/users/{id}` → status=Disabled (satır silinmedi)
- [ ] Frontend Add User modal → form submit → tablo güncellendi
- [ ] Drawer Disable butonu → user listede "Disabled" badge
- [ ] CUSTOMER rolüyle `/api/admin/users` → 403

### Commit — P15

```bash
git commit -m "feat(backend): UserController admin CRUD endpoints — P15-A"
git commit -m "feat(frontend): createAdminUser + disableUser api functions — P15-B"
git commit -m "feat(admin): create user modal + disable button in user drawer — P15-C"
```

---

---

# P16 — Giriş Sayfası Modernizasyonu

## Mevcut Durum (Koddan Okundu)

`LoginPage.jsx` (`frontend/src/pages/auth/LoginPage.jsx`):

```jsx
// Şu an şöyle görünüyor:
<div className="center-auth">
  <section className="card auth-card">
    <h2>ITSM Giriş</h2>
    <p>Sisteme giriş yapmak için...</p>
    <button className="btn btn-primary" onClick={login}>
      Keycloak ile Giriş Yap
    </button>
  </section>
</div>
```

`center-auth`, `card auth-card`, `btn btn-primary` → eski CSS class'ları. Destrova design system'i (`destrova-*` token'ları) hiç kullanılmıyor.

Router: `{ path: "/login", element: <LoginPage /> }` — path doğru, sadece component yeniden yazılacak.

`keycloak.js`'den: `login()` metodu `useKeycloak()` hook'u üzerinden geliyor.

`ITSM_LOGO.jpeg` proje kökünde mevcut. Import path: `import logoSrc from "../../../../ITSM_LOGO.jpeg"` (ya da vite için `import logoSrc from "/ITSM_LOGO.jpeg"`).

## Tasarım Kararları

### Layout: İki Sütun (Sol Branding + Sağ Action)

Büyük ekran (md+): Sol %55 koyu gradient panel (branding + feature highlights) + Sağ %45 beyaz login paneli.
Küçük ekran (mobile): Sadece login paneli, tam ekran.

### Sol Panel İçeriği

- Destrova logosu (büyük, beyaz versiyon veya renkli)
- Kısa slogan: "Modern IT Service Management"
- Alt açıklama: "SLA-driven, team-focused, always accountable."
- Feature highlight'ları (3 madde, ikonlu):
  - "Smart SLA monitoring with real-time alerts"
  - "Product-based team routing"
  - "Full lifecycle from request to resolution"
- Altta güvenlik notu: "Secured with SSO · Enterprise-grade"

### Sağ Panel İçeriği

- "Welcome back" başlığı (büyük, bold)
- "Sign in to your workspace" alt text
- Ayırıcı çizgi
- "Continue with Keycloak" butonu (tam genişlik, icon + metin)
- Altına küçük: "You'll be redirected to your organization's login page"
- Loading durumunda: spinner + "Checking your session..."

### Renk Paleti (Destrova token'larına göre)

Sol panel: `bg-gradient-to-br from-[#0F0E47] to-[#1a1960]` (mevcut dark renk)
Aksan: `destrova-primary` (#5c5cd6 veya benzeri violet ton)
Buton: koyu arkaplan üzerinde beyaz metin

---

### Cursor Prompt P16 — LoginPage.jsx tam yeniden yazım

```
Görev: LoginPage.jsx'i Destrova design system ile tamamen yeniden yaz.

Dosya: @LoginPage.jsx (frontend/src/pages/auth/LoginPage.jsx)

⚠️ Dosya tamamen değişecek. Sadece bu dosya.

Yeni tasarım gereksinimleri:

1. LAYOUT (büyük ekran md+):
   - Tam ekran (min-h-screen, w-full), iki sütunlu flex layout
   - Sol sütun: w-[55%], koyu gradient (from-[#0F0E47] to-[#1a1960]), gizli sır: md:flex
   - Sağ sütun: flex-1, beyaz/açık arkaplan (bg-white veya bg-slate-50), merkezi içerik
   - Mobilde: sadece sağ sütun (sol sütun hidden sm:hidden md:flex)

2. SOL SÜTUN içeriği:
   <div className="flex flex-col justify-between h-full px-12 py-12">
     <div>
       {/* Logo alanı */}
       <div className="flex items-center gap-3 mb-12">
         <img src={logoSrc} alt="Destrova" className="h-10 w-10 rounded-xl object-cover" />
         <span className="text-2xl font-bold tracking-tight text-white">Destrova</span>
       </div>
       {/* Başlık */}
       <h1 className="text-4xl font-bold text-white leading-tight mb-3">
         Modern IT Service<br />Management
       </h1>
       <p className="text-white/60 text-base mb-10">
         SLA-driven. Team-focused. Always accountable.
       </p>
       {/* Feature list */}
       <ul className="space-y-4">
         {[
           { icon: "⚡", text: "Smart SLA monitoring with real-time alerts" },
           { icon: "🎯", text: "Product-based team routing and workload balance" },
           { icon: "🔄", text: "Full lifecycle from request to resolution" },
         ].map((item) => (
           <li key={item.text} className="flex items-start gap-3">
             <span className="mt-0.5 text-lg">{item.icon}</span>
             <span className="text-white/75 text-sm leading-relaxed">{item.text}</span>
           </li>
         ))}
       </ul>
     </div>
     {/* Alt güvenlik notu */}
     <div className="flex items-center gap-2">
       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-white/40">
         <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
       </svg>
       <span className="text-white/40 text-xs">Secured with SSO · Enterprise-grade access control</span>
     </div>
   </div>

3. SAĞ SÜTUN içeriği:
   <div className="flex flex-col items-center justify-center h-full w-full max-w-md mx-auto px-8">
     {/* Mobilde logo */}
     <div className="mb-10 flex items-center gap-3 md:hidden">
       <img src={logoSrc} alt="Destrova" className="h-9 w-9 rounded-xl object-cover" />
       <span className="text-xl font-bold tracking-tight text-slate-900">Destrova</span>
     </div>

     {/* Başlık */}
     <div className="mb-8 w-full">
       <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
       <p className="text-slate-500 text-sm">Sign in to your workspace to continue.</p>
     </div>

     {/* Loading durumu */}
     {loading ? (
       <div className="w-full flex flex-col items-center gap-4 py-8">
         <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-violet-600 animate-spin" />
         <p className="text-sm text-slate-500">Checking your session…</p>
       </div>
     ) : (
       <>
         {/* Keycloak butonu */}
         <button
           onClick={login}
           className="w-full flex items-center justify-center gap-3 rounded-xl bg-[#0F0E47] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0F0E47]/20 transition-all duration-200 hover:bg-[#1a1960] hover:shadow-[#0F0E47]/30 active:scale-[0.99]"
         >
           {/* Keycloak logosu SVG (küçük, basit) */}
           <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg">
             <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
           </svg>
           Continue with Keycloak
         </button>

         <p className="mt-4 text-center text-xs text-slate-400">
           You'll be redirected to your organization's<br />identity provider to complete sign-in.
         </p>

         {/* Divider */}
         <div className="my-8 w-full flex items-center gap-3">
           <div className="flex-1 h-px bg-slate-200" />
           <span className="text-xs text-slate-400 font-medium">DESTROVA ITSM</span>
           <div className="flex-1 h-px bg-slate-200" />
         </div>

         {/* Role description */}
         <div className="w-full grid grid-cols-2 gap-3">
           {[
             { label: "Customers", desc: "Submit & track requests" },
             { label: "Agents", desc: "Resolve & manage tickets" },
             { label: "Managers", desc: "Monitor SLAs & teams" },
             { label: "Admins", desc: "Configure the platform" },
           ].map((item) => (
             <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
               <p className="text-[11px] font-semibold text-slate-700">{item.label}</p>
               <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
             </div>
           ))}
         </div>
       </>
     )}
   </div>

4. LOGO IMPORT:
   import logoSrc from "../../../../ITSM_LOGO.jpeg";
   (Vite'da public folder kullanmak istersen: import logoSrc from "/ITSM_LOGO.jpeg";
   — hangisi derleme hatası vermezse onu kullan)

5. LOGIC (değişmez):
   useEffect: authenticated → role bazlı navigate (mevcut mantık korunacak)
   login: useKeycloak().login() (değişmez)

KURAL: Sadece LoginPage.jsx değişecek. Router, Keycloak context, auth mantığına dokunma.
Tüm className'ler Tailwind ile — App.css'deki center-auth gibi class'lara bağımlılık kalmayacak.
```

### Test Checklist — P16

- [ ] `/login` route'u yeni tasarımı gösteriyor
- [ ] Mobil görünümde sol panel gizli, login kartı tam ekran
- [ ] "Continue with Keycloak" → Keycloak sayfasına yönlendiriyor
- [ ] Authenticated iken `/login`'e gidince role-based redirect çalışıyor
- [ ] Logo render oluyor (import path doğru)
- [ ] Loading spinner görünüyor

### Commit — P16

```bash
git commit -m "feat(frontend): brand new login page — split layout with feature highlights — P16"
```

---

---

# P17 — Bildirim Paneli Tasarım Güncellemesi

## Mevcut Durum (Koddan Okundu)

`NotificationCenter.jsx` teknik olarak iyi durumda:
- ✅ Portal-based akıllı konum hesaplama
- ✅ `variant="enterprise"` + `dark` + `isAgent` çoklu tema
- ✅ 30 saniyelik polling + window focus yenileme
- ✅ `|||` separator ile başlık/detay mesaj parsing
- ✅ Okunmamış badge (99+)
- ✅ Row tıkla → ticket navigate

**Görsel eksikler:**
- ❌ Bildirim tipi ikonu yok (SLA breach, comment, assignment farklı görünmüyor)
- ❌ Göreli zaman yok ("2 min ago", "1 hr ago", "Yesterday")
- ❌ Ticket referans chip'i yok ("#94" gibi)
- ❌ Boş durum sadece tek satır metin, görsel yok
- ❌ Okunmamış satırların sol kenar aksanı yok (sadece arka plan rengi)
- ❌ Loading durumu sadece "Loading…" metni

Mesaj formatı backend'den geliyor: `"#94 — SLA Breached|||HH:mm · Immediate action required"`

---

## Tasarım Kararı: Minimal Artırma

NotificationCenter'ın tüm mantığını **koruyarak** sadece görsel katmanı zenginleştiriyoruz. State, API çağrıları, portal konumlandırma, variant sistemi — hiçbirine dokunulmayacak. Sadece panel ve row render bölümleri güncellenecek.

---

### Bildirim Tipi Tespiti (mesajdan otomatik)

Backend mesaj formatı: `"#94 — SLA Breached|||..."` veya `"#94 — New Request Assigned|||..."`

Başlık kelimelerinden tip tespiti:

```js
// Dosya içi helper (state/API değil — sadece görsel):
function getNotificationVisual(title) {
  const t = (title || "").toLowerCase();
  if (t.includes("sla breached") || t.includes("sla breach"))
    return { icon: "⚡", color: "#ef4444", bg: "bg-red-50", dot: "bg-red-500" };
  if (t.includes("sla warning") || t.includes("at risk"))
    return { icon: "⚠️", color: "#f59e0b", bg: "bg-amber-50", dot: "bg-amber-500" };
  if (t.includes("assigned") || t.includes("transferred"))
    return { icon: "👤", color: "#6d28d9", bg: "bg-violet-50", dot: "bg-violet-500" };
  if (t.includes("comment") || t.includes("reply") || t.includes("mentioned") || t.includes("note"))
    return { icon: "💬", color: "#0284c7", bg: "bg-sky-50", dot: "bg-sky-500" };
  if (t.includes("closed") || t.includes("resolved") || t.includes("approved"))
    return { icon: "✅", color: "#059669", bg: "bg-emerald-50", dot: "bg-emerald-500" };
  if (t.includes("reopened") || t.includes("declined") || t.includes("rejected"))
    return { icon: "🔄", color: "#9333ea", bg: "bg-purple-50", dot: "bg-purple-500" };
  // Default
  return { icon: "🔔", color: "#6b7280", bg: "bg-slate-50", dot: "bg-slate-400" };
}
```

---

### Göreli Zaman Hesabı

```js
function relativeTime(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}
```

---

### Ticket Chip Tespiti

Mesajdaki `#94` pattern'inden ticket ID'yi çıkar:

```js
function extractTicketId(title) {
  const match = (title || "").match(/#(\d+)/);
  return match ? match[1] : null;
}
```

---

### Cursor Prompt P17 — NotificationCenter.jsx

```
Görev: NotificationCenter.jsx'e 4 görsel iyileştirme ekle. Hiçbir state/logic/API değişmeyecek.

Dosya: @NotificationCenter.jsx (dosyayı context'e ekle)

⚠️ YASAK BÖLGELER (bu satırlara dokunma):
- useState, useCallback, useEffect bloklarına dokunma
- refreshUnread, loadList, computePanelCoords fonksiyonlarına dokunma
- onBellClick, onMarkAll, onRowClick fonksiyonlarına dokunma
- panelCoords hesaplamasına ve portal mantığına dokunma

---

ADIM 1 — Dosyanın BAŞINA (import'lardan sonra, component tanımından önce) 3 helper ekle:

  function getNotificationVisual(title) {
    const t = (title || "").toLowerCase();
    if (t.includes("sla breached") || t.includes("sla breach"))
      return { emoji: "⚡", dot: "#ef4444", unreadBg: "rgba(239,68,68,0.06)" };
    if (t.includes("sla warning") || t.includes("at risk"))
      return { emoji: "⚠️", dot: "#f59e0b", unreadBg: "rgba(245,158,11,0.06)" };
    if (t.includes("assigned") || t.includes("transferred"))
      return { emoji: "👤", dot: "#6d28d9", unreadBg: "rgba(109,40,217,0.06)" };
    if (t.includes("comment") || t.includes("reply") || t.includes("mentioned") || t.includes("note"))
      return { emoji: "💬", dot: "#0284c7", unreadBg: "rgba(2,132,199,0.06)" };
    if (t.includes("closed") || t.includes("resolved") || t.includes("approved"))
      return { emoji: "✅", dot: "#059669", unreadBg: "rgba(5,150,105,0.06)" };
    if (t.includes("reopened") || t.includes("declined") || t.includes("rejected"))
      return { emoji: "🔄", dot: "#9333ea", unreadBg: "rgba(147,51,234,0.06)" };
    return { emoji: "🔔", dot: "#6b7280", unreadBg: "rgba(107,114,128,0.05)" };
  }

  function relativeTime(dateStr) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.floor(hr / 24);
    if (days === 1) return "yesterday";
    return `${days}d ago`;
  }

  function extractTicketId(title) {
    const match = (title || "").match(/#(\d+)/);
    return match ? match[1] : null;
  }

---

ADIM 2 — Boş durum metnini görsel ile değiştir.
  Şu satırı bul:
    <p className={`px-3 py-6 text-center ${subText}`}>No notifications</p>
  
  Şununla değiştir:
    <div className="flex flex-col items-center justify-center py-10 px-4 gap-3">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl
        ${isEnterprise ? "bg-slate-100" : dark ? "bg-white/10" : "bg-slate-100"}`}>
        🔔
      </div>
      <div className="text-center">
        <p className={`text-[13px] font-medium ${isEnterprise ? "text-slate-600" : dark ? "text-white/70" : "text-[#505081]"}`}>
          You're all caught up
        </p>
        <p className={`mt-0.5 text-[11px] ${subText}`}>
          New notifications will appear here
        </p>
      </div>
    </div>

---

ADIM 3 — Loading durumunu spinner ile güncelle.
  Şu satırı bul:
    <p className={`px-3 py-6 text-center ${subText}`}>Loading…</p>
  
  Şununla değiştir:
    <div className="flex items-center justify-center py-8 gap-2.5">
      <div className={`h-5 w-5 rounded-full border-2 animate-spin
        ${isEnterprise ? "border-slate-200 border-t-blue-500"
          : dark ? "border-white/20 border-t-white/70"
          : "border-slate-200 border-t-[#5c5cd6]"}`} />
      <span className={`text-[12px] ${subText}`}>Loading…</span>
    </div>

---

ADIM 4 — Her bildirim satırını (items.map içini) zenginleştir.
  Şu bölümü bul:
    items.map((row) => {
      const parts = (row.message || "").split("|||");
      const title = (parts[0] || "").trim();
      const detail = (parts[1] || "").trim();
      ...
      return (
        <button key={row.id} ...>
          <div className="flex flex-col text-left">
            <span className={messageTitleClass}>{title || row.message}</span>
            {detail ? <span className={notificationBodyLine}>{detail}</span> : null}
          </div>
        </button>
      );
    })

  SADECE return () içini (button JSX'ini) şununla değiştir:

    (() => {
      const visual = getNotificationVisual(title);
      const ticketId = extractTicketId(title);
      const timeStr = relativeTime(row.createdAt);
      const cleanTitle = title.replace(/^#\d+\s*[—–-]\s*/, "").trim();
      const unreadRowStyle = !row.read && !isEnterprise
        ? { backgroundColor: dark ? "rgba(255,255,255,0.05)" : visual.unreadBg }
        : {};

      return (
        <button
          key={row.id}
          type="button"
          className={[
            rowBase,
            !row.read && isEnterprise ? rowUnread : "",
          ].join(" ")}
          style={unreadRowStyle}
          onClick={() => void onRowClick(row)}
        >
          <div className="flex items-start gap-2.5">
            {/* Type icon */}
            <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm
              ${isEnterprise ? "bg-slate-100" : dark ? "bg-white/10" : "bg-slate-100/80"}`}>
              {visual.emoji}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <span className={messageTitleClass}>{cleanTitle || row.message}</span>
                {/* Zaman */}
                {timeStr ? (
                  <span className={`shrink-0 text-[10px] tabular-nums ${subText}`}>
                    {timeStr}
                  </span>
                ) : null}
              </div>
              {/* Detay */}
              {detail ? (
                <span className={`${notificationBodyLine} mt-0.5`}>
                  {detail}
                </span>
              ) : null}
              {/* Ticket chip */}
              {ticketId ? (
                <span className={`mt-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold
                  ${isEnterprise ? "bg-slate-100 text-slate-600"
                    : dark ? "bg-white/15 text-white/70"
                    : "bg-slate-100 text-slate-600"}`}>
                  #{ticketId}
                </span>
              ) : null}
            </div>

            {/* Okunmamış dot */}
            {!row.read ? (
              <div
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: visual.dot }}
              />
            ) : null}
          </div>
        </button>
      );
    })()

---

KURAL ÖZETI:
  - ADIM 1: Dosya başına 3 helper fonksiyon ekle (hiçbir hook/state değil)
  - ADIM 2: Boş durum paragrafını değiştir
  - ADIM 3: Loading paragrafını değiştir
  - ADIM 4: items.map içindeki return bloğunu güncelle
  - Başka hiçbir satıra dokunma
  - useState, API çağrıları, portal, panelCoords — değişmez
```

### Test Checklist — P17

- [ ] Bildirim paneli açılıyor, portal konumu doğru
- [ ] SLA Breached bildirimi → kırmızı ⚡ ikonu
- [ ] Assigned bildirimi → mor 👤 ikonu
- [ ] Comment bildirimi → mavi 💬 ikonu
- [ ] Ticket ID chip'i görünüyor ("#94")
- [ ] "2m ago" gibi göreli zaman doğru
- [ ] Boş durum → 🔔 ikonu + "You're all caught up" metni
- [ ] Loading → spinner
- [ ] Okunmamış → renkli dot sağda
- [ ] "Mark all read" → tüm satırlar okunmuş görünümüne geçiyor
- [ ] Mevcut tıklama → ticket yönlendirme çalışıyor (bozulmadı)

### Commit — P17

```bash
git commit -m "feat(frontend): enhanced notification panel — type icons, relative time, ticket chip — P17"
```

---

---

## Son Commit Sırası

```bash
# P15
git commit -m "feat(backend): UserController admin CRUD endpoints — P15-A"
git commit -m "feat(frontend): createAdminUser + disableUser api — P15-B"
git commit -m "feat(admin): create user modal + disable in drawer — P15-C"

# P16
git commit -m "feat(frontend): redesigned login page — split layout, Destrova branding — P16"

# P17
git commit -m "feat(frontend): notification panel — type icons, relative time, ticket chip — P17"

# Final
git add .
git commit -m "chore: Destrova ITSM feature complete — all improvements applied"
git push
```
