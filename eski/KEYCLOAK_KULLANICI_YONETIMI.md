# Keycloak Kullanıcı Yönetimi Entegrasyonu
> Admin panelinden kullanıcı oluşturulunca Keycloak'ta da otomatik hesap açılır,
> kullanıcıya şifre belirleme e-postası gönderilir, direkt giriş yapabilir.
>
> Tarih: Haziran 2026 | Spring Boot 4.0.5 | Keycloak 25+ | MailHog

---

## Mimari Özet

```
Admin (Destrova UI)
  ↓ "Add User" → POST /api/admin/users

AdminUserController
  ↓
KeycloakAdminService
  ├─ 1. Master realm'dan admin token al
  ├─ 2. ticket-realm'da kullanıcı oluştur → Location header'dan kcId al
  ├─ 3. Realm rolü ata (agent/manager/customer/admin)
  └─ 4. "UPDATE_PASSWORD" e-postası gönder → MailHog yakalar
  ↓ kcSub döner

app_users tablosuna keycloakSub ile kaydet

  ↓

Kullanıcı MailHog'dan e-postayı açar
  → Şifresini belirler
  → /login → Destrova'ya giriş yapar ✅
```

---

## Ön Koşullar — Koddan Önce Yapılacaklar

**Bu adımlar el ile yapılır. Sonra Cursor prompt'larına geç.**

---

### Adım 0.1 — Keycloak SMTP Ayarı (MailHog)

1. `http://localhost:8081` aç → admin / admin ile giriş
2. Sol üstten **ticket-realm** seç
3. Sol menü → **Realm Settings** → üstteki **Email** sekmesi
4. Şu bilgileri gir:

   | Alan | Değer |
   |------|-------|
   | From | no-reply@destrova.local |
   | From Display Name | Destrova ITSM |
   | Host | **mailhog** |
   | Port | **1025** |
   | SSL | OFF |
   | StartTLS | OFF |
   | Authentication | OFF |

5. Sayfanın altındaki **Save** butonuna tıkla
6. Hemen altında **Test connection** butonuna tıkla → başarılı mesajı görünmeli
7. MailHog UI `http://localhost:8025` → test e-postası gelmiş mi kontrol et

> **Neden `mailhog` yazıyoruz?** Spring Boot localhost:1025 kullanıyor ama Keycloak
> Docker container içinden erişiyor. Container'lar arası iletişimde servis adı kullanılır.

---

### Adım 0.2 — Realm Rolleri Kontrol Et

1. Keycloak → ticket-realm → sol menü → **Realm Roles**
2. Şu rollerin listede olduğunu doğrula:

   - `customer`
   - `agent`
   - `manager`
   - `admin`

3. Eksik olan varsa → **Create role** → sadece adı yaz → Save

> Bu roller AppUserService.resolveRole() tarafından case-insensitive okunuyor.
> `AGENT` rolü olan kullanıcı JWT'sinde `realm_access.roles: ["agent"]` görünür.

---

### Adım 0.3 — Şifre Belirleme Link Süresini Ayarla

1. Keycloak → ticket-realm → Realm Settings → **Tokens** sekmesi
2. **Reset Credentials Lifespan** → `2 Days` yap (kullanıcının vakti olsun)
3. Save

---

## Uygulama Adımları (Cursor Prompt'ları)

---

### Adım 1 — application.yaml: Keycloak Admin Config

**Commit öncesi yapılacak:** Hayır, direkt uygula.

#### Cursor Prompt

```
Görev: application.yaml'a Keycloak admin konfigürasyonu ekle.

Dosya: backend/src/main/resources/application.yaml

destrova: anahtarının altında, en sona (webhook: satırının ALTINA) ekle:
  keycloak-admin:
    url: http://localhost:8081
    realm: ticket-realm
    admin-username: admin
    admin-password: admin

Sonuç şöyle görünmeli:
  destrova:
    workflow:
      ...
    webhook:
      secret: destrova-webhook-dev-secret
    keycloak-admin:          ← YENİ
      url: http://localhost:8081
      realm: ticket-realm
      admin-username: admin
      admin-password: admin

KURAL: Sadece bu 4 satır eklenecek. Girintiye dikkat et (2 space).
Başka hiçbir şeye dokunma.
```

#### Doğrulama

