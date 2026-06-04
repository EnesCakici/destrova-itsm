# Destrova — İyileştirme Planı v2
> Kaynak: `Destrova_eksik_tespit.md` + doğrudan kaynak kodu analizi  
> v2: P5–P7 mimari kararı netleştirildi, 4 kritik bug düzeltildi, P10 tam kapsama alındı.  
> P8 bu planda uygulanmayacak — bilinçli çıkarıldı.  
> Kod yazılmaz — sadece plan ve hazır promptlar.

---

## İçindekiler

| # | Problem | Alan | Risk | Durum |
|---|---------|------|------|-------|
| P1 | Customer statü filtresi | Frontend | Düşük | ✅ Tamamlandı |
| P2 | Customer ticket kapatma — Frontend | Frontend | Orta | ✅ Tamamlandı |
| P3 | Customer ticket kapatma — Backend | Backend | Orta | ✅ Tamamlandı |
| P4 | Agent tek ticket devri | Backend + Frontend | Orta | ✅ Tamamlandı |
| P5 | Ürün bazlı ekip sistemi | Backend (DB + API) | Yüksek | ⏳ Sırada |
| P6 | Ekip yönetimi — Manager Frontend | Frontend | Orta | ⏳ Sırada |
| P7 | Agent görünürlüğü ekip bazına çek | Backend | Yüksek | ⏳ Sırada |
| P8 | Mention sistemi | — | — | 🚫 Yapılmayacak |
| P9 | Attachment validasyonu | Backend | Düşük | ✅ Tamamlandı |
| P10 | Agent force-close + closure reason | Backend + Frontend | Orta | ✅ Tamamlandı |
| P11 | İş yükü limit uyarısı | Frontend | Düşük | ✅ Tamamlandı |
| P12 | Worklog Recent Activity scrollbar | Frontend | Düşük | ✅ Tamamlandı |
| P13 | Time Distribution çubukları | Frontend | Düşük | ✅ Tamamlandı |
| P14 | Worklog Activity Overview ürün filtresi | Frontend | Düşük | ✅ Tamamlandı |
| P15 | Admin kullanıcı yönetimi paneli | Backend + Frontend | Yüksek | ⏳ Sırada |
| P16 | Giriş sayfası modernizasyonu | Frontend | Orta | ⏳ Sırada |
| P17 | Bildirim paneli tasarım güncellemesi | Frontend | Düşük | ⏳ Sırada |

---

## Sıradaki Adımlar

```
P5 (Ekip DB + API) → P6 (Manager ekip UI) → P7 (Agent görünürlük) → P15 → P16 → P17
```

---

---

# MİMARİ KARAR KAYDI — P5/P6/P7

## Soru

"Agentlar kendi ekibindeki productlarla ilgilenecek ama mention sistemiyle dahil oldukları ticketlarda all products'ta çalışacak değil mi?"

## Karar: Hibrid Yaklaşım

Aşağıdaki tablo kesin tasarımı tanımlar:

| Erişim Türü | Kapsam | Değişiyor mu? |
|-------------|--------|--------------|
| Unassigned ticket havuzu (yeni ticket kapma) | **Sadece ekibin ürünleri** | ✅ P7 ile değişiyor |
| Kendisine atanmış ticketlar | Tüm ürünler | ❌ Değişmiyor |
| Bekleyen devir (`pendingTransferToAgentId`) | Tüm ürünler | ❌ Değişmiyor |
| @mention ile dahil olunan ticketlar | **Tüm ürünler** | ❌ Değişmiyor |
| Activity Overview / Worklog ürün filtresi | Ajanın **gerçek çalışmasından** türetilir | ❌ Değişmiyor (backend zaten `agentId` bazlı) |

**Gerekçe:**
- Unassigned havuz kısıtı → Uzmanlık dışı ticket'ı ajanın yanlışlıkla almasını engeller.
- Mention erişimi korunur → Cross-team iş birliği, @mention ile uzman çağırmak canlı kullanım senaryosu.
- Activity Overview geniş tutulur → Ajan mention üzerinden katkı verdiği ticket'ların da performansını takip edebilmeli; bu adil KPI ölçümü.

