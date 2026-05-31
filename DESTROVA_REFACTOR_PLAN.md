# DESTROVA — jBPM Single Source of Truth Refactoring Plan
> v1.1 — Faz 2 Backend bölümü gerçek kaynak kodu incelenerek yeniden yazıldı.
> BPMN (TicketLifecycleProcess.bpmn) + TicketService.java doğrudan okundu.

---

## İçindekiler

1. [Faz 1 Action API — OpenAPI Referansı](#1-faz-1-action-api--openapi-referansı)
2. [BPMN Script Task Şablonları](#2-bpmn-script-task-şablonları)
3. [Cursor Promptları — Faz 0 Backend](#3-cursor-promptları--faz-0-backend)
4. [Cursor Promptları — Faz 1 Backend](#4-cursor-promptları--faz-1-backend)
5. [Cursor Promptları — Faz 1 Frontend (destrova only)](#5-cursor-promptları--faz-1-frontend-destroya-only)
6. [Cursor Promptları — Faz 2 Backend (workflow silme)](#6-cursor-promptları--faz-2-backend-workflow-silme)
7. [Manuel Adımlar (Business Central)](#7-manuel-adımlar-business-central)
8. [Test Checklist](#8-test-checklist)
9. [Tespit Edilen Buglar](#9-tespit-edilen-buglar)

---

## 1. Faz 1 Action API — OpenAPI Referansı

*(Değişmedi — önceki sürümle aynı)*

**Base URL:** `http://localhost:8080`
**Auth:** Bearer JWT (Keycloak)
**Başarı:** `202 Accepted`

Endpoint listesi: assign, unassign, wait-for-customer, resume, resolve, close, change-priority, approve, reject, assign-to-me — önceki versiyonla aynı.

---

## 2. BPMN Script Task Şablonları

*(Değişmedi — önceki sürümle aynı)*

---

## 3. Cursor Promptları — Faz 0 Backend

*(Değişmedi — Adım 0.1 → 0.8 önceki sürümle aynı)*

---

## 4. Cursor Promptları — Faz 1 Backend

*(Değişmedi — Adım 1.1 → 1.5 önceki sürümle aynı)*

---

## 5. Cursor Promptları — Faz 1 Frontend (destrova only)

*(Değişmedi — Adım F1 → F6 önceki sürümle aynı)*

---

## 6. Cursor Promptları — Faz 2 Backend (workflow silme)

> **⚠️ GÜVENLİ UYGULAMA KURALLARI**
> - Faz 1 shadow=false + 10 ticket sıfır drift doğrulandıktan sonra başla.
> - Her adım ayrı commit. Bir adım derlenmezse geri al, bir sonrakine geçme.
> - Adımlar sırasıyla uygulanmalı — bağımlılık zinciri var.
> - Cursor'a her adımda **sadece o adımla ilgili dosyaları** context olarak ver.
> - Satır numarası verme — kod pattern'i ver. Satır numaraları kayıyor.

---

### Ön Koşul Kontrol Listesi (Faz 2'ye girmeden önce tamamlanmalı)

Bu kontrolleri tek tek yap. Hepsi ✅ olmadan Adım 2.1'e başlama.

++++**Kontrol K-1 — Webhook'lar DB'ye yazıyor mu?**
    ```
    application.yaml'da şu değeri kontrol et:
      destrova.workflow.shadow-projection: false

    false ise ✅. true ise önce shadow=false yap, 10 ticket test et, sonra devam.
    ```

++++**Kontrol K-2 — `TicketProjectionService.applySlaUpdated` doğru parse ediyor mu?**
    ```
    Şunu kontrol et: applySlaUpdated içinde slaDueDate String'i nasıl parse ediliyor?

    jBPM'den gelen format: LocalDateTime.toString() → "2026-05-28T12:00:00" (ISO_LOCAL_DATE_TIME)
    Doğru parse: LocalDateTime.parse(slaDueDate) veya LocalDateTime.parse(slaDueDate, DateTimeFormatter.ISO_LOCAL_DATE_TIME)
    Yanlış parse: Instant.parse(slaDueDate) → PATLAR (Z suffix yok)

    Eğer Instant.parse kullanılıyorsa → önce düzelt:
      LocalDateTime ldt = LocalDateTime.parse(slaDueDate);
      ticket.setSlaDueDate(ldt);
    Bu düzeltmeyi ayrı commit ile yap.
    ```

++++**Kontrol K-3 — `startTicketProcess` null-safe mi?**
```
    JbpmService.startTicketProcess içinde şu satırı bul:
      body.put("slaDeadline", slaDeadline.toString());

    slaDeadline null gelirse NPE → @Async sessizce yutulur → jBPM process başlamaz.

    Düzeltme: String slaDeadlineStr = slaDeadline != null ? slaDeadline.toString() : "";
    body.put("slaDeadline", slaDeadlineStr);

    Bu düzeltmeyi ayrı commit ile yap ÖNCE.
    ```

K3 SONRASINDA ŞU DEĞİŞİKLİĞİ YAPTIK: 

body.put("slaDeadline", slaDeadline.toString()); YERİNE 

body.put("slaDeadline", slaDeadline != null ? slaDeadline.toString() : ""); BU  SATIRI YAZDIK.


++++**Kontrol K-4 — BPMN `Notify Priority SLA Updated` script'i doğru mu?**
      ```
      Business Central → TicketLifecycleProcess → "Notify Priority SLA Updated" script task'ı aç.

      Script şu anda "slaDeadline" process variable'ını webhook payload'a yazıyor.
      Sorun: PRIORITY_UPDATED sinyali gelince priority değişiyor ama "slaDeadline" variable GÜNCELLENMEYEBILIR.
      jBPM signal variables ile slaDeadline güncelleniyorsa sorun yok.
      Güncellenmiyor ise webhook yanlış (eski) slaDueDate'i Spring Boot'a gönderiyor.

      Test: Priority değiştir → jBPM process instance variables'ı BC'den kontrol et → slaDeadline güncel mi?
      ```

---
------------------------------------------------------------------------------------------------------------------------------------
------------------------------------------------------------------------------------------------------------------------------------
-----------------------------------------------BURDAN DEVAM EDİCEZ 29 MAYIS SABAHI--------------------------------------------------
------------------------------------------------------------------------------------------------------------------------------------
------------------------------------------------------------------------------------------------------------------------------------

### Adım 2.0 — `startTicketProcess` null-safe düzeltmesi

**Bu adım bağımsız, öncesinde yapılabilir — Faz 1'de de geçerli.**

```
Görev: JbpmService.java'da startTicketProcess metodunu null-safe yap.

Dosya: @JbpmService.java

Şu satırı bul (startTicketProcess metodu içinde):
  body.put("slaDeadline", slaDeadline.toString());

Şununla değiştir:
  body.put("slaDeadline", slaDeadline != null ? slaDeadline.toString() : "");

Kural: Sadece bu tek satır değişecek. Başka hiçbir şeye dokunma.
```

```bash
git add .
git commit -m "fix: startTicketProcess null-safe slaDeadline"
```

---

### Adım 2.1 — `validateStatusTransition` kaldır

**Bağımlılık:** Faz 1 Action API çalışıyor, yeni action endpoint'leri BPMN sinyal gönderip status değişimine yol açıyor. Status geçiş kuralı artık jBPM'de.

```
Görev: TicketService.java'dan validateStatusTransition metodunu ve tüm çağrılarını kaldır.

Dosya: @TicketService.java

ADIM 1 — Şu metodun tamamını sil:
  private void validateStatusTransition(Status from, Status to) { ... }
  (switch/case içindeki if (!isValid) throw new IllegalStateException bloğu dahil)

ADIM 2 — updateTicket metodu içinde şu çağrıyı bul ve sil (koşul bloğunun içinde):
  validateStatusTransition(previousStatus, requestedStatus);
  Sadece bu satırı sil. Çevresindeki if bloğunu ve existingTicket.setStatus(requestedStatus) satırını koru.

ADIM 3 — Başka hiçbir yerde validateStatusTransition çağrısı olup olmadığını kontrol et (IDE'de "Find Usages").
  Varsa onları da sil.

Kural: Sadece validateStatusTransition metodu ve çağrıları kaldırılacak. Başka hiçbir şeye dokunma.
Not: isDirectCloseReason ve closingWithExplicitReason mantığına dokunma — bunlar farklı şey.
```

**Compile kontrol:**
```bash
./mvnw compile
```

**Hata yoksa commit:**
```bash
git add .
git commit -m "refactor(faz2): remove validateStatusTransition — jBPM is authoritative"
```

---

### Adım 2.2a — WAITING SLA extension bloğunu kaldır

**Bu tek başına küçük ve güvenli bir adım. recalculateSlaDueDate'den ÖNCE yap.**

**Neden ayrı adım:** Bu blok ile jBPM RESUMED webhook arasında double-write var. jBPM RESUMED script'i `/sla-updated` webhook'u atıyor ve `TicketProjectionService` `slaDueDate`'i güncelliyor. Spring Boot'un ayrıca aynı alanı güncellemesi gerekmiyor.

```
Görev: TicketService.java updateTicket metodundan WAITING→IN_PROGRESS SLA uzatma bloğunu kaldır.

Dosya: @TicketService.java

updateTicket metodu içinde şu bloğu bul ve tamamını sil:
  if (previousStatus == Status.WAITING_FOR_CUSTOMER && currentStatus == Status.IN_PROGRESS
          && existingTicket.getSlaDueDate() != null && existingTicket.getUpdatedAt() != null) {
      Duration waitingDuration = Duration.between(existingTicket.getUpdatedAt(), now);
      if (!waitingDuration.isNegative()) {
          existingTicket.setSlaDueDate(existingTicket.getSlaDueDate().plus(waitingDuration));
      }
  }

Bu if bloğunun tamamı silinecek (açılış { ve kapanış } dahil, 6 satır).

Aynı şekilde addComment metodu içinde şu bloğu bul ve sil:
  if (customerOnly && statusBeforeComment == Status.WAITING_FOR_CUSTOMER) {
      LocalDateTime n = LocalDateTime.now();
      if (ticket.getSlaDueDate() != null && ticket.getUpdatedAt() != null) {
          Duration w = Duration.between(ticket.getUpdatedAt(), n);
          if (!w.isNegative()) ticket.setSlaDueDate(ticket.getSlaDueDate().plus(w));
      }
      ticket.setStatus(Status.IN_PROGRESS);
      ticketRepository.save(ticket);
      ...
  }
Dikkat: Bu bloğun içindeki status değişimi (IN_PROGRESS), notificationService ve jbpmService.signalProcess çağrılarını KORU.
Sadece SLA uzatma kısmını (Duration.between ile slaDueDate.plus olan 4 satırı) sil.
ticket.setStatus(Status.IN_PROGRESS) ve sonrasını bırak.

Kural: Sadece belirtilen SLA uzatma satırları silinecek. Status geçişleri ve bildirimler kalacak.
```

```bash
./mvnw compile
git add .
git commit -m "refactor(faz2): remove Spring Boot WAITING SLA extension — jBPM RESUMED webhook handles it"
```

---

### Adım 2.2b — `recalculateSlaDueDate` ve `formatIso8601Duration` kaldır

**Bağımlılık:** Adım 2.2a tamamlandı. jBPM PRIORITY_UPDATED sinyali + `Notify Priority SLA Updated` webhook'u çalışıyor ve DB'ye yazıyor (shadow=false doğrulandı).**

**⚠️ Neden Adım 2.2'nin patladığını anlama:**
Eski planda `calculateSlaDueDate` da kaldırılmıştı. Bu yanlış. `createTicketForCustomer` içindeki `calculateSlaDueDate` çağrısı `startTicketProcess`'e `slaDeadline` göndermek için hâlâ gerekli. Kaldırılırsa:
1. `slaDueDate = null`
2. `startTicketProcess(id, priority, null)` → `null.toString()` → NPE → @Async yutulur → jBPM process başlamaz
3. Hiç timer yok, ama eğer `recalculateSlaDueDate` hâlâ çağrılıyorsa `now - createdAt` hesabı anında negatif değil → farklı sorunlar çıkar

**Bu adımda SADECE `recalculateSlaDueDate` kaldırılıyor. `calculateSlaDueDate` DOKUNULMAYACAK.**

```
Görev: TicketService.java'dan recalculateSlaDueDate ve formatIso8601Duration metodlarını ve çağrılarını kaldır.

Dosya: @TicketService.java

ADIM 1 — Şu metodun tamamını sil (başlığı ile birlikte):
  private void recalculateSlaDueDate(Ticket ticket, Priority newPriority, LocalDateTime now) {
      ... (tüm içerik)
  }

ADIM 2 — Şu metodun tamamını sil:
  private String formatIso8601Duration(java.time.Duration d) {
      ... (tüm içerik)
  }

ADIM 3 — updateTicketForUser metodu içinde şu bloğu bul ve tamamını sil:
  LocalDateTime now = LocalDateTime.now();
  if (updateRequest.getPriority() != null && !Objects.equals(updateRequest.getPriority(), previousPriority)
          && updated.getStatus() != Status.RESOLVED && updated.getStatus() != Status.CLOSED && updated.getCreatedAt() != null) {
      log.warn(">>> DEDEKTİF: Priority if bloguna girildi! ...");
      recalculateSlaDueDate(updated, updateRequest.getPriority(), now);
      updated = hydrateTicketDisplayNames(ticketRepository.save(updated));
  }
Bu if bloğunun tamamı silinecek. LocalDateTime now = ... satırı da kaldırılacak
ANCAK: "now" değişkeni başka yerde kullanılıyorsa silme — sadece bu if bloğu için tanımlıysa sil.

ADIM 4 — DEDEKTİF log satırını da sil (updateTicketForUser başındaki):
  log.warn(">>> DEDEKTİF ANA GİRİŞ: Metot tetiklendi! ...");

KURAL:
  - calculateSlaDueDate metoduna DOKUNMA (createTicketForCustomer + assignTicket + updateTicket fallback için hâlâ gerekli)
  - Başka hiçbir şeyi değiştirme, silme veya yeniden düzenleme.
```

```bash
./mvnw compile
git add .
git commit -m "refactor(faz2): remove recalculateSlaDueDate — jBPM PRIORITY_UPDATED webhook handles SLA recalc"
```

---

### Adım 2.2c — `calculateSlaDueDate` fallback'leri kaldır (OPSİYONEL — ilerleyen aşama)

**⚠️ Bu adım en riskli. Faz 2'nin sonuna bırak. Önce 2.1, 2.2a, 2.2b, 2.3, 2.4 tamamlansın.**

**Ön koşul:** jBPM `Initialize SLA Projection` webhook'u `slaDueDate`'i DB'ye doğru yazıyor mu? Test et:
- Yeni ticket oluştur
- DB'de `sla_due_date` boş kalıyor mu? (jBPM webhook yazmadan önce)
- jBPM webhook gelince doldu mu?

Eğer jBPM webhook DB'ye doğru yazıyorsa bu adım uygulanabilir.

```
Görev: TicketService.java'dan calculateSlaDueDate metodunu ve tüm çağrılarını kaldır.
Sadece jBPM webhook (Initialize SLA Projection → /sla-updated) slaDueDate'i set edecek.

Dosya: @TicketService.java

ADIM 1 — Şu metodun tamamını sil:
  private LocalDateTime calculateSlaDueDate(Priority priority, LocalDateTime baseTime) {
      return switch (priority) { ... }
  }

ADIM 2 — createTicketForCustomer içinde şu iki satırı bul ve sil (iki ayrı yerde var):
  saved.setSlaDueDate(calculateSlaDueDate(saved.getPriority(), saved.getCreatedAt()));
  ve:
  (if blok içindeki aynı çağrı)
  Ticket persisted = ticketRepository.save(saved); satırını koru, sadece setSlaDueDate çağrısını kaldır.

ADIM 3 — assignTicket içinde şu bloğu bul ve sil:
  if (ticket.getSlaDueDate() == null && ticket.getCreatedAt() != null) {
      ticket.setSlaDueDate(calculateSlaDueDate(ticket.getPriority(), ticket.getCreatedAt()));
  }

ADIM 4 — updateTicket içinde şu bloğu bul ve sil:
  if (existingTicket.getSlaDueDate() == null && existingTicket.getCreatedAt() != null
          && currentStatus != Status.RESOLVED && currentStatus != Status.CLOSED) {
      existingTicket.setSlaDueDate(calculateSlaDueDate(existingTicket.getPriority(), existingTicket.getCreatedAt()));
  }

ADIM 5 — startTicketProcess çağrılarında slaDeadline parametresi null geçilecek:
  createTicketForCustomer içinde: jbpmService.startTicketProcess(persisted.getId(), persisted.getPriority().name(), null);
  (veya startTicketProcess imzasını opsiyonel yapın)

KURAL: Sadece belirtilen satırlar ve bloklar kaldırılacak. Başka hiçbir şeye dokunma.
Not: startTicketProcess null-safe olmalı (Adım 2.0 tamamlandıysa hazır).
```

```bash
./mvnw compile
git add .
git commit -m "refactor(faz2): remove calculateSlaDueDate — jBPM Initialize SLA webhook is authoritative"
```

---

### Adım 2.3 — jBPM signal çağrılarını TicketService'ten kaldır

**Bağımlılık:** Faz 1 Action API tamamen çalışıyor. Tüm status/priority değişimleri `TicketActionService → JbpmService.signalProcessSync` üzerinden gidiyor. TicketService içindeki `jbpmService.signal*` çağrıları artık gereksiz (ve tehlikeli — çift sinyal gönderebilir).

**Önce hangi metotlar etkileniyor:**

| Metot | Silinecek jbpmService çağrısı |
|-------|-------------------------------|
| `createTicketForCustomer` | `jbpmService.startTicketProcess(...)` — 2 yerde |
| `assignTicket` | `jbpmService.signalProcess(saved.getId(), "ASSIGNED")` |
| `updateTicketForUser` | `jbpmService.signalProcess(...)` — WAITING, RESOLVED, CLOSED için |
| `addComment` | `jbpmService.signalProcess(ticket.getId(), "RESUMED")` |
| `approveResolution` | `jbpmService.signalProcess(saved.getId(), "CUSTOMER_APPROVED")` |
| `rejectResolution` | `jbpmService.signalProcess(saved.getId(), "CUSTOMER_REJECTED")` |
| `recalculateSlaDueDate` | `jbpmService.signalPriorityUpdatedBreach(...)` ve `jbpmService.signalPriorityUpdated(...)` — Adım 2.2b'de zaten kaldırıldı |

```
Görev: TicketService.java'dan tüm jbpmService signal ve start çağrılarını kaldır.

Dosya: @TicketService.java

ADIM 1 — createTicketForCustomer metodunda şu iki satırı sil (iki ayrı yerde var):
  jbpmService.startTicketProcess(persisted.getId(), persisted.getPriority().name(), persisted.getSlaDueDate());
  ve:
  jbpmService.startTicketProcess(saved.getId(), saved.getPriority().name(), saved.getSlaDueDate());

ADIM 2 — assignTicket metodunun sonunda şu satırı sil:
  jbpmService.signalProcess(saved.getId(), "ASSIGNED");

ADIM 3 — updateTicketForUser metodunda şu if bloğunu bul ve tamamını sil:
  if (currentStatus == Status.WAITING_FOR_CUSTOMER) {
      jbpmService.signalProcess(updated.getId(), "WAITING_FOR_CUSTOMER");
  } else if (currentStatus == Status.RESOLVED) {
      jbpmService.signalProcess(updated.getId(), "RESOLVED");
  } else if (currentStatus == Status.CLOSED) {
      jbpmService.signalProcess(updated.getId(), "FORCE_CLOSED");
  }

ADIM 4 — addComment metodunda şu satırı sil:
  jbpmService.signalProcess(ticket.getId(), "RESUMED");

ADIM 5 — approveResolution metodunda şu satırı sil:
  jbpmService.signalProcess(saved.getId(), "CUSTOMER_APPROVED");

ADIM 6 — rejectResolution metodunda şu satırı sil:
  jbpmService.signalProcess(saved.getId(), "CUSTOMER_REJECTED");

ADIM 7 — TicketService'te artık jbpmService field'ı kullanılmıyorsa:
  private final JbpmService jbpmService; field'ını ve import'unu sil.
  Önce derle — eğer başka bir referans varsa silme.

KURAL: Sadece jbpmService ile başlayan çağrı satırları silinecek.
Çevresindeki notificationService çağrıları, kafkaLogProducer çağrıları ve business logic KORU.
```

```bash
./mvnw compile
git add .
git commit -m "refactor(faz2): remove jBPM signals from TicketService — TicketActionService is single signal source"
```

---

### Adım 2.4 — SlaNotificationScheduler kaldır

```
Görev: SlaNotificationScheduler.java'yı kaldır ve BackendApplication'ı kontrol et.

ADIM 1 — Projede SlaNotificationScheduler dışında @Scheduled kullanan başka sınıf var mı tara.
  Varsa → sadece SlaNotificationScheduler.java'yı sil, @EnableScheduling bırak.
  Yoksa → SlaNotificationScheduler.java'yı sil VE BackendApplication.java'dan @EnableScheduling kaldır.

ADIM 2 — Projede SlaNotificationScheduler'a referans veren başka dosya var mı tara.
  Varsa → referansı da kaldır.

Dosya silinecek: backend/src/main/java/com/ticket/backend/scheduler/SlaNotificationScheduler.java

KURAL: Sadece bu dosya silinecek ve gerekirse BackendApplication'dan bir annotation kaldırılacak.
Başka hiçbir dosyaya dokunma.
```

```bash
./mvnw compile
git add .
git commit -m "refactor(faz2): remove SlaNotificationScheduler — jBPM timer is single SLA authority"
```

---

### Adım 2.5 — `legacy-put-enabled` kapat

```
Görev: PUT endpoint workflow alanlarını reddet.

Dosya: application.yaml
  destrova.workflow.legacy-put-enabled: false

Dosya: @TicketController.java (Adım 1.4'te eklenen deprecation kontrol bloğu)
  legacy-put-enabled=false dalı aktif olacak, 400 dönecek.

Kural: Sadece application.yaml değişecek (flag=false).
TicketController'daki kontrol bloğuna dokunma — zaten Adım 1.4'te yazıldı.
```

```bash
git add .
git commit -m "refactor(faz2): disable legacy PUT workflow fields"
```

---

### Adım 2.6 — DEDEKTİF log temizliği

```
Görev: TicketService.java'dan tüm DEDEKTİF log satırlarını kaldır.

Dosya: @TicketService.java

Şu pattern'i ara ve bulunan tüm satırları sil:
  log.warn(">>> DEDEKTİF...")
  System.out.println(">>> ...")
  log.info(">>> ...")

Eğer Adım 2.2b'de DEDEKTİF log zaten kaldırıldıysa bu adımı atla.

KURAL: Sadece DEDEKTİF prefix'li log satırları kaldırılacak. Başka log satırlarına dokunma.
```

```bash
./mvnw compile
git add .
git commit -m "chore(faz2): remove debug detective logs"
```

---

### Faz 2 tamamlama commit'i

```bash
git add .
git commit -m "feat(faz2): Spring Boot workflow logic removed — jBPM is single orchestrator"
git push
```

---

### Faz 2 Uygulama Sırası Özeti

| Sıra | Adım | Risk | Süre |
|------|------|------|------|
| 1 | K-1..K-4 kontroller | - | 30 dk |
| 2 | 2.0 — startTicketProcess null-safe | Düşük | 5 dk |
| 3 | 2.1 — validateStatusTransition sil | Düşük | 10 dk |
| 4 | 2.2a — WAITING SLA extension sil | Orta | 15 dk |
| 5 | 2.2b — recalculateSlaDueDate sil | Orta | 15 dk |
| 6 | 2.3 — jBPM signal çağrıları sil | Yüksek | 20 dk |
| 7 | 2.4 — SlaNotificationScheduler sil | Düşük | 5 dk |
| 8 | 2.5 — legacy-put-enabled=false | Düşük | 2 dk |
| 9 | 2.2c — calculateSlaDueDate sil | Yüksek | 20 dk |
| 10 | 2.6 — log temizliği | Düşük | 5 dk |

---

## 7. Manuel Adımlar (Business Central)

*(Değişmedi — önceki sürümle aynı)*

---

## 8. Test Checklist

### Faz 2 Test Senaryoları

| # | Senaryo | Beklenen |
|---|---------|---------|
| T1 | Yeni ticket oluştur | jBPM process başladı, BC'de instance var, slaDueDate webhook'la geldi |
| T2 | Agent ata | ASSIGNED sinyali BC'den gitti, status IN_PROGRESS, atama bildirimi var |
| T3 | Status → WAITING_FOR_CUSTOMER | BC slaPaused=true, SLA uzamadı |
| T4 | Müşteri yorum yap | BC slaPaused=false, totalPausedDuration arttı, slaDueDate uzadı |
| T5 | Priority HIGH → LOW | jBPM PRIORITY_UPDATED sinyal gitti, BC'de priority değişti, slaDueDate güncelendi |
| T6 | Priority LOW → HIGH (SLA geçmiş) | jBPM PRIORITY_UPDATED_BREACH → sla-breach webhook → bildirim |
| T7 | TicketService'te validateStatusTransition yok | `./mvnw compile` başarılı |
| T8 | TicketService'te recalculateSlaDueDate yok | `./mvnw compile` başarılı |
| T9 | PUT /api/tickets/98 + status field | 400 "Use /actions/\* endpoints" |
| T10 | SlaNotificationScheduler log yok | Backend başlarken scheduler log yok |
| T11 | jBPM down → yeni ticket oluştur | Ticket kaydedildi, jBPM log.warn var, exception yok |
| T12 | Timer doldu (PT1M test) | sla-breach webhook geldi, bildirim iletildi |

---

## 9. Tespit Edilen Buglar

> Bu bölüm kodun doğrudan okunmasıyla tespit edildi. Faz 2 öncesi düzeltilmeli.

### Bug-1: `startTicketProcess` NullPointerException (Kritik)
**Dosya:** `JbpmService.java`
**Satır:** `body.put("slaDeadline", slaDeadline.toString());`
**Sorun:** `slaDeadline` null gelirse NPE. `@Async` ile sessizce yutulur. jBPM process başlamaz.
**Etki:** Adım 2.2'nin patlamasının asıl sebebi budur. `calculateSlaDueDate` kaldırılınca `slaDueDate=null` → NPE → process yok.
**Düzeltme:** Adım 2.0 ile null-safe yap.

### Bug-2: `Notify Priority SLA Updated` BPMN script'i stale değer gönderiyor (Orta)
**Dosya:** Business Central → `Notify Priority SLA Updated` script task
**Sorun:** Script `slaDeadline` process variable'ını webhook payload'a koyuyor. Ama `PRIORITY_UPDATED` sinyali gelince `priority` değişiyor, `slaDeadline` güncellenmeyebilir. Webhook eski deadline'ı Spring Boot'a gönderiyor.
**Etki:** Priority değişince `slaDueDate` yanlış güncelleniyor.
**Düzeltme:** BPMN script'inde yeni deadline'ı hesapla: `now + (HIGH? 4h : MEDIUM? 24h : 48h)` → `slaDeadline`'ı güncelle → webhook'a yaz. Kontrol K-4 ile doğrula.

### Bug-3: WAITING extension + RESUMED webhook double-write (Düşük — Adım 2.2a ile çözülüyor)
**Dosya:** `TicketService.java → updateTicket` ve `addComment`
**Sorun:** Spring Boot WAITING→IN_PROGRESS geçişinde `slaDueDate`'i `updatedAt` bazında uzatıyor. Aynı anda jBPM RESUMED script `waitingStartedAt` bazında hesaplayıp `/sla-updated` webhook atıyor. Race condition: hangisi son yazarsa o DB'de kalır.
**Etki:** `slaDueDate` tutarsız olabilir.
**Düzeltme:** Adım 2.2a ile Spring Boot tarafı kaldırılıyor.

### Bug-4: `applySlaUpdated` format uyumsuzluğu riski (Orta)
**Dosya:** `TicketProjectionService.java → applySlaUpdated`
**Sorun:** jBPM `slaDeadline` değeri `LocalDateTime.toString()` formatında (`2026-05-28T12:00:00`). `Instant.parse()` ile parse edilirse patlar.
**Etki:** Webhook gelince exception → `slaDueDate` hiç güncellenmez → SLA takibi bozulur.
**Düzeltme:** Kontrol K-2 ile tespit ve `LocalDateTime.parse()` kullanımını doğrula.

### Bug-5: `recalculateSlaDueDate` içinde `notifySlaBreached` çağrısı (Kritik — Adım 2.2 patlama sebebi)
**Dosya:** `TicketService.java → recalculateSlaDueDate`
**Sorun:** Priority değişiminde kalan süre ≤ 0 ise `notificationService.notifySlaBreached(ticket.getId())` çağrılıyor. Bu Spring Boot tarafı. jBPM'den bağımsız, doğrudan bildirim gönderiyor. Faz 1'de hem bu hem jBPM PRIORITY_UPDATED_BREACH sinyali ateşlenebilir → duplicate bildirim.
**Etki:** "Yeni ticketlara SLA doldu uyarısı" denen sorun muhtemelen bu — priority change sırasında `remaining ≤ 0` hesabı yanlış çıkıyordu (createdAt − now yanlış hesap) ve anında breach tetiklendi.
**Düzeltme:** Adım 2.2b ile `recalculateSlaDueDate` tamamen kaldırılıyor.

---

*Plan versiyonu: 1.1 — Faz 2 Backend bölümü gerçek kod analizi ile yeniden yazıldı.*
*Kaynak: TicketService.java + JbpmService.java + TicketLifecycleProcess.bpmn doğrudan okundu.*