```bash
./mvnw compile
```
Hata yoksa devam.

---

### Adım 2 — KeycloakAdminService.java (Yeni Dosya)

**⚠️ En kritik adım. Önce commit at:**

```bash
git add .
git commit -m "chore: add keycloak-admin config to application.yaml"
```

#### Cursor Prompt

```
Görev: KeycloakAdminService.java oluştur.

Dosya (yeni): backend/src/main/java/com/ticket/backend/service/KeycloakAdminService.java

Paket: com.ticket.backend.service

Sınıf anotasyonları: @Service @Slf4j @RequiredArgsConstructor

Field'lar:
  private final RestTemplate restTemplate;

  @Value("${destrova.keycloak-admin.url}")
  private String keycloakUrl;

  @Value("${destrova.keycloak-admin.realm}")
  private String realm;

  @Value("${destrova.keycloak-admin.admin-username}")
  private String adminUsername;

  @Value("${destrova.keycloak-admin.admin-password}")
  private String adminPassword;

---

Private metot: getAdminToken() → String

  Amaç: Keycloak master realm'dan admin token al.

  URL: keycloakUrl + "/realms/master/protocol/openid-connect/token"

  HttpHeaders headers = new HttpHeaders();
  headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

  MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
  body.add("client_id", "admin-cli");
  body.add("username", adminUsername);
  body.add("password", adminPassword);
  body.add("grant_type", "password");

  ResponseEntity<Map> response = restTemplate.exchange(
      url, HttpMethod.POST,
      new HttpEntity<>(body, headers),
      Map.class);

  Object token = response.getBody().get("access_token");
  if (token == null) throw new RuntimeException("Keycloak admin token alınamadı");
  return token.toString();

---

Public metot: provisionUser(String fullName, String email, UserRole role) → String

  Amaç: Keycloak'ta kullanıcı oluştur, rol ata, şifre e-postası gönder.
  Dönüş değeri: Keycloak kullanıcı ID'si (kcSub).

  ADIM 1 — Admin token al:
    String token = getAdminToken();
    HttpHeaders authHeaders = new HttpHeaders();
    authHeaders.setBearerAuth(token);
    authHeaders.setContentType(MediaType.APPLICATION_JSON);

  ADIM 2 — Ad / Soyad ayır:
    String[] parts = (fullName != null ? fullName.trim() : "").split("\\s+", 2);
    String firstName = parts.length > 0 ? parts[0] : "";
    String lastName  = parts.length > 1 ? parts[1] : "";

  ADIM 3 — Keycloak'ta kullanıcı oluştur:
    String createUrl = keycloakUrl + "/admin/realms/" + realm + "/users";

    Map<String, Object> kcUser = new java.util.LinkedHashMap<>();
    kcUser.put("username", email);
    kcUser.put("email", email);
    kcUser.put("firstName", firstName);
    kcUser.put("lastName", lastName);
    kcUser.put("enabled", true);
    kcUser.put("emailVerified", true);

    ResponseEntity<Void> createResp = restTemplate.exchange(
        createUrl, HttpMethod.POST,
        new HttpEntity<>(kcUser, authHeaders),
        Void.class);

    if (createResp.getStatusCode().value() == 409) {
        throw new IllegalStateException(
            "Bu e-posta adresi Keycloak'ta zaten kayıtlı: " + email);
    }
    if (!createResp.getStatusCode().is2xxSuccessful()) {
        throw new RuntimeException(
            "Keycloak kullanıcı oluşturma hatası: " + createResp.getStatusCode());
    }

    // Location header'dan kcId çıkar: .../users/{kcId}
    java.net.URI location = createResp.getHeaders().getLocation();
    if (location == null) {
        throw new RuntimeException("Keycloak Location header dönmedi");
    }
    String path = location.getPath();
    String kcId = path.substring(path.lastIndexOf('/') + 1);
    log.info("Keycloak kullanıcı oluşturuldu: email={}, kcId={}", email, kcId);

  ADIM 4 — Realm rolünü al:
    String roleName = role.name().toLowerCase(); // AGENT → agent
    String roleUrl = keycloakUrl + "/admin/realms/" + realm + "/roles/" + roleName;

    ResponseEntity<Map> roleResp = restTemplate.exchange(
        roleUrl, HttpMethod.GET,
        new HttpEntity<>(authHeaders),
        Map.class);

    if (!roleResp.getStatusCode().is2xxSuccessful() || roleResp.getBody() == null) {
        throw new RuntimeException(
            "Keycloak'ta rol bulunamadı: " + roleName
            + ". Realm Roles'da bu rolü oluşturduğunuzdan emin olun.");
    }
    Map<String, Object> roleRep = roleResp.getBody();

  ADIM 5 — Rolü kullanıcıya ata:
    String roleMappingUrl = keycloakUrl + "/admin/realms/" + realm
        + "/users/" + kcId + "/role-mappings/realm";

    restTemplate.exchange(
        roleMappingUrl, HttpMethod.POST,
        new HttpEntity<>(java.util.List.of(roleRep), authHeaders),
        Void.class);
    log.info("Keycloak rol atandı: role={}, kcId={}", roleName, kcId);

  ADIM 6 — Şifre belirleme e-postası gönder (lifespan 48 saat):
    String actionsUrl = keycloakUrl + "/admin/realms/" + realm
        + "/users/" + kcId + "/execute-actions-email?lifespan=172800";
    try {
        restTemplate.exchange(
            actionsUrl, HttpMethod.PUT,
            new HttpEntity<>(java.util.List.of("UPDATE_PASSWORD"), authHeaders),
            Void.class);
        log.info("Şifre belirleme e-postası gönderildi: email={}", email);
    } catch (Exception e) {
        // Kullanıcı oluşturuldu; e-posta hatası kritik değil
        log.warn("Şifre e-postası gönderilemedi (kullanıcı oluşturuldu, admin sonra gönderebilir): "
            + "email={}, hata={}", email, e.getMessage());
    }

  return kcId;

---

Gerekli import'lar:
  import com.ticket.backend.enums.UserRole;
  import lombok.RequiredArgsConstructor;
  import lombok.extern.slf4j.Slf4j;
  import org.springframework.beans.factory.annotation.Value;
  import org.springframework.http.*;
  import org.springframework.stereotype.Service;
  import org.springframework.util.LinkedMultiValueMap;
  import org.springframework.util.MultiValueMap;
  import org.springframework.web.client.RestTemplate;
  import java.net.URI;
  import java.util.List;
  import java.util.Map;
  import java.util.LinkedHashMap;

KURAL: Sadece bu yeni dosya oluşturulacak. Başka hiçbir dosyaya dokunma.
```

