# Destrova ITSM — Uygulama Planı v4 (FİNAL)
> v2 + v3 + SLA Mimari Revizyon Planı birleştirildi ve 8-9 günlük takvime bölündü.
> jBPM entegrasyon tamamlandı. Bu plan projeyi bitirir.
> Tarih: Mayıs 2026 · Kod yazma yok · Sadece Cursor prompt'ları ve el adımları.

---

## HIZLI BAŞVURU — TAKVIM ÖZETİ

| Gün | Ana Konu | Ne Yapılıyor |
|-----|----------|--------------|
| Gün 1 | SLA Altyapısı — DB + Entity | Flyway migration + Ticket entity güncellemesi |
| Gün 2 | jBPM Docker + BPMN Tasarımı | Container ayağa kaldır, BPMN çiz ve deploy et |
| Gün 3 | jBPM Backend Entegrasyonu | JbpmService + WebhookController + TicketService sinyalleri |
| Gün 4 | SLA Yeniden Hesaplama + Priority | updateTicket priority mantığı + jBPM restart akışı |
| Gün 5 | Altyapı: Kafka + OpenTelemetry | Docker servisler + OTel entegrasyonu |
| Gün 6 | Frontend: Bildirimler + Manager | NotificationCenter + ManagerTicketDetail düzeltmeleri |
| Gün 7 | Backend: Transfer + Validasyon + Test | Agent devir + Attachment validasyon + JUnit testleri |
| Gün 8 | SLA Scheduler Temizliği + Docker | SlaNotificationScheduler kaldır + restart politikası |
| Gün 9 | Genel Test + Git + Sunum Hazırlığı | Tüm testler, commit'ler, jüriye anlatım özeti |

---

## GENEL KURALLAR (Her Gün Geçerli)

1. **Cursor'a vermeden önce commit at.** Mevcut çalışan kodu kaybet.
2. **Her prompt'a `@DosyaAdı` ile ilgili dosyayı ekle.** Cursor context'siz çalışmaz.
3. **"Başka hiçbir dosyaya dokunma"** cümlesi her prompt'ta zorunlu.
4. **Compile kontrolü:** Backend için `./mvnw compile`, frontend için `npm run build`.
5. **Bir prompt bitince test et, sonra sıradakine geç.**
6. **jBPM çağrıları her zaman `@Async + try-catch`.** Exception fırlatılmaz, sadece `log.warn`.
7. **Commit mesajı formatı:** `feat:`, `fix:`, `test:`, `refactor:`, `chore:` prefix'i ile.

---

---

# GÜN 1 — SLA Altyapısı: DB + Entity Güncellemesi

**Amaç:** `totalPausedDurationMs` alanını veritabanına ve entity'ye ekle. Bu alan olmadan Gün 4'teki priority değişimi hesabı yapılamaz. Diğer her şeyden önce bu yapılmalı.

**Tahmini süre:** 1-2 saat

---

## Gün 1 — Adım 1: Flyway Migration

### Cursor Prompt G1-A1

```
Görev: Yeni bir Flyway migration dosyası oluştur.

Dosya: backend/src/main/resources/db/migration/V11__add_total_paused_duration.sql

İçeriği:
  ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS total_paused_duration_ms BIGINT DEFAULT 0;

Kural: Sadece bu dosya oluşturulacak. Başka hiçbir dosyaya dokunma.
Başka SQL ifadesi ekleme.
```

### Manuel Kontrol Sonrası
Backend'i başlat → log'da `V11__add_total_paused_duration.sql ... SUCCESS` görünüyor mu? Görünüyorsa devam.

---

## Gün 1 — Adım 2: Ticket Entity Güncellemesi

### Cursor Prompt G1-A2

```
Görev: Ticket.java entity'sine totalPausedDurationMs alanı ekle.

Dosya: backend/src/main/java/com/ticket/backend/entity/Ticket.java

Eklenecek alan (mevcut @Column alanlarının sonuna, closedAt veya customerRejectionNote'tan önce):
  @Column(name = "total_paused_duration_ms")
  private Long totalPausedDurationMs = 0L;

Kural: Sadece bu bir alan eklenecek. Başka hiçbir şeyi değiştirme, silme veya taşıma.
Import ekleme gerekmiyor.
```

### Commit — Gün 1

```bash
git add .
git commit -m "feat: add totalPausedDurationMs to tickets table and entity"
git push
```

---

---

# GÜN 2 — jBPM Docker + BPMN Tasarımı

**Amaç:** jBPM container'ı ayağa kaldır. TicketLifecycleProcess BPMN'ini Business Central'da tasarla ve deploy et.

**Tahmini süre:** 4-6 saat (BPMN tasarımı zaman alır)

---

## Gün 2 — Adım 1: Docker Compose — jBPM + Restart Politikası

### Cursor Prompt G2-A1

```
Görev: docker-compose.yml dosyasını iki şekilde güncelle.

Dosya: docker-compose.yml

DEĞİŞİKLİK 1 — jBPM servisi ekle (mevcut servisler listesinin sonuna):
  jbpm-server:
    image: jboss/jbpm-server-full:latest
    container_name: ticket_jbpm
    ports:
      - "8180:8080"
    environment:
      JBPM_DB_DRIVER: postgres
      JBPM_DB_HOST: postgres-db
      JBPM_DB_PORT: "5432"
      JBPM_DB_NAME: ticket_db
      JBPM_DB_USER: ticket_user
      JBPM_DB_PASSWORD: ticket_password
    depends_on:
      - postgres-db
    restart: unless-stopped

DEĞİŞİKLİK 2 — Mevcut jbpm-server servisi zaten varsa sadece restart: unless-stopped ekle.

Kural: Sadece docker-compose.yml değişecek. Başka hiçbir dosyaya dokunma.
```

### Manuel Adım — jBPM'i Başlat

```bash
docker-compose up -d jbpm-server
# 3-5 dakika bekle (ilk başlatma uzundur)
```

Tarayıcıda: `http://localhost:8180/business-central`
Giriş: `admin` / `admin`

Giriş başarılıysa devam.

---

## Gün 2 — Adım 2: BPMN Tasarımı (SEN Yapacaksın — Manuel)

Bu adımı Cursor yapmaz. Business Central UI'da yapılacak.

### 2a. Proje Oluştur

Business Central → Design → MySpace → Add Project
- Name: `destrova-ticket-process`
- GroupId: `com.destrova`
- ArtifactId: `destrova-ticket-process`
- Version: `1.0.0-SNAPSHOT`

### 2b. Process Asset Oluştur

Add Asset → Business Process
- Name: `TicketLifecycleProcess`
- Package: `com.destrova`

### 2c. Process Variables Tanımla

Properties paneli → Process Variables:

| Adı | Veri Tipi |
|-----|-----------|
| `ticketId` | java.lang.Long |
| `priority` | String |
| `currentStatus` | String |
| `slaStartedAt` | String |
| `slaDeadline` | String |
| `slaPaused` | Boolean |
| `totalPausedDuration` | java.lang.Long |
| `waitingStartedAt` | String |
| `resolvedAt` | String |
| `closedAt` | String |