---

# KRİTİK BUG LİSTESİ — P5/P7 Öncesi Düzeltilmeli

## Bug-1: `TeamRepository.findByMembersId` derivasyon sorunu ⚠️ Yüksek

**Sorun:** Spring Data JPA `@ManyToMany` koleksiyonlar için `findByMembersId(Long)` türetme sözdizimini her durumda çözemez. Çalışırsa bile performans riski var.

**Çözüm:** `@Query` anotasyonu zorunlu.

**P5-C promptuna eklenmesi gereken düzeltme:**
```java
@Query("SELECT DISTINCT t FROM Team t JOIN t.members m WHERE m.id = :userId")
List<Team> findByMembersId(@Param("userId") Long userId);
```

---

## Bug-2: `TeamController` `Map<String, Long>` casting hatası ⚠️ Yüksek

**Sorun:** Jackson JSON `{"userId": 5}` → `Map<String, Long>` deserialize eder ama runtime'da `Integer` gelir → `ClassCastException`.

**Çözüm:** `Map<String, Object>` + `((Number) body.get("userId")).longValue()`

**P5-C promptuna eklenmesi gereken düzeltme:** Tüm `Map<String,Long>` parametrelerini `Map<String,Object>` yap ve değerleri `((Number) body.get("key")).longValue()` ile çevir.

---

## Bug-3: `findUnassignedByProductIds` null product sorunu ⚠️ Orta

**Sorun:** `t.product.id IN :productIds` JPQL sorgusu `product = null` olan ticketları sonuçtan **dışlar**. Ürünsüz ticket'lar ekipli ajanın havuzundan kaybolur.

**Tasarım kararı:** Ürünsüz ticketlar ekipsiz kavramına benzer — herkes görür.

**Çözüm:** Sorguya `OR t.product IS NULL` ekle.

**P7 promptuna eklenmesi gereken düzeltme:**
```java
@Query("SELECT t FROM Ticket t WHERE t.assigneeId IS NULL AND t.status <> :status " +
       "AND (t.product IS NULL OR t.product.id IN :productIds)")
List<Ticket> findUnassignedByProductIds(
    @Param("status") Status status,
    @Param("productIds") Collection<Long> productIds);
```

---

## Bug-4: `agentCanAccessTicket` ekip kısıtıyla tutarsız ⚠️ Orta

**Sorun:** `findAccessibleTicketsForAgent` (liste) ekip kısıtıyla daraltılacak. Ama `agentCanAccessTicket` (tekil GET) içinde:
```java
if (ticket.getAssigneeId() == null && ticket.getStatus() != Status.CLOSED) {
    return true;  // ← tüm unassigned'a erişim, ekip kontrolü yok
}
```
Ajan liste'de göremediği bir ticket'ı ID ile doğrudan GET yapabilir.

**Çözüm:** `agentCanAccessTicket` içindeki unassigned erişim bloğunu da ekip kontrolüne tabi tut.

**P7 promptuna eklenmesi gereken düzeltme:**
```java
// Mevcut:
if (ticket.getAssigneeId() == null && ticket.getStatus() != Status.CLOSED) {
    return true;
}
// Yeni:
if (ticket.getAssigneeId() == null && ticket.getStatus() != Status.CLOSED) {
    Set<Long> teamProductIds = teamService.getProductIdsForAgent(uid);
    if (teamProductIds.isEmpty()) return true;  // ekipsiz agent: tüm havuza erişim
    if (ticket.getProduct() == null) return true;  // ürünsüz ticket: herkese açık
    return teamProductIds.contains(ticket.getProduct().getId());
}
```

---

---

# P5 — Ürün Bazlı Ekip Sistemi (Backend — DB + API)

## Mevcut Durum (Koddan Okundu)

`User` entity'sinde `role`, `department` alanları var, ekip/team kavramı yok.

`findAccessibleTicketsForAgent` tüm unassigned ticketları gösteriyor.