#### Compile Kontrolü

```bash
./mvnw compile
```

Hata alırsan:
- `HttpMethod` import hatası → `import org.springframework.http.HttpMethod;` ekle
- `LinkedMultiValueMap` → `import org.springframework.util.LinkedMultiValueMap;` ekle

#### Commit

```bash
git add .
git commit -m "feat(backend): KeycloakAdminService — provision user with role and welcome email"
```

---

### Adım 3 — AdminUserController.java (Yeni Dosya)

> **⚠️ Dikkat:** Projede zaten `UserController.java` var (path: `/api/users/me`).
> Bu yeni controller FARKLI bir dosya: `AdminUserController.java`, path: `/api/admin/users`.
> İkisi karıştırılmamalı.

#### Cursor Prompt

```
Görev: AdminUserController.java oluştur.
DİKKAT: Mevcut UserController.java farklı bir dosya (/api/users path'i). Bu yeni dosya
/api/admin/users path'ini kullanacak. İkisi çakışmaz.

Dosya (yeni): backend/src/main/java/com/ticket/backend/controller/AdminUserController.java

Paket: com.ticket.backend.controller

Anotasyonlar:
  @RestController
  @RequestMapping("/api/admin/users")
  @RequiredArgsConstructor
  @PreAuthorize("hasRole('ADMIN')")  ← sınıf düzeyinde

Inject:
  UserRepository userRepository
  KeycloakAdminService keycloakAdminService

---

Endpoint 1: GET / → Tüm kullanıcılar

  @GetMapping
  public List<User> getAllUsers() {
      return userRepository.findAll();
  }

---

Endpoint 2: GET /{id} → Tek kullanıcı

  @GetMapping("/{id}")
  public ResponseEntity<User> getUserById(@PathVariable Long id) {
      return userRepository.findById(id)
              .map(ResponseEntity::ok)
              .orElse(ResponseEntity.notFound().build());
  }

---

Endpoint 3: POST / → Yeni kullanıcı (Keycloak entegrasyonlu)

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public User createUser(@RequestBody User user) {
      if (user.getEmail() == null || user.getEmail().isBlank()) {
          throw new IllegalArgumentException("E-posta adresi zorunludur.");
      }
      if (user.getName() == null || user.getName().isBlank()) {
          throw new IllegalArgumentException("Ad Soyad zorunludur.");
      }
      UserRole role = user.getRole() != null ? user.getRole() : UserRole.CUSTOMER;
      user.setRole(role);

      // Keycloak'ta oluştur ve şifre e-postası gönder
      String kcSub = keycloakAdminService.provisionUser(
          user.getName(), user.getEmail(), role);

      // DB'ye yaz
      user.setKeycloakSub(kcSub);
      if (user.getStatus() == null || user.getStatus().isBlank()) user.setStatus("Active");
      if (user.getMaxTicketLimit() == null) user.setMaxTicketLimit(5);
      return userRepository.save(user);
  }

---

Endpoint 4: PUT /{id} → Kullanıcı güncelle (sadece DB — Keycloak email/şifre harici)

  @PutMapping("/{id}")
  public ResponseEntity<User> updateUser(
          @PathVariable Long id,
          @RequestBody Map<String, Object> body) {

      User user = userRepository.findById(id)
              .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));

      if (body.containsKey("name") && body.get("name") != null)
          user.setName(body.get("name").toString().trim());
      if (body.containsKey("email") && body.get("email") != null)
          user.setEmail(body.get("email").toString().trim());
      if (body.containsKey("role") && body.get("role") != null) {
          try {
              user.setRole(UserRole.valueOf(
                  body.get("role").toString().toUpperCase()));
          } catch (IllegalArgumentException ignored) {}
      }
      if (body.containsKey("status") && body.get("status") != null)
          user.setStatus(body.get("status").toString().trim());
      if (body.containsKey("department") && body.get("department") != null)
          user.setDepartment(body.get("department").toString().trim());
      if (body.containsKey("maxTicketLimit") && body.get("maxTicketLimit") != null)
          user.setMaxTicketLimit(
              ((Number) body.get("maxTicketLimit")).intValue());

      return ResponseEntity.ok(userRepository.save(user));
  }

---

Endpoint 5: DELETE /{id} → Soft disable (DB + Keycloak disabled)

  @DeleteMapping("/{id}")
  public ResponseEntity<User> disableUser(@PathVariable Long id) {
      User user = userRepository.findById(id)
              .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));
      user.setStatus("Disabled");
      return ResponseEntity.ok(userRepository.save(user));
      // Not: Keycloak tarafında da disabled etmek istersen
      // keycloakAdminService.disableKeycloakUser(user.getKeycloakSub()) eklenebilir.
      // Şimdilik sadece DB — kullanıcı Keycloak'ta var ama giriş yapınca
      // app_users status kontrolü ileride eklenebilir.
  }

---

Import'lar:
  import com.ticket.backend.entity.User;
  import com.ticket.backend.enums.UserRole;
  import com.ticket.backend.repository.UserRepository;
  import com.ticket.backend.service.KeycloakAdminService;
  import jakarta.persistence.EntityNotFoundException;
  import lombok.RequiredArgsConstructor;
  import org.springframework.http.HttpStatus;
  import org.springframework.http.ResponseEntity;
  import org.springframework.security.access.prepost.PreAuthorize;
  import org.springframework.web.bind.annotation.*;
  import java.util.List;
  import java.util.Map;

KURAL: Sadece bu yeni dosya oluşturulacak.
Mevcut UserController.java'ya DOKUNMA (o /api/users/me'yi yönetiyor).
```