### 2d. BPMN Akışı — Çizim Rehberi

Aşağıdaki akışı Business Central'da çiz:

```
[Start Event]
  ↓
[Parallel Gateway — Diverging]
  │                              │
  ▼ (Lifecycle Kolu)             ▼ (SLA Timer Kolu)
[UserTask: NEW]              [IntermediateCatchEvent: Timer]
  ↓ BoundarySignal: ASSIGNED     timeDuration Expression:
[ScriptTask: IN_PROGRESS]         #{priority == "HIGH" ? "PT4H" :
  script: currentStatus="IN_PROGRESS", slaPaused=false    priority == "MEDIUM" ? "PT24H" : "PT48H"}
  ↓                              ↓
[UserTask: IN_PROGRESS]      [ExclusiveGateway]
  ↓ BoundarySignal:              ├─ Condition: return slaPaused == true;
  WAITING_FOR_CUSTOMER           │    → [IntermediateCatchEvent: Signal SLA_BREACH_CHECK]
[ScriptTask: Waiting]            │         → [End]
  script: currentStatus="WAITING", slaPaused=true,
          waitingStartedAt=Instant.now().toString()        └─ Default
  ↓                                   → [ScriptTask: Report SLA Violation]
[UserTask: WAITING]                        script: HTTP POST webhook/jbpm/sla-breach
  ↓ BoundarySignal: RESUMED              → [End: SLA Breached]
[ScriptTask: RESUMED]
  script: currentStatus="IN_PROGRESS", slaPaused=false,
          totalPausedDuration += (Instant.now() - waitingStartedAt) ms
  → [Converging Gateway → UserTask: IN_PROGRESS]

[UserTask: IN_PROGRESS] ↓ BoundarySignal: RESOLVED
[ScriptTask: RESOLVED]
  script: currentStatus="RESOLVED", resolvedAt=Instant.now().toString(), slaPaused=true
  ↓
[UserTask: RESOLVED]
  ↓ BoundarySignal: CUSTOMER_APPROVED
[ScriptTask: CLOSED]
  script: currentStatus="CLOSED", closedAt=Instant.now().toString()
  → [Parallel Joining Gateway] → [End: Normal]

[UserTask: RESOLVED] ↓ BoundarySignal: CUSTOMER_REJECTED
[ScriptTask: Rejected]
  script: currentStatus="IN_PROGRESS", slaPaused=false,
          totalPausedDuration += (Instant.now() - resolvedAt) ms
  → [Converging Gateway → UserTask: IN_PROGRESS]

EventSubProcess (FORCE_CLOSED):
  StartEvent (Signal: FORCE_CLOSED) → ScriptTask: currentStatus="CLOSED" → TerminateEnd

EventSubProcess (PRIORITY_UPDATED):
  StartEvent (Signal: PRIORITY_UPDATED) → TerminateEnd
  (Amaç: Spring Boot process'i yeniden başlatacak — bu sub-process mevcut instance'ı kapatır)

EventSubProcess (PRIORITY_UPDATED_BREACH):
  StartEvent (Signal: PRIORITY_UPDATED_BREACH)
  → ScriptTask: HTTP POST webhook/jbpm/sla-breach → TerminateEnd
```

**Önemli Script Notları:**

`RESUMED` script'inde `totalPausedDuration` hesabı:
```java
String waitStr = (String) kcontext.getVariable("waitingStartedAt");
if (waitStr != null) {
    java.time.Instant start = java.time.Instant.parse(waitStr);
    java.time.Instant now = java.time.Instant.now();
    long diff = java.time.Duration.between(start, now).toMillis();
    Object totalObj = kcontext.getVariable("totalPausedDuration");
    long total = (totalObj != null) ? ((Number) totalObj).longValue() : 0L;
    kcontext.setVariable("totalPausedDuration", total + diff);
}
```

`Rejected` script'inde aynı mantık, `waitingStartedAt` yerine `resolvedAt` kullanılır.

`Report SLA Violation` script'i:
```java
Object tidObj = kcontext.getVariable("ticketId");
long safeTicketId = (tidObj != null) ? ((Number) tidObj).longValue() : 0L;
try {
    java.net.URL url = new java.net.URL("http://host.docker.internal:8080/api/webhook/jbpm/sla-breach");
    java.net.HttpURLConnection con = (java.net.HttpURLConnection) url.openConnection();
    con.setRequestMethod("POST");
    con.setRequestProperty("Content-Type", "application/json");
    con.setDoOutput(true);
    String json = "{\"ticketId\": " + safeTicketId + "}";
    try(java.io.OutputStream os = con.getOutputStream()) {
        os.write(json.getBytes("utf-8"));
    }
    System.out.println("SLA breach webhook: HTTP " + con.getResponseCode());
} catch(Exception e) {
    System.out.println("Webhook hata: " + e.getMessage());
}
```

### 2e. Deploy Et

Build → Build & Deploy

Başarılı olunca: Deploy → Execution Servers
Container ID'yi not al: `destrova-ticket-process_1.0.0-SNAPSHOT`

### Commit — Gün 2

```bash
git add .
git commit -m "chore: jBPM docker config + restart policy"
git push
```

> Not: BPMN Business Central'da, git'te yok. Container ID'yi bir yere not al.

---

---

# GÜN 3 — jBPM Backend Entegrasyonu

**Amaç:** JbpmService.java, WebhookController.java ve TicketService sinyallerini ekle.

**Tahmini süre:** 3-4 saat

---

## Gün 3 — Adım 1: RestTemplate Config

### Cursor Prompt G3-A1

```
Görev: RestTemplate bean'ini oluştur.

Dosya: backend/src/main/java/com/ticket/backend/config/RestTemplateConfig.java

İçeriği:
  @Configuration sınıfı
  @Bean RestTemplate restTemplate() → return new RestTemplate();

Kural: Sadece bu dosya oluşturulacak. Başka hiçbir dosyaya dokunma.
```

---

## Gün 3 — Adım 2: JbpmService.java

### Cursor Prompt G3-A2