Ticket entity'sinde `Product product` alanı mevcut.

## Commit Sırası

```
feat(db): add teams table V13 migration
feat(api): Team entity, repository, service, controller
```

---

### Cursor Prompt P5-A — Flyway Migration

```
Görev: Ekip sistemi için Flyway migration dosyası oluştur.

Dosya (yeni): backend/src/main/resources/db/migration/V13__create_teams.sql

İçerik:
  CREATE TABLE IF NOT EXISTS teams (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      description VARCHAR(500),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS team_products (
      team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      PRIMARY KEY (team_id, product_id)
  );

  CREATE TABLE IF NOT EXISTS team_members (
      team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      PRIMARY KEY (team_id, user_id)
  );

KURAL: Sadece bu dosya oluşturulacak.
```

---

### Cursor Prompt P5-B — Team Entity

```
Görev: Team.java entity oluştur.

Dosya (yeni): backend/src/main/java/com/ticket/backend/entity/Team.java

@Entity @Table(name = "teams")
@Data @NoArgsConstructor @AllArgsConstructor @Builder

Alanlar:
  @Id @GeneratedValue IDENTITY → Long id
  @Column(nullable=false, length=120) → String name
  @Column(length=500) → String description
  @CreationTimestamp @Column(name="created_at", updatable=false) → LocalDateTime createdAt

  @ManyToMany(fetch = FetchType.EAGER)
  @JoinTable(name="team_products",
    joinColumns=@JoinColumn(name="team_id"),
    inverseJoinColumns=@JoinColumn(name="product_id"))
  @Builder.Default
  private List<Product> products = new ArrayList<>();

  @ManyToMany(fetch = FetchType.LAZY)
  @JoinTable(name="team_members",
    joinColumns=@JoinColumn(name="team_id"),
    inverseJoinColumns=@JoinColumn(name="user_id"))
  @Builder.Default
  @ToString.Exclude @EqualsAndHashCode.Exclude
  private List<User> members = new ArrayList<>();

Import'lar: JPA, Lombok, LocalDateTime, List, ArrayList, CreationTimestamp, Product, User

KURAL: Sadece bu dosya oluşturulacak.
```

---

### Cursor Prompt P5-C — TeamRepository, TeamService, TeamController

```
Görev: 3 yeni dosya oluştur: TeamRepository, TeamService, TeamController.

⚠️ BUG-1 DÜZELTMESİ ve BUG-2 DÜZELTMESİ bu promptta uygulanacak.

Dosya 1 (yeni): backend/.../repository/TeamRepository.java
  @Repository interface TeamRepository extends JpaRepository<Team, Long>

  BUG-1 DÜZELTMESİ — @Query zorunlu:
  @Query("SELECT DISTINCT t FROM Team t JOIN t.members m WHERE m.id = :userId")
  List<Team> findByMembersId(@Param("userId") Long userId);

Dosya 2 (yeni): backend/.../service/TeamService.java
  @Service @RequiredArgsConstructor @Transactional
  Inject: TeamRepository teamRepository, UserRepository userRepository, ProductRepository productRepository

  getAllTeams() → teamRepository.findAll()
  
  getTeamById(Long id) → findById veya 404
  
  createTeam(Team team) → teamRepository.save(team)
  
  deleteTeam(Long teamId) → teamRepository.deleteById(teamId)
  
  addMember(Long teamId, Long userId):
    Team + User → addMember if not contains → save
  
  removeMember(Long teamId, Long userId):
    team.getMembers().removeIf(u -> u.getId().equals(userId)) → save
  
  addProduct(Long teamId, Long productId):
    Team + Product → add if not contains → save
  
  removeProduct(Long teamId, Long productId):
    team.getProducts().removeIf(p -> p.getId().equals(productId)) → save
  
  getProductIdsForAgent(Long userId):
    teamRepository.findByMembersId(userId) → flatMap products → Set<Long>
    // BOŞSA → agent ekipsiz, tüm havuz görünür (çağıran kod kontrol eder)

Dosya 3 (yeni): backend/.../controller/TeamController.java
  @RestController @RequestMapping("/api/teams") @RequiredArgsConstructor
  Inject: TeamService teamService

  BUG-2 DÜZELTMESİ — Map body'lerinde ((Number).longValue() kullan:
  
  @GetMapping → getAllTeams() @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
  
  @PostMapping → createTeam(@RequestBody Team team) @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
  
  @GetMapping("/{id}") → getTeamById(id)
  
  @DeleteMapping("/{id}") → deleteTeam(id) @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
  
  @PostMapping("/{id}/members") @RequestBody Map<String,Object> body:
    Long userId = ((Number) body.get("userId")).longValue(); → addMember
  
  @DeleteMapping("/{id}/members/{userId}") → removeMember
  
  @PostMapping("/{id}/products") @RequestBody Map<String,Object> body:
    Long productId = ((Number) body.get("productId")).longValue(); → addProduct
  
  @DeleteMapping("/{id}/products/{productId}") → removeProduct

KURAL: 3 yeni dosya oluşturulacak. Başka hiçbir dosyaya dokunma.
```