#### Compile Kontrolü

```bash
./mvnw compile
```

#### Commit

```bash
git add .
git commit -m "feat(backend): AdminUserController — admin CRUD with Keycloak provisioning"
```

---

### Adım 4 — api.js: Eksik Fonksiyonlar

#### Cursor Prompt

```
Görev: services/api.js'e iki fonksiyon ekle.

Dosya: @api.js (dosyayı context'e ekle)

Dosyada şunu bul:
  export const updateUser = async (id, data) => {
    ...
  };

Bu satırın HEMEN ALTINA iki fonksiyon ekle:

  /** Admin — yeni kullanıcı oluştur (Keycloak provisionlu). POST /api/admin/users */
  export const createAdminUser = async (data) => {
    const response = await publicApi.post("/admin/users", data);
    return response.data;
  };

  /** Admin — kullanıcıyı devre dışı bırak. DELETE /api/admin/users/{id} */
  export const disableUser = async (id) => {
    const response = await publicApi.delete(`/admin/users/${id}`);
    return response.data;
  };

KURAL: Sadece bu iki fonksiyon eklenecek. Başka hiçbir şeye dokunma.
```

---

### Adım 5 — AdminUsersRolesView.jsx: Create Modal + Disable Butonu

**⚠️ En geniş frontend değişikliği. Önce commit at:**