```
Görev: JbpmService.java dosyası oluştur.

Dosya: backend/src/main/java/com/ticket/backend/service/JbpmService.java

Gereksinimler:
- @Service, @Slf4j, @RequiredArgsConstructor
- RestTemplate inject et (field: private final RestTemplate restTemplate)
- Tüm public metotlar @Async
- Tüm metotlar try-catch; hata → log.warn, exception asla fırlatılmaz

Sabitler (private static final):
  BASE_URL = "http://localhost:8180/kie-server/services/rest/server"
  CONTAINER_ID = "destrova-ticket-process_1.0.0-SNAPSHOT"
  PROCESS_ID = "destrova-ticket-process.TicketLifecycleProcess"
  USERNAME = "kieserver"
  PASSWORD = "kieserver1!"

Private yardımcı metot:
  HttpHeaders createAuthHeaders():
    headers.setBasicAuth(USERNAME, PASSWORD)
    return headers

Metot 1: startTicketProcess(Long ticketId, String priority, LocalDateTime slaDeadline)
  URL: BASE_URL + "/containers/" + CONTAINER_ID + "/processes/" + PROCESS_ID + "/instances/correlation/" + ticketId
  Method: POST
  Headers: createAuthHeaders() + ContentType=APPLICATION_JSON
  Body (Map<String, Object>):
    "ticketId" → ticketId
    "priority" → priority
    "currentStatus" → "NEW"
    "slaStartedAt" → Instant.now().toString()
    "slaDeadline" → slaDeadline.toString()
    "slaPaused" → false
    "totalPausedDuration" → 0L
  Response: ResponseEntity<String> — log.info("Started jBPM process for ticketId={}, instanceId={}", ticketId, response.getBody())

Metot 2: signalProcess(Long ticketId, String signalName, Map<String, Object> variables)
  URL: BASE_URL + "/containers/" + CONTAINER_ID + "/processes/instances/correlation/" + ticketId + "/signal/" + signalName
  Method: POST
  Headers: createAuthHeaders() + ContentType=APPLICATION_JSON
  Body: variables (boş Map olabilir)
  Response: Void — log.info("Signal '{}' sent for ticketId={}", signalName, ticketId)

Metot 3: signalProcess(Long ticketId, String signalName)
  signalProcess(ticketId, signalName, new HashMap<>()) çağır

Kural: Bu dosyadan başka hiçbir dosyaya dokunma.
Önemli not: correlation key (ticketId) kullanıldığı için process instance arama gerekmez — doğrudan correlation üzerinden sinyal gönderilir.
```

---

## Gün 3 — Adım 3: WebhookController.java

### Cursor Prompt G3-A3

```
Görev: WebhookController.java ve SecurityConfig güncellemesi.

Dosya 1 (yeni): backend/src/main/java/com/ticket/backend/controller/WebhookController.java

İçerik:
  @RestController
  @RequestMapping("/api/webhook")
  @RequiredArgsConstructor
  class WebhookController
  
  Inject: NotificationService notificationService
  
  Endpoint 1:
  @PostMapping("/jbpm/sla-breach")
  ResponseEntity<Void> slaBreachWebhook(@RequestBody Map<String, Object> body):
    Long ticketId = Long.valueOf(body.get("ticketId").toString())
    log.info("jBPM SLA breach webhook received for ticketId={}", ticketId)
    notificationService.notifySlaBreached(ticketId)
    (Metot adı yoksa buildSlaBreachedMessage veya notifySlaBreached — mevcut NotificationService'teki SLA ihlal metodunu kullan)
    return ResponseEntity.ok().build()

  Endpoint 2:
  @PostMapping("/jbpm/paused-duration")
  ResponseEntity<Void> pausedDurationUpdate(@RequestBody Map<String, Object> body):
    Long ticketId = Long.valueOf(body.get("ticketId").toString())
    Long pausedMs = Long.valueOf(body.get("totalPausedDurationMs").toString())
    log.info("Paused duration update: ticketId={}, ms={}", ticketId, pausedMs)
    ticketRepository.findById(ticketId).ifPresent(ticket -> {
        ticket.setTotalPausedDurationMs(pausedMs);
        ticketRepository.save(ticket);
    });
    return ResponseEntity.ok().build()
  
  Gerekli inject: NotificationService, TicketRepository

Dosya 2 (güncelleme): backend/src/main/java/com/ticket/backend/config/SecurityConfig.java
  Mevcut requestMatchers zincirinde, .authenticated() veya .permitAll() satırlarından ÖNCE ekle:
  .requestMatchers("/api/webhook/**").permitAll()

Kural: Sadece WebhookController.java (yeni) ve SecurityConfig.java (bir satır) değişecek.
```

---

## Gün 3 — Adım 4: TicketService Sinyalleri

**⚠️ En riskli adım. Önce commit at.**

```bash
git add .
git commit -m "chore: pre-signal-integration checkpoint"
git push
```

### Cursor Prompt G3-A4

```
Görev: TicketService.java'ya JbpmService inject et ve 6 noktaya sinyal/başlatma çağrısı ekle.

Dosya: @TicketService.java (dosyayı context'e ekle)

ADIM 1 — Field ekle:
Sınıf üstündeki mevcut `private final` field'ların sonuna:
  private final JbpmService jbpmService;

Import ekle (class'ın import bölümüne):
  import com.ticket.backend.service.JbpmService;

ADIM 2 — Aşağıdaki noktalara SADECE belirtilen satırları ekle.
Başka hiçbir şeyi değiştirme, silme veya yeniden düzenleme.

---

NOKTA 1 — createTicketForCustomer metodu içinde:
if (saved.getCreatedAt() != null) bloğunda, kafkaLogProducer.sendLog(...) çağrısının ALTINA:
  jbpmService.startTicketProcess(persisted.getId(), persisted.getPriority().name(), persisted.getSlaDueDate());
return'den önce gelen ikinci kafkaLogProducer.sendLog(...) çağrısının da ALTINA:
  jbpmService.startTicketProcess(saved.getId(), saved.getPriority().name(), saved.getSlaDueDate());

---

NOKTA 2 — assignTicket metodu içinde, son return hydrateTicketDisplayNames(saved) satırından HEMEN ÖNCE:
  jbpmService.signalProcess(saved.getId(), "ASSIGNED");

---

NOKTA 3 — updateTicketForUser metodu içinde:
Status değişimi kontrolü yapılan if (!Objects.equals(previousStatus, currentStatus)) bloğunun içinde,
kafkaLogProducer.sendLog(...) çağrısından SONRA (bloğun sonuna):
  if (currentStatus == Status.WAITING_FOR_CUSTOMER) {
      jbpmService.signalProcess(updated.getId(), "WAITING_FOR_CUSTOMER");
  } else if (currentStatus == Status.RESOLVED) {
      jbpmService.signalProcess(updated.getId(), "RESOLVED");
  } else if (currentStatus == Status.CLOSED) {
      jbpmService.signalProcess(updated.getId(), "FORCE_CLOSED");
  }

---

NOKTA 4 — addComment metodu içinde:
if (customerOnly && statusBeforeComment == Status.WAITING_FOR_CUSTOMER) bloğunun içinde,
notificationService.notifyStatusChanged(...) çağrısından SONRA:
  jbpmService.signalProcess(ticket.getId(), "RESUMED");

---

NOKTA 5 — approveResolution metodu içinde:
notificationService.notifyTicketClosed(...) çağrısından SONRA:
  jbpmService.signalProcess(saved.getId(), "CUSTOMER_APPROVED");

---

NOKTA 6 — rejectResolution metodu içinde:
notificationService.notifyCustomerRejected(...) çağrısından SONRA:
  jbpmService.signalProcess(saved.getId(), "CUSTOMER_REJECTED");

---

KURAL: Sadece bu 6 nokta değişecek. Başka hiçbir satırı değiştirme, silme veya yeniden düzenleme.
```