### Commit — P5

```bash
./mvnw compile  # hatasız olmalı
git add .
git commit -m "feat(db): teams migration V13"
git commit -m "feat(api): Team entity, TeamRepository, TeamService, TeamController"
```

---

---

# P6 — Manager Frontend: Ekip Yönetimi

## Mevcut Durum

Manager ekranlarında ekip yönetimi yok.

## Commit

```
feat(manager): team management UI
```

---

### Cursor Prompt P6-A — api.js'e team fonksiyonları ekle

```
Görev: services/api.js'e team API fonksiyonları ekle.

Dosya: @api.js

Mevcut fonksiyonların yanına ekle:
  export const getTeams = () => api.get("/teams");
  export const getTeamById = (id) => api.get(`/teams/${id}`);
  export const createTeam = (data) => api.post("/teams", data);
  export const deleteTeam = (id) => api.delete(`/teams/${id}`);
  export const addTeamMember = (teamId, userId) =>
    api.post(`/teams/${teamId}/members`, { userId });
  export const removeTeamMember = (teamId, userId) =>
    api.delete(`/teams/${teamId}/members/${userId}`);
  export const addTeamProduct = (teamId, productId) =>
    api.post(`/teams/${teamId}/products`, { productId });
  export const removeTeamProduct = (teamId, productId) =>
    api.delete(`/teams/${teamId}/products/${productId}`);

KURAL: Sadece bu satırlar eklenecek.
```

---

### Cursor Prompt P6-B — ManagerTeamsView component

```
Görev: ManagerTeamsView.jsx component'i oluştur.

Dosya (yeni): frontend/src/components/destrova/manager/components/ManagerTeamsView.jsx

Özellikler:
  - Mount: getTeams() → teams, getAgentCapacities() → agents, getActiveProducts() → products
  - Kart grid: her team için name, description, üye sayısı, ürün sayısı, "Manage" butonu
  - "Create Team" modal: name (zorunlu) + description → createTeam() → teams refresh
  - "Manage" panel/modal:
      members bölümü: liste + "Remove" buton (removeTeamMember) + "Add Member" select (agents)
      products bölümü: liste + "Remove" buton (removeTeamProduct) + "Add Product" select (products)
  - Tüm API çağrıları try-catch, loading, error
  - Refresh: her başarılı işlem sonrası getTeams()
  - Stil: mevcut manager ekranlarındaki destrova-* class'ları
  - Boş durum: ekip yoksa "No teams yet. Create your first team." metni

Import: useState, useEffect + tüm team api fonksiyonları + getAgentCapacities + getActiveProducts

KURAL: Sadece bu yeni dosya.
```

### Commit — P6

```bash
git add .
git commit -m "feat(manager): team management UI — create teams, assign agents and products"
```

---

---

# P7 — Agent Görünürlüğünü Ekip Bazına Çek

## Mevcut Durum (Koddan Okundu)