```bash
git add .
git commit -m "feat(frontend): add createAdminUser and disableUser api functions"
```

#### Cursor Prompt

```
Görev: AdminUsersRolesView.jsx'e "Add User" modal ve "Disable" butonu ekle.

Dosya: @AdminUsersRolesView.jsx (dosyayı context'e ekle)

---

ADIM 1 — Import satırını güncelle.

Şu satırı bul:
  import { getAdminUsers, getApiErrorMessage, updateUser } from "../../../../../services/api";

Şununla değiştir:
  import {
    getAdminUsers,
    getApiErrorMessage,
    updateUser,
    createAdminUser,
    disableUser,
  } from "../../../../../services/api";

---

ADIM 2 — AdminModal import'u ekle.
Dosyanın import bölümünde AdminDrawer import'unu bul:
  import { ..., AdminDrawer, ... } from "../AdminPrimitives";

Aynı satıra AdminModal ekle (zaten varsa ekleme):
  AdminModal

---

ADIM 3 — showCreateModal state ekle.
Mevcut useState satırlarının yanına (mesela query, roleF satırlarının yanına):
  const [showCreateModal, setShowCreateModal] = useState(false);

---

ADIM 4 — AdminSurface'in action prop'una "Add User" butonu ekle.
AdminSurface component'ini bul. Üzerinde action prop var mı bak.
  Varsa: action prop'una şunu ekle:
    <AdminPrimaryButton onClick={() => setShowCreateModal(true)}>
      + Add User
    </AdminPrimaryButton>
  Yoksa: AdminSurface kapanış etiketinden hemen ÖNCE, AdminCard'lardan ÖNCE şunu ekle:
    <div className="flex justify-end mb-4">
      <AdminPrimaryButton onClick={() => setShowCreateModal(true)}>
        + Add User
      </AdminPrimaryButton>
    </div>

---

ADIM 5 — CreateUserModal component'ini ekle (dosya içi, export olmayan fonksiyon).
UserDrawer fonksiyonunun HEMEN ÜSTÜNE (yani dosyanın sonuna doğru, export default'tan önce) ekle:

  function CreateUserModal({ onClose, onCreated }) {
    const [form, setForm] = useState({
      name: "",
      email: "",
      role: "Customer",
      department: "",
      maxTicketLimit: 5,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    const update = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

    const handleCreate = async () => {
      if (!form.name.trim()) { setError("Full name is required."); return; }
      if (!form.email.trim()) { setError("Email is required."); return; }
      setSaving(true);
      setError(null);
      try {
        const apiRole = DISPLAY_ROLE_TO_API[form.role] || "CUSTOMER";
        await createAdminUser({
          name: form.name.trim(),
          email: form.email.trim(),
          role: apiRole,
          department: form.department || null,
          maxTicketLimit: Number(form.maxTicketLimit) || 5,
          status: "Active",
        });
        setSuccessMsg(
          `User created. A password setup email has been sent to ${form.email}. The link expires in 48 hours.`
        );
        await onCreated();
      } catch (e) {
        setError(getApiErrorMessage(e, "Could not create user."));
      } finally {
        setSaving(false);
      }
    };

    if (successMsg) {
      return (
        <AdminModal open onClose={onClose} title="User Created" eyebrow="Admin" width={440}
          footer={
            <div className="flex justify-end">
              <AdminPrimaryButton onClick={onClose}>Done</AdminPrimaryButton>
            </div>
          }
        >
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">✅</div>
            <p className="text-sm text-slate-700">{successMsg}</p>
            <p className="text-xs text-slate-400">The user can now log in at /login after setting their password.</p>
          </div>
        </AdminModal>
      );
    }

    return (
      <AdminModal
        open
        onClose={onClose}
        title="Add User"
        eyebrow="Admin"
        width={500}
        footer={
          <div className="flex items-center justify-end gap-2">
            <AdminGhostButton onClick={onClose} disabled={saving}>Cancel</AdminGhostButton>
            <AdminPrimaryButton onClick={handleCreate} disabled={saving || !form.name.trim() || !form.email.trim()}>
              {saving ? "Creating…" : "Create & Send Invite"}
            </AdminPrimaryButton>
          </div>
        }
      >
        {error ? (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        <div className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
          An email with a password setup link will be sent to the user automatically.
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AdminField label="Full Name">
            <AdminInput
              value={form.name}
              onChange={update("name")}
              placeholder="Jane Smith"
              disabled={saving}
            />
          </AdminField>
          <AdminField label="Email Address">
            <AdminInput
              value={form.email}
              onChange={update("email")}
              type="email"
              placeholder="jane@company.com"
              disabled={saving}
            />
          </AdminField>
          <AdminField label="Role">
            <AdminSelect
              value={form.role}
              onChange={update("role")}
              options={ADMIN_ROLES}
              disabled={saving}
            />
          </AdminField>
          <AdminField label="Department">
            <AdminSelect
              value={form.department}
              onChange={update("department")}
              options={["", ...ADMIN_DEPARTMENTS]}
              disabled={saving}
            />
          </AdminField>
          <AdminField label="Max Open Tickets" hint="Agent ticket limit. 0 = unlimited.">
            <AdminInput
              value={String(form.maxTicketLimit)}
              onChange={(v) => update("maxTicketLimit")(Number(v) || 0)}
              type="number"
              disabled={saving}
            />
          </AdminField>
        </div>
      </AdminModal>
    );
  }

---

ADIM 6 — JSX'de showCreateModal render et.
AdminSurface içinde, UserDrawer'dan ÖNCE şunu ekle:
  {showCreateModal && (
    <CreateUserModal
      onClose={() => setShowCreateModal(false)}
      onCreated={fetchUsers}
    />
  )}

---

ADIM 7 — UserDrawer'a Disable butonu ekle.
UserDrawer component içinde footer prop'una bak.
Footer'daki div'de, Cancel butonu ile Save changes arasına değil,
AYRI bir bölüm olarak sol tarafta (flex justify-between) ekle:

Footer'ın içini şöyle güncelle:
  <div className="flex items-center justify-between gap-2">
    {/* Sol: Disable */}
    <div>
      {user.status !== "Disabled" ? (
        <AdminGhostButton
          danger
          disabled={saving}
          onClick={async () => {
            if (!window.confirm(`Disable ${user.name}? They will no longer be able to log in.`)) return;
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
          Disable User
        </AdminGhostButton>
      ) : (
        <span className="text-xs font-medium text-amber-600">⚠ This user is disabled</span>
      )}
    </div>
    {/* Sağ: Cancel + Save */}
    <div className="flex gap-2">
      <AdminGhostButton onClick={onClose} disabled={saving}>Cancel</AdminGhostButton>
      <AdminPrimaryButton onClick={handleSave} disabled={!dirty || saving}>
        {saving ? "Saving…" : "Save changes"}
      </AdminPrimaryButton>
    </div>
  </div>

---

KURAL:
  - ADIM 1: Sadece import satırı değişecek
  - ADIM 2: Sadece AdminModal import'u eklenecek (yoksa)
  - ADIM 3: Sadece bir useState eklenecek
  - ADIM 4: "Add User" butonu eklenecek
  - ADIM 5: CreateUserModal fonksiyonu eklenecek (yeni, export yok)
  - ADIM 6: showCreateModal render eklenecek
  - ADIM 7: UserDrawer footer güncellencek (sadece layout + Disable butonu)
  Mevcut tablo/filtre/search/sort/drawer edit mantığına DOKUNMA.
```