### Compile + Test

```bash
./mvnw compile
# Hata yoksa:
./mvnw spring-boot:run
```

Sonra:
1. Ticket oluştur → Business Central'da process instance görünüyor mu?
2. Agent ata → ASSIGNED sinyali gitti mi? (BC'de task IN_PROGRESS'e geçti mi?)
3. `docker stop ticket_jbpm` → Ticket yine de oluşturuluyor mu? (graceful degradation ✅)

### Commit — Gün 3

```bash
git add .
git commit -m "feat: jBPM full lifecycle orchestration — JbpmService, WebhookController, TicketService signals"
git push
```

---

---

# GÜN 4 — SLA Yeniden Hesaplama (Priority Değişimi)

**Amaç:** Priority değişiminde SLA sıfırdan başlamasın. Net geçen süre hesaplansın, jBPM process'i yeniden başlatılsın.

**Tahmini süre:** 3-4 saat

---

## Gün 4 — Bağlam: Mevcut Sorun

`TicketService.updateTicket()` içinde priority değişimi şu an şöyle çalışıyor:

```java
// MEVCUT — YANLIŞ:
existingTicket.setSlaDueDate(calculateSlaDueDate(existingTicket.getPriority(), existingTicket.getCreatedAt()));
// Bu createdAt + SLA_süresi hesaplıyor → SLA sıfırdan başlıyor
// totalPausedDurationMs hesaba katılmıyor
// jBPM'e haber verilmiyor
```

Olması gereken:
```
netGeçenSüre = (now - createdAt) - totalPausedDurationMs
kalanSüre    = yeniSLA - netGeçenSüre
kalanSüre ≤ 0 → anında breach
kalanSüre > 0 → newSlaDueDate = now + kalanSüre; jBPM process yeniden başlat
```

---

## Gün 4 — Adım 1: TicketService — Priority Değişimi Mantığı

**⚠️ Önce commit at:**
```bash
git add .
git commit -m "chore: pre-priority-sla-update checkpoint"
git push
```

### Cursor Prompt G4-A1

```
Görev: TicketService.java içindeki priority değişimi SLA hesaplama bloğunu değiştir.

Dosya: @TicketService.java

MEVCUT KOD (bu bloğu bul — updateTicket metodunda):
  if (updateRequest.getPriority() != null && !Objects.equals(updateRequest.getPriority(), previousPriority)
          && currentStatus != Status.RESOLVED && currentStatus != Status.CLOSED && existingTicket.getCreatedAt() != null) {
      existingTicket.setSlaDueDate(calculateSlaDueDate(existingTicket.getPriority(), existingTicket.getCreatedAt()));
  }

YENİ KOD (yukarıdaki if bloğunu tamamen şununla değiştir):
  if (updateRequest.getPriority() != null && !Objects.equals(updateRequest.getPriority(), previousPriority)
          && currentStatus != Status.RESOLVED && currentStatus != Status.CLOSED && existingTicket.getCreatedAt() != null) {
      recalculateSlaDueDate(existingTicket, existingTicket.getPriority(), now);
  }

Ayrıca aynı dosyaya private yardımcı metot ekle (calculateSlaDueDate metodunun HEMEN ALTINA):
  private void recalculateSlaDueDate(Ticket ticket, Priority newPriority, LocalDateTime now) {
      // Net geçen süre: (şimdi - oluşturulma) - toplam bekleme
      Duration rawElapsed = Duration.between(ticket.getCreatedAt(), now);
      long pausedMs = ticket.getTotalPausedDurationMs() != null ? ticket.getTotalPausedDurationMs() : 0L;
      Duration netElapsed = rawElapsed.minusMillis(pausedMs);
      if (netElapsed.isNegative()) netElapsed = Duration.ZERO;

      // Yeni priority için SLA süresi
      Duration newSlaDuration = switch (newPriority) {
          case HIGH   -> Duration.ofHours(4);
          case MEDIUM -> Duration.ofHours(24);
          case LOW    -> Duration.ofHours(48);
      };

      // Kalan süre
      Duration remaining = newSlaDuration.minus(netElapsed);

      if (remaining.isNegative() || remaining.isZero()) {
          // Anında ihlal
          ticket.setSlaDueDate(now);
          log.info("Priority changed to {} — SLA immediately breached. ticketId={}", newPriority, ticket.getId());
          notificationService.notifySlaBreached(ticket.getId());
          jbpmService.signalProcess(ticket.getId(), "PRIORITY_UPDATED_BREACH");
      } else {
          // Kalan süre ile yeni deadline
          ticket.setSlaDueDate(now.plus(remaining));
          String remainingIso = toIso8601Duration(remaining);
          log.info("Priority changed to {} — SLA remaining: {}. ticketId={}", newPriority, remainingIso, ticket.getId());
          // jBPM mevcut process'i kapat, yeni başlat
          jbpmService.signalProcess(ticket.getId(), "FORCE_CLOSED");
          jbpmService.startTicketProcess(ticket.getId(), newPriority.name(), ticket.getSlaDueDate());
      }
  }

  private String toIso8601Duration(Duration d) {
      long totalMinutes = d.toMinutes();
      long hours = totalMinutes / 60;
      long minutes = totalMinutes % 60;
      if (hours > 0 && minutes > 0) return "PT" + hours + "H" + minutes + "M";
      if (hours > 0) return "PT" + hours + "H";
      return "PT" + minutes + "M";
  }

KURAL: Sadece belirtilen if bloğunu değiştir ve iki yardımcı metot ekle.
Başka hiçbir şeyi değiştirme, silme veya yeniden düzenleme.
```

### Manuel Test — Priority Değişimi

Test senaryoları (her birini sırasıyla dene):

**Test 1 — HIGH → LOW (bekleme yok)**
- HIGH ticket oluştur, 1 dakika bekle
- Priority → LOW
- DB'de `sla_due_date` = şimdi + ~48 saat olmalı (1 dakika düşüldü) ✅

**Test 2 — MEDIUM → HIGH (5+ saat geçmişse anında breach)**
- MEDIUM ticket oluştur, `created_at`'i 5 saat öncesine manuel set et (DB'den)
- Priority → HIGH
- Anında SLA ihlal bildirimi geldi mi? ✅

**Test 3 — HIGH → MEDIUM (2 saat geçmişse 22 saat kalan)**
- HIGH ticket, 2 saat önceki `created_at`
- Priority → MEDIUM
- `sla_due_date` = şimdi + ~22 saat ✅

### Commit — Gün 4

```bash
git add .
git commit -m "feat: dynamic SLA recalculation on priority change with net elapsed time"
git push
```

---

---

# GÜN 5 — Altyapı: Kafka + OpenTelemetry

**Amaç:** Kafka ve OpenSearch Docker servisleri, OpenTelemetry distributed tracing.

**Tahmini süre:** 2-3 saat

---

## Gün 5 — Adım 1: Kafka + OpenSearch Docker (Eğer Yoksa)