`findAccessibleTicketsForAgent`: tüm unassigned ticketlar her agenta görünüyor.
`agentCanAccessTicket`: unassigned ticketlara herkese erişim (ekip kontrolü yok).

## Commit

```
feat(backend): filter agent ticket pool and access by team product membership
```

---

### Cursor Prompt P7

```
Görev: Agent ticket havuzu ve GET erişimini ekip bazlı ürünlere göre filtrele.

Dosya 1: @TicketRepository.java
Dosya 2: @TicketService.java
Her ikisini context'e ekle.

⚠️ BUG-3 DÜZELTMESİ — ürünsüz ticket dahil edilmeli.
⚠️ BUG-4 DÜZELTMESİ — agentCanAccessTicket de filtrelenmeli.

ADIM 1 — TicketRepository'ye yeni metot ekle:

  @Query("SELECT t FROM Ticket t WHERE t.assigneeId IS NULL " +
         "AND t.status <> :status " +
         "AND (t.product IS NULL OR t.product.id IN :productIds)")
  List<Ticket> findUnassignedByProductIds(
      @Param("status") Status status,
      @Param("productIds") Collection<Long> productIds);

  Import: org.springframework.data.repository.query.Param, Collection

ADIM 2 — TicketService'e TeamService inject et:
  private final TeamService teamService;

ADIM 3 — findAccessibleTicketsForAgent içindeki şu bloğu bul:
  for (Ticket t : ticketRepository.findByAssigneeIdIsNullAndStatusNot(Status.CLOSED)) {
      byId.put(t.getId(), t);
  }

  ŞUNUNLA DEĞİŞTİR:
  Set<Long> teamProductIds = teamService.getProductIdsForAgent(uid);
  if (teamProductIds.isEmpty()) {
      for (Ticket t : ticketRepository.findByAssigneeIdIsNullAndStatusNot(Status.CLOSED)) {
          byId.put(t.getId(), t);
      }
  } else {
      for (Ticket t : ticketRepository.findUnassignedByProductIds(Status.CLOSED, teamProductIds)) {
          byId.put(t.getId(), t);
      }
  }

ADIM 4 — BUG-4 DÜZELTMESİ: agentCanAccessTicket metodunda şu bloğu bul:
  if (ticket.getAssigneeId() == null && ticket.getStatus() != Status.CLOSED) {
      return true;
  }

  ŞUNUNLA DEĞİŞTİR:
  if (ticket.getAssigneeId() == null && ticket.getStatus() != Status.CLOSED) {
      Set<Long> teamProductIds = teamService.getProductIdsForAgent(uid);
      if (teamProductIds.isEmpty()) return true;
      if (ticket.getProduct() == null) return true;
      return teamProductIds.contains(ticket.getProduct().getId());
  }

Import ekle (TicketService'e):
  import com.ticket.backend.service.TeamService;
  import java.util.Set;

KURAL: Sadece TicketRepository.java ve TicketService.java değişecek. Başka hiçbir dosyaya dokunma.
```

### Test — P7

| # | Senaryo | Beklenen |
|---|---------|---------|
| 1 | Ekipsiz agent → ticket listesi | Tüm unassigned görünür (eski davranış) |
| 2 | Ekipli agent (Product-A) → ticket listesi | Sadece Product-A unassigned görünür |
| 3 | Ürünsüz ticket → ekipli agent listesi | Ürünsüz ticket de görünür |
| 4 | Ekipli agent → Product-B ticket GET | 403 |
| 5 | Mention edilen agent → başka ürün ticket GET | 200 (mention erişimi korunuyor) |
| 6 | Agent kendi atanmış ticket'ı → GET | 200 (her zaman erişim) |

### Commit — P7

```bash
./mvnw compile
git add .
git commit -m "feat(backend): filter agent ticket pool and GET access by team product membership"
```

---

---

# P15 — Admin Kullanıcı Yönetimi Paneli

### Cursor Prompt P15-A — UserController