#### Commit

```bash
git add .
git commit -m "feat(admin): create user modal with Keycloak invite + disable button in user drawer"
```

---

## Test Senaryoları (Sırayla Yap)

### Senaryo 1 — Yeni Kullanıcı Oluştur

1. Admin paneli aç: `http://localhost:5173/admin/users`
2. "+ Add User" butonuna tıkla
3. Form doldur:
   - Full Name: `Test Agent`
   - Email: `testagent@company.com`
   - Role: `Agent`
   - Max Open Tickets: `5`
4. "Create & Send Invite" butonuna tıkla
5. ✅ "User created. A password setup email has been sent..." mesajı çıkmalı
6. "Done" tıkla → tablo yenilenmeli, yeni kullanıcı listede görünmeli

### Senaryo 2 — E-postayı Gör ve Şifre Belirle

1. MailHog: `http://localhost:8025` aç
2. `testagent@company.com` için e-posta gelmiş mi? → Gelmeli
3. E-postada "Update Password" linki var → tıkla
4. Keycloak şifre belirleme sayfası açılmalı
5. Yeni şifre gir (ör: `Test123!`) → Submit
6. Keycloak `http://localhost:5173/login`'e yönlendirebilir veya başarı mesajı gösterir

### Senaryo 3 — Yeni Kullanıcı Giriş Yapıyor