**Önce kontrol et:** `docker-compose.yml`'de zaten `kafka`, `zookeeper`, `opensearch` var mı? Varsa bu adımı atla.

### Cursor Prompt G5-A1

```
Görev: docker-compose.yml'e Kafka, Zookeeper ve OpenSearch servisleri ekle.
Dosyada zaten varsa bu dosyaya dokunma ve dur.

Dosya: docker-compose.yml

Eklenecekler (mevcut servislerin sonuna):

  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    container_name: zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"
    healthcheck:
      test: ["CMD-SHELL", "echo srvr | nc localhost 2181 | grep -q Zookeeper"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s

  kafka:
    image: confluentinc/cp-kafka:7.7.7
    container_name: kafka
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    ports:
      - "9092:9092"
    healthcheck:
      test: ["CMD-SHELL", "kafka-broker-api-versions --bootstrap-server localhost:9092 || exit 1"]
      interval: 10s
      timeout: 10s
      retries: 6
      start_period: 40s

  opensearch:
    image: opensearchproject/opensearch:2
    container_name: opensearch
    environment:
      discovery.type: single-node
      OPENSEARCH_INITIAL_ADMIN_PASSWORD: S3cur3Pass!
      plugins.security.disabled: "true"
    ports:
      - "9200:9200"
      - "9600:9600"
    volumes:
      - opensearch-data:/usr/share/opensearch/data
    healthcheck:
      test: ["CMD-SHELL", "curl -fsS http://localhost:9200 >/dev/null || exit 1"]
      interval: 15s
      timeout: 10s
      retries: 10
      start_period: 60s

  opensearch-dashboards:
    image: opensearchproject/opensearch-dashboards:2
    container_name: opensearch-dashboards
    depends_on:
      - opensearch
    environment:
      DISABLE_SECURITY_DASHBOARDS_PLUGIN: "true"
      OPENSEARCH_HOSTS: "http://opensearch:9200"
    ports:
      - "5601:5601"

volumes bölümüne ekle:
  opensearch-data:

Kural: Sadece docker-compose.yml değişecek. Başka hiçbir dosyaya dokunma.
```

---

## Gün 5 — Adım 2: OpenTelemetry Config

### Cursor Prompt G5-A2

```
Görev: OpenTelemetry Collector config dosyası ve docker-compose entegrasyonu.

Dosya 1 (yeni): otel-collector-config.yaml (proje kökünde)
İçeriği:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317
        http:
          endpoint: 0.0.0.0:4318

  exporters:
    logging:
      verbosity: detailed
    opensearch:
      endpoints: ["http://opensearch:9200"]
      index: destrova-traces

  service:
    pipelines:
      traces:
        receivers: [otlp]
        exporters: [logging]
      metrics:
        receivers: [otlp]
        exporters: [logging]
      logs:
        receivers: [otlp]
        exporters: [logging]

Dosya 2 (güncelleme): docker-compose.yml
Servislere ekle:
  otel-collector:
    image: otel/opentelemetry-collector-contrib
    container_name: otel-collector
    command: ["--config", "/etc/otel/config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel/config.yaml:ro
    ports:
      - "4317:4317"
      - "4318:4318"
    depends_on:
      opensearch:
        condition: service_healthy
    restart: unless-stopped

Kural: Sadece otel-collector-config.yaml (yeni) ve docker-compose.yml değişecek.
```

### Commit — Gün 5

```bash
git add .
git commit -m "feat: Kafka + OpenSearch + OpenTelemetry infrastructure"
git push
```

---

---

# GÜN 6 — Frontend: Bildirimler + Manager Ticket Detail

**Amaç:** NotificationCenter gerçek API'ye bağlansın. Manager ticket detay ekranı düzeltmeleri.

**Tahmini süre:** 3-4 saat

---

## Gün 6 — Adım 1: NotificationCenter

### Cursor Prompt G6-A1

```
Görev: NotificationCenter component'ini gerçek API'ye bağla ve polling ekle.

Dosyalar:
  frontend/src/services/api.js  — 4 fonksiyon ekle
  frontend/src/components/destrova/shell/NotificationCenter.jsx  — API'ye bağla
  (Gerçek dosya yollarını Cursor bulsun, yoksa en yakın notification ile ilgili dosyayı kullan)

api.js'e eklenecek fonksiyonlar (mevcut fonksiyonların yanına):
  export const getNotifications = () => api.get('/notifications');
  export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);
  export const markAllNotificationsRead = () => api.patch('/notifications/read-all');
  export const getUnreadCount = () => api.get('/notifications/unread-count');

NotificationCenter.jsx — davranış:
  - useState: notifications=[], unreadCount=0, isOpen=false
  - useEffect (mount): getNotifications() çağır → setNotifications
  - useEffect (polling): setInterval ile her 30 saniyede getUnreadCount() → setUnreadCount; cleanup'ta clearInterval
  - Zil ikonuna tıklayınca isOpen toggle; getNotifications() yenile
  - Zil üzerinde: unreadCount > 0 ise kırmızı badge (sayıyı göster)
  - Dropdown liste: her bildirim için tıklanabilir item
    - Tıklayınca: markNotificationRead(notification.id)
    - relatedTicketId varsa: navigate veya onTicketOpen callback çağır
    - Okunmamış bildirimler koyu (bold veya farklı bg)
  - "Tümünü okundu işaretle" butonu: markAllNotificationsRead() çağır → notifications güncelle
  - Boş liste: "Henüz bildirim yok" metni
  - Stil: mevcut RoleTopbar veya shell component'lerdeki tema değişkenlerini koru

Kural: Sadece api.js ve NotificationCenter.jsx değişecek. Başka hiçbir dosyaya dokunma.
```

---

## Gün 6 — Adım 2: Manager Ticket Detail Düzeltmeleri

### Cursor Prompt G6-A2

```
Görev: Manager ticket detail ekranında 5 UI sorunu düzelt.

Dosya: @ManagerTicketDetailView.jsx (ya da mevcut manager ticket detail component'i — dosyayı context'e ekle)

Düzeltme F-04 — Upload:
  Manager rolünde file upload input disabled değilse zaten çalışıyor olabilir. Kontrol et: input disabled mı?
  Disabled ise kaldır. api.js'deki uploadAttachment fonksiyonunu kullan.

Düzeltme F-06 — Timeline sıralama ve stiller:
  Timeline item'larını authorType ve isInternal'a göre ayırt et:
  - authorType === "SYSTEM" → tam genişlik, gri arka plan, italic yazı, timestamp sağda
  - isInternal === true → sarı/amber arka plan, "Internal" badge ekle
  - authorType === "AGENT" && !isInternal → sağa hizalı konuşma balonu
  - authorType === "USER" → sola hizalı konuşma balonu

Düzeltme F-07 — Sticky composer:
  Mesaj yazma alanı (textarea + gönder butonu içeren container):
  CSS: position: sticky; bottom: 0; background: inherit; z-index: 10;
  (inline style veya Tailwind: className="sticky bottom-0 bg-white z-10")

Düzeltme F-08 — Attachment listesi:
  Component mount'unda: getAttachments(ticketId) çağır → attachments state'e yaz
  Her dosyayı listele: dosya adı, boyut, indirme butonu (downloadAttachment(id) çağır)

Düzeltme F-09 — Upload sonrası timeline:
  uploadAttachment başarılı olunca local state'e şu comment'i ekle:
  { authorName: "System", authorType: "SYSTEM", message: "Dosya eklendi: " + fileName, createdAt: new Date() }

Kural: Sadece bu dosya değişecek. Backend'e dokunma.
```