```
Görev: UserController.java oluştur — admin kullanıcı yönetimi.

Dosya (yeni): backend/.../controller/UserController.java

@RestController @RequestMapping("/api/admin/users") @RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')") — sınıf düzeyinde
Inject: UserRepository userRepository

Endpoint 1: GET / → findAll() → List<User>
Endpoint 2: GET /{id} → findById veya 404
Endpoint 3: PUT /{id} → @RequestBody Map<String,Object> body
  name, email, role (UserRole.valueOf), status, department, maxTicketLimit
  Her biri null kontrolüyle güncelle → save → return User
Endpoint 4: POST / → @RequestBody User user
  user.setStatus("Active") → save → return User
Endpoint 5: DELETE /{id} → status="Disabled", save → ResponseEntity.ok(saved)

KURAL: Sadece bu yeni dosya.
```

---

### Cursor Prompt P15-B — SecurityConfig

```
Görev: SecurityConfig.java'da /api/admin/** ADMIN rolüne ekle.

Dosya: @SecurityConfig.java

.anyRequest().authenticated() satırından ÖNCE:
  .requestMatchers("/api/admin/**").hasRole("ADMIN")

KURAL: Sadece bu satır.
```

---

### Cursor Prompt P15-C — Admin User Management UI

```
Görev: AdminUserManagementView.jsx component'i oluştur.

Dosya (yeni): frontend/.../admin/components/AdminUserManagementView.jsx

Özellikler:
  - Kullanıcı listesi: tablo (name, email, role badge, status, department, ticket limit)
  - Filtreleme: rol dropdown + status dropdown + arama (name/email)
  - "Add User" modal: name, email, role, department alanları
  - Satır edit: tıklayınca yan panel/modal — tüm alanlar düzenlenebilir
  - "Disable" butonu: status = Disabled (hard delete yok)
  - Role badge renkleri: ADMIN=kırmızı, MANAGER=mor, AGENT=mavi, CUSTOMER=yeşil
  - Status badge: Active=yeşil, Disabled=gri
  - API: /api/admin/users CRUD

KURAL: Sadece bu yeni dosya.
```

---

# P16 — Giriş Sayfası Modernizasyonu

### Cursor Prompt P16

```
Görev: Branded login sayfası ekle.

Dosya 1 (yeni): frontend/.../auth/LoginPage.jsx
  - Destrova logosu (ITSM_LOGO.jpeg, path'i ayarla)
  - "Sign in to Destrova" başlığı
  - "Continue to Login" butonu → keycloakInstance.login()
  - min-h-screen, flex center, white card, destrova-primary buton

Dosya 2: App.jsx veya routing dosyası
  Keycloak initialized && !authenticated → LoginPage render

KURAL: LoginPage.jsx (yeni) + routing dosyasında minimal değişiklik.
```

---

# P17 — Bildirim Paneli Tasarım Güncellemesi

### Cursor Prompt P17

```
Görev: NotificationCenter görsel tasarımını güncelle.

Dosya: @NotificationCenter.jsx

1. Panel: rounded-2xl, shadow-xl, w-80, max-h-[480px] overflow-y-auto
2. Header: sticky, backdrop-blur-sm, "Notifications" + unread badge + "Mark all read"
3. Item: okunmamış sol kenar 3px solid + bg-violet-50/50; okunmuş normal; 2 satır truncate; zaman sağda
4. Boş: "No notifications yet" merkezi
5. Zil badge: kırmızı, max "9+"

KURAL: Sadece JSX ve className'ler. State ve API mantığına dokunma.
```

---

## Commit Takvimi — Kalan İşler

```bash
git commit -m "feat(db): teams migration V13 — P5-A"
git commit -m "feat(api): Team entity service controller (Bug-1 Bug-2 fix) — P5-BC"
git commit -m "feat(manager): team management UI — P6"
git commit -m "feat(backend): agent pool filter by team products (Bug-3 Bug-4 fix) — P7"
git commit -m "feat(admin): user management API — P15"
git commit -m "feat(frontend): admin user management UI — P15"
git commit -m "feat(frontend): branded login page — P16"
git commit -m "feat(frontend): notification panel redesign — P17"
```