1. `http://localhost:5173/login` → Continue with Keycloak
2. `testagent@company.com` + şifre → Giriş
3. ✅ `/agent/inbox`'a yönlendirilmeli (agent rolü)
4. Kullanıcı Destrova'yı kullanabilir durumda

### Senaryo 4 — Hata: Aynı Email Tekrar

1. Aynı email ile tekrar "Add User" dene
2. ✅ `"Bu e-posta adresi Keycloak'ta zaten kayıtlı: ..."` hata mesajı çıkmalı

### Senaryo 5 — Kullanıcı Disable Et

1. Listeden Test Agent'a tıkla → Drawer açılır
2. "Disable User" → Confirm et
3. ✅ Listede status "Disabled" olarak güncellendi
4. (Şu an Keycloak'ta hâlâ enabled — sadece DB status değişti)

### Senaryo 6 — Backend Log Kontrolü

Adım 1'den sonra backend terminal'de şunlar görünmeli:
```
Keycloak kullanıcı oluşturuldu: email=testagent@company.com, kcId=abc-123-def
Keycloak rol atandı: role=agent, kcId=abc-123-def
Şifre belirleme e-postası gönderildi: email=testagent@company.com
```

---

## Olası Hatalar ve Çözümleri

| Hata | Neden | Çözüm |
|------|-------|-------|
| `Connection refused localhost:8081` | Keycloak container çalışmıyor | `docker-compose up -d keycloak` |
| `Keycloak admin token alınamadı` | admin/admin yanlış veya master realm credentials farklı | docker-compose.yml'deki `KEYCLOAK_ADMIN_PASSWORD` kontrol et |
| `404 roles/agent` | ticket-realm'da `agent` rolü yok | Adım 0.2'yi yap |
| `Şifre e-postası gönderilemedi` | Keycloak SMTP ayarı eksik | Adım 0.1'i yap, `mailhog` host adını doğrula |
| `409 Conflict` | Email Keycloak'ta zaten var | Frontend'de hata mesajı gösteriyor, normal davranış |
| `ClassCastException Map` | HTTP body parsing | `((Number) body.get(...)).intValue()` kullanıldığından çözülmüş olmalı |

---

## Commit Özeti

```bash
git log --oneline
# Şöyle görünmeli:
# abc1234 feat(admin): create user modal with Keycloak invite + disable button in user drawer
# def5678 feat(backend): AdminUserController — admin CRUD with Keycloak provisioning  
# ghi9012 feat(backend): KeycloakAdminService — provision user with role and welcome email
# jkl3456 chore: add keycloak-admin config to application.yaml
```

---

## Sonraki İterasyon İçin Notlar (Şimdi Yapılmayacak)

| Özellik | Açıklama |
|---------|---------|
| Keycloak'ta da disabled et | `PUT .../users/{kcId}` body: `{ enabled: false }` |
| Resend invite | `POST /api/admin/users/{id}/resend-invite` → execute-actions-email tekrar |
| Kullanıcı sil | Soft delete yeterli, hard delete gerekmiyor |
| Şifre sıfırla | Admin, disable yerine şifre reset linki gönderebilsin |
| Prod credentials | `DESTROVA_KC_ADMIN_USER` / `DESTROVA_KC_ADMIN_PASS` env variable |