### Commit — Gün 6

```bash
git add .
git commit -m "feat: notification center real-time polling + manager ticket detail fixes"
git push
```

---

---

# GÜN 7 — Backend: Transfer + Attachment + Birim Testleri

**Amaç:** Agent tek ticket devri, attachment validasyon ve JUnit testleri.

**Tahmini süre:** 4-5 saat

---

## Gün 7 — Adım 1: Agent Ticket Devri

### Cursor Prompt G7-A1

```
Görev: Tek ticket devri özelliği ekle.

Dosya 1 (yeni): backend/src/main/java/com/ticket/backend/dto/TransferTicketRequest.java
  @Data @NoArgsConstructor @AllArgsConstructor @Builder
  private Long toAgentId;   // zorunlu
  private String transferReason;  // zorunlu: VACATION, OVERLOAD, EXPERTISE, KNOWLEDGE_GAP
  private String transferNote;    // opsiyonel

Dosya 2: @TicketController.java
  Eklenecek endpoint:
  @PostMapping("/{id}/transfer")
  @PreAuthorize("hasAnyRole('AGENT', 'MANAGER', 'ADMIN')")
  ResponseEntity<Ticket> transferTicket(@PathVariable Long id, @RequestBody TransferTicketRequest req, Authentication auth):
    return ResponseEntity.ok(ticketService.transferTicket(id, req, auth))

Dosya 3: @TicketService.java
  Eklenecek metot (sınıfın sonuna, deleteTicket metodundan önce):

  public Ticket transferTicket(Long ticketId, TransferTicketRequest request, Authentication auth) {
    Ticket ticket = ticketRepository.findById(ticketId)
        .orElseThrow(() -> new EntityNotFoundException("Ticket not found: " + ticketId));
    
    if (request.getToAgentId() == null) throw new IllegalArgumentException("toAgentId zorunludur.");
    if (request.getTransferReason() == null) throw new IllegalArgumentException("transferReason zorunludur.");
    
    // Agent sadece kendi ticket'ını devredebilir
    if (isAgentOnly(auth)) {
        Long uid = appUserService.requireUserId(auth);
        if (!uid.equals(ticket.getAssigneeId())) throw new AccessDeniedException("Sadece size atanmış ticket'ı devredebilirsiniz.");
    }
    
    Long previousAssigneeId = ticket.getAssigneeId();
    assignWithLimitCheck(ticket, request.getToAgentId());
    Ticket saved = ticketRepository.save(ticket);
    
    String agentName = userRepository.findById(request.getToAgentId()).map(User::getName).orElse("Agent #" + request.getToAgentId());
    String comment = "Ticket transferred to " + agentName + ". Reason: " + request.getTransferReason();
    if (request.getTransferNote() != null && !request.getTransferNote().isBlank()) {
        comment += " — " + request.getTransferNote().trim();
    }
    saveSystemComment(saved, comment);
    notificationService.notifyTicketTransferred(saved.getId(), request.getToAgentId());
    return hydrateTicketDisplayNames(saved);
  }

Kural: Sadece belirtilen 3 dosya değişecek. Mevcut transferAllTickets metoduna dokunma.
```

---

## Gün 7 — Adım 2: Attachment Validasyon

### Cursor Prompt G7-A2

```
Görev: Attachment upload endpoint'ine validasyon ekle.

Dosya 1: @TicketController.java
  POST /api/tickets/{id}/attachments endpoint'inin BAŞINA şu kontrolleri ekle:

  // 1. Uzantı kontrolü
  String originalFilename = file.getOriginalFilename();
  if (originalFilename == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dosya adı okunamadı.");
  String ext = originalFilename.toLowerCase();
  List<String> allowed = List.of(".jpg", ".jpeg", ".png", ".pdf", ".txt", ".log", ".zip", ".doc", ".docx");
  boolean validExt = allowed.stream().anyMatch(ext::endsWith);
  if (!validExt) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bu dosya türüne izin verilmiyor. İzin verilen: jpg, jpeg, png, pdf, txt, log, zip, doc, docx");

  // 2. Boyut kontrolü
  if (file.getSize() > 10L * 1024 * 1024) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dosya boyutu 10MB'ı aşamaz.");

  // 3. Sayı kontrolü
  long count = attachmentRepository.countByTicketId(id);
  if (count >= 5) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bir ticket'a en fazla 5 dosya eklenebilir.");

Dosya 2 (gerekirse): @AttachmentRepository.java
  Eğer countByTicketId(Long ticketId) metodu yoksa ekle:
  long countByTicketId(Long ticketId);

Kural: Sadece TicketController.java ve (gerekirse) AttachmentRepository.java değişecek.
```

---

## Gün 7 — Adım 3: Birim Testleri

### Cursor Prompt G7-A3

```
Görev: TicketService için JUnit 5 + Mockito birim testleri yaz.

Dosya (yeni): backend/src/test/java/com/ticket/backend/service/TicketServiceTest.java

@ExtendWith(MockitoExtension.class) kullan.

Mock'lar:
  @Mock TicketRepository ticketRepository
  @Mock UserRepository userRepository
  @Mock NotificationService notificationService
  @Mock KafkaLogProducer kafkaLogProducer
  @Mock AppUserService appUserService
  @Mock JbpmService jbpmService
  @Mock CommentRepository commentRepository
  @Mock WorklogRepository worklogRepository
  @Mock ProductRepository productRepository
  @InjectMocks TicketService ticketService

Test 1 — whenInvalidStatusTransition_thenThrowsException:
  Senaryo: CLOSED → IN_PROGRESS geçişi
  Kurulum: mevcut ticket status=CLOSED; updateRequest status=IN_PROGRESS
  Mock: ticketRepository.findById → ticket; userRepository.findById → agent
  Doğrula: assertThrows(IllegalStateException.class, ...)

Test 2 — whenAgentLimitExceeded_thenThrowsException:
  Mock: userRepository.findById(agentId) → User ile maxTicketLimit=3
  Mock: ticketRepository.countByAssigneeIdAndStatusIn → 3L (limit doldu)
  Çağrı: assignWithLimitCheck (private ise assignTicket üzerinden)
  Doğrula: assertThrows(IllegalStateException.class, ...)

Test 3 — whenApproveByNonOwner_thenThrowsAccessDenied:
  Ticket: creatorId=1L
  Auth: requireUserId → 2L (başka kullanıcı)
  Mock: ticketRepository.findById → ticket (status=RESOLVED)
  Doğrula: assertThrows(AccessDeniedException.class, () -> ticketService.approveResolution(ticketId, auth))

Test 4 — whenTransferSameAgent_thenThrowsException:
  TransferAllRequest: fromAgentId=1L, toAgentId=1L
  Doğrula: assertThrows(IllegalStateException.class, () -> ticketService.transferAllTickets(request))

Test 5 — whenCalculateSla_thenCorrectDueDate:
  Ticket: createdAt = LocalDateTime.now()
  HIGH priority → slaDueDate = createdAt + 4 saat
  MEDIUM priority → slaDueDate = createdAt + 24 saat
  LOW priority → slaDueDate = createdAt + 48 saat
  (calculateSlaDueDate private ise şu yolla test et: createTicketForCustomer üzerinden çağrısını verify et
   veya ReflectionTestUtils.invokeMethod(ticketService, "calculateSlaDueDate", Priority.HIGH, createdAt))

Test 6 — whenSlaNetElapsedExceedsNewSla_thenImmediateBreach:
  Ticket: createdAt = 6 saat önce; totalPausedDurationMs = 0; priority = LOW; status = IN_PROGRESS
  UpdateRequest: priority = HIGH (4 saat SLA, 6 saat geçmiş → anında breach)
  Mock: ticketRepository.findById → ticket; ticketRepository.save → ticket
  Çağrı: updateTicket(id, updateRequest, false, null)
  Doğrula: verify(notificationService).notifySlaBreached(ticketId)

Kural: Sadece bu test dosyası oluşturulacak. Başka hiçbir dosyaya dokunma.
```

### Commit — Gün 7

```bash
git add .
git commit -m "feat: agent ticket transfer + attachment validation"
git push

git add .
git commit -m "test: TicketService unit tests — status transition, SLA, access control"
git push
```

---

---

# GÜN 8 — SLA Scheduler Temizliği + Docker + SlaNotificationScheduler Kaldırma

**Amaç:** Çift SLA mekanizmasını sonlandır. jBPM tek otorite. Gereksiz scheduler kaldır.

**Tahmini süre:** 1-2 saat

---

## Gün 8 — Bağlam: Mevcut Durum

`SlaNotificationScheduler.java`:
- `@Scheduled` zaten **yorum satırında** → spring çalıştırmıyor
- Ama class `@Component` olarak Spring context'e yükleniyor → gereksiz
- `TicketService`'te referans yok → güvenle silinebilir

---

## Gün 8 — Adım 1: BackendApplication Kontrolü

### Cursor Prompt G8-A1

```
Görev: BackendApplication.java'yı kontrol et ve @EnableScheduling varsa kaldır.

Dosya: @BackendApplication.java

ADIM 1 — @EnableScheduling anotasyonu var mı bak.
ADIM 2 — Eğer @EnableScheduling varsa: Projede SlaNotificationScheduler dışında başka @Scheduled kullanan sınıf var mı tara.
  Varsa → @EnableScheduling kaldırma, sadece SlaNotificationScheduler.java'yı sil.
  Yoksa → @EnableScheduling kaldır.
ADIM 3 — SlaNotificationScheduler.java dosyasını sil:
  backend/src/main/java/com/ticket/backend/scheduler/SlaNotificationScheduler.java

Kural: Sadece BackendApplication.java (gerekirse bir satır) ve SlaNotificationScheduler.java (silme) etkilenecek.
Başka hiçbir dosyaya dokunma.
```

---

## Gün 8 — Adım 2: SlaWarning Bildirimi — jBPM'e Taşı (Opsiyonel)

> Bu adım opsiyoneldir. Eğer `SlaNotificationScheduler` silindikten sonra `notifySlaWarning` işlevselliğini de (SLA %80 dolduğunda uyarı) korumak istersen, BPMN'e ikinci bir timer ekle.

**BPMN'e ekleme (Business Central'da):**
- SLA timer koluna paralel bir ikinci timer ekle:
  - HIGH: PT3H12M (4 saatin %80'i)
  - MEDIUM: PT19H12M (24 saatin %80'i)
  - LOW: PT38H24M (48 saatin %80'i)
- Bu timer dolunca → yeni webhook endpoint: `POST /api/webhook/jbpm/sla-warning`

### Cursor Prompt G8-A2 (Opsiyonel)

```
Görev: SLA uyarı webhook endpoint'ini ekle.

Dosya: @WebhookController.java

Yeni endpoint ekle (mevcut endpoint'lerin yanına):
  @PostMapping("/jbpm/sla-warning")
  ResponseEntity<Void> slaWarningWebhook(@RequestBody Map<String, Object> body):
    Long ticketId = Long.valueOf(body.get("ticketId").toString())
    log.info("jBPM SLA warning webhook received for ticketId={}", ticketId)
    // NotificationService'teki SLA uyarı metodunu çağır (buildSlaWarningMessage veya benzeri)
    notificationService.notifySlaWarning(ticketId)
    return ResponseEntity.ok().build()

Kural: Sadece WebhookController.java değişecek. Başka hiçbir dosyaya dokunma.
```

### Commit — Gün 8

```bash
git add .
git commit -m "refactor: remove SlaNotificationScheduler — jBPM is single SLA authority"
git push
```

---

---

# GÜN 9 — Genel Test + Sunum Hazırlığı

**Amaç:** Tüm senaryoları test et. Git geçmişini düzenle. Jüriye anlatım notlarını hazırla.

**Tahmini süre:** 4-5 saat

---

## Gün 9 — Adım 1: Entegrasyon Test Listesi

Tüm sistemi `docker-compose up -d` ile başlat. Aşağıdaki her testi sırasıyla uygula.

### jBPM Testleri

| # | Test | Beklenen |
|---|------|---------|
| J1 | Customer ticket oluştur | BC'de process instance görünür |
| J2 | Agent ata | BC'de ASSIGNED sinyali işlendi, task IN_PROGRESS'e geçti |
| J3 | Status → WAITING_FOR_CUSTOMER | BC'de slaPaused=true |
| J4 | Müşteri yorum yap | BC'de slaPaused=false, totalPausedDuration > 0 |
| J5 | Status → RESOLVED | BC'de slaPaused=true |
| J6 | Müşteri reddet | BC'de slaPaused=false, totalPausedDuration güncellendi |
| J7 | Müşteri onayla | BC'de process CLOSED |
| J8 | Manager zorla kapat | BC'de FORCE_CLOSED, process sonlandı |
| J9 | Timer PT1M yap, 1 dk bekle | Webhook çağrıldı, SLA breach bildirimi geldi |
| J10 | docker stop ticket_jbpm | Ticket yine oluşturuluyor, log.warn var, exception yok |

### SLA Priority Testleri

| # | Senaryo | Beklenen |
|---|---------|---------|
| P1 | HIGH → LOW (1h geçmiş, 0 bekleme) | remaining=47h, slaDueDate=now+47h |
| P2 | LOW → HIGH (20h geçmiş, 15h bekleme) | netElapsed=5h, remaining=-1h → anında breach |
| P3 | MEDIUM → HIGH (5h geçmiş, 0 bekleme) | remaining=-1h → anında breach |
| P4 | HIGH → MEDIUM (2h geçmiş, 0 bekleme) | remaining=22h, slaDueDate=now+22h |
| P5 | MEDIUM → LOW (10h geçmiş, 2h bekleme) | remaining=40h |
| P6 | LOW → MEDIUM (30h geçmiş, 0 bekleme) | remaining=-6h → anında breach |

### Frontend Testleri

| # | Test | Beklenen |
|---|------|---------|
| F1 | Ticket SLA ihlal edince | Zil ikonunda badge sayısı artar |
| F2 | Zil'e tıkla | Dropdown açılır, bildirimler listelenir |
| F3 | Bildirime tıkla | Okundu işaretlendi, ticket açıldı |
| F4 | "Tümünü okundu işaretle" | Tüm bildirimler okundu, badge sıfırlandı |
| F5 | Manager ticket detay | Timeline sistematik sıralı |
| F6 | Attachment upload | 5. dosya sonrası hata mesajı |
| F7 | 10MB+ dosya yükle | Hata mesajı görünüyor |
| F8 | Yasaklı uzantı yükle | Hata mesajı görünüyor |

---

## Gün 9 — Adım 2: Sunum — Jüriye Anlatım Notları

### Mimari Karar: Tek Otorite Prensibi

**Ne değişti ve neden:**
Sistemde SLA ihlal tespiti için önce iki paralel mekanizma vardı — jBPM timer webhook'u ve Spring Boot `@Scheduled` tarayıcısı. Bu "duplicate notification" riskini ve hangisinin doğru kaynak olduğu belirsizliğini yaratıyordu.

**Karar:** jBPM, iş sürecinin sahibidir. SLA yönetiminin tek otoritesidir. Spring Boot sadece iş mantığını yürütür. Bu **Separation of Concerns** ilkesinin doğrudan uygulamasıdır.

### Mimari Karar: Priority Değişiminde Dinamik SLA

**Problem:** Priority değişince SLA sıfırdan başlıyordu. Bu ajana haksızlık: 3 saat çalışmış ajan HIGH'dan MEDIUM'a düşürünce sanki hiç çalışmamış gibi 24 saat SLA başlıyordu.

**Çözüm:**
```
netGeçenSüre = (şimdi − oluşturulma) − toplamBekleme
kalanSüre    = yeniSLA − netGeçenSüre
```

Formül tüm 6 priority kombinasyonu için aynı şekilde çalışır.

### Mimari Karar: totalPausedDuration — Adil SLA

**Neden önemli:** WAITING_FOR_CUSTOMER ve RESOLVED durumlarında ajan beklemektedir. Bu süreyi SLA'ya saymak ajana haksızlık olur. Müşteri geç yanıt verirse ajan cezalanmamalı.

`totalPausedDurationMs` DB'de tutulur. jBPM de aynı değeri process variable olarak takip eder. İki kaynak tutarlı.

### BPMN Diyagramında Gösterilecekler

Jüriye Business Central'da gösterilecekler:
1. Process instance listesi — her ticket'a karşılık gelen instance
2. Bir instance'a tıkla → mevcut durumu göster (hangi User Task'ta)
3. Process variables listesi — `slaPaused`, `totalPausedDuration`, `currentStatus`
4. Timer olayını göster — SLA Monitor kolu
5. Bir instance'ın tamamlanmış geçmiş adımlarını göster

---

## Gün 9 — Final Commit Listesi

```bash
# Eğer düzgün commit atmak istersen son durumu tek commit'e topla:
git add .
git commit -m "chore: final state — all features complete before presentation"
git push

# Git log'unu temiz görmek için:
git log --oneline
```

---

---

# GİT COMMIT TAKVİMİ — TÜM GÜNLER

| Gün | Commit Mesajı |
|-----|--------------|
| Gün 1 | `feat: add totalPausedDurationMs to tickets table and entity` |
| Gün 2 | `chore: jBPM docker config with restart policy` |
| Gün 3 (ara) | `chore: pre-signal-integration checkpoint` |
| Gün 3 | `feat: jBPM full lifecycle orchestration — JbpmService, WebhookController, TicketService signals` |
| Gün 4 (ara) | `chore: pre-priority-sla-update checkpoint` |
| Gün 4 | `feat: dynamic SLA recalculation on priority change with net elapsed time` |
| Gün 5 | `feat: Kafka + OpenSearch + OpenTelemetry infrastructure` |
| Gün 6 | `feat: notification center real-time polling + manager ticket detail fixes` |
| Gün 7a | `feat: agent ticket transfer + attachment validation` |
| Gün 7b | `test: TicketService unit tests — status transition, SLA, access control` |
| Gün 8 | `refactor: remove SlaNotificationScheduler — jBPM is single SLA authority` |
| Gün 9 | `chore: final state — all features complete before presentation` |

---

---

# CURSOR KULLANIM KURALLARI (Her Oturumda Hatırlat)

1. **Her prompt tek iş.** İki kritik dosyayı aynı anda değiştirme.
2. **Dosyayı context'e ekle.** `@TicketService.java` gibi. Context olmadan Cursor yanlış dosyada çalışır.
3. **"Başka hiçbir dosyaya dokunma"** her prompt'ta zorunlu cümle.
4. **Compile önce.** Backend: `./mvnw compile`. Frontend: `npm run build`. Hata varsa o adımda dur.
5. **Vermeden önce commit.** Cursor'a verdiğin her dosyayı önceden commit'le.
6. **En riskli adımlar:** G3-A4 (TicketService 500+ satır), G4-A1 (priority mantığı). Bu ikisinde ekstra dikkat.
7. **jBPM adımları sıralı:** G3-A1 → G3-A2 → G3-A3 → G3-A4. Sırayı bozma.
8. **Cursor hata yaparsa:** Dosyayı git'ten geri al (`git checkout -- dosya.java`), prompt'u daha küçük parçaya böl.

---

# ERTELENENLER / YAPILMAYACAKLAR

| Özellik | Neden |
|---------|-------|
| i18n Türkçe dil desteği | Büyük refactor, 9 ayrı prompt, sunum öncesi riski yüksek |
| 2FA | Keycloak config riski, düşük jüri önceliği |
| HTTPS / Nginx | Lokal demo için gerekli değil |
| Full-text search | Büyük değişiklik, düşük görünürlük |
| Customer UI küçük renk düzeltmeleri (F-01, F-02, F-03) | Kritik değil, zaman kalırsa |

---

*Bu plan SlaNotificationScheduler.java, TicketService.java, JbpmService.java, Ticket.java, application.yaml, docker-compose.yml ve TicketLifecycleProcess.bpmn dosyalarının doğrudan kaynak kodu incelenerek hazırlanmıştır. v4 = SLA Mimari Revizyon Planı + v2 + v3 birleşimi.*
