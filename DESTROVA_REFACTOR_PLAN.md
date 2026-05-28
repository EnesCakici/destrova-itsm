# DESTROVA — jBPM Single Source of Truth Refactoring Plan

> **Amaç:** Spring Boot'u "aptal uygulayıcı" (CRUD + projection), jBPM'i "orkestratör" (master) yapmak.  
> **Strategi:** Strangler Fig — Faz 0 (webhook altyapı + shadow) → Faz 1 (Action API + destrova frontend) → Faz 2+ (Java workflow silme).  
> **Frontend kuralı:** Aktif UI yalnızca `frontend/src/components/destrova/**`. Bu planın frontend promptları **sadece** o dizini hedefler. `frontend/src/components/TicketDetailView.jsx` vb. legacy dosyalara dokunulmaz.

---

## İçindekiler

1. [Faz 1 Action API — OpenAPI Referansı](#1-faz-1-action-api--openapi-referansı)
2. [BPMN Script Task Şablonları](#2-bpmn-script-task-şablonları)
3. [Cursor Promptları — Faz 0 Backend](#3-cursor-promptları--faz-0-backend)
4. [Cursor Promptları — Faz 1 Backend](#4-cursor-promptları--faz-1-backend)
5. [Cursor Promptları — Faz 1 Frontend (destrova only)](#5-cursor-promptları--faz-1-frontend-destrova-only)
6. [Cursor Promptları — Faz 2 Backend (workflow silme)](#6-cursor-promptları--faz-2-backend-workflow-silme)
7. [Manuel Adımlar (Business Central)](#7-manuel-adımlar-business-central)
8. [Test Checklist](#8-test-checklist)

---

## 1. Faz 1 Action API — OpenAPI Referansı

**Base URL:** `http://localhost:8080`  
**Auth:** Bearer JWT (Keycloak) — tüm action endpoint'leri authenticated.  
**Başarı:** `202 Accepted` — DB henüz güncellenmemiş olabilir; webhook projection asenkron gelir.  
**Ortak hata kodları:**

| HTTP | Anlam |
|------|-------|
| 400 | Geçersiz body |
| 403 | RBAC / ownership |
| 404 | Ticket yok |
| 409 | jBPM geçersiz geçiş / sinyal reddedildi |
| 503 | jBPM erişilemez |

**Standart 202 body (tüm action'lar):**

```json
{
  "commandId": "cmd-550e8400-e29b-41d4-a716-446655440000",
  "ticketId": 98,
  "action": "resume",
  "status": "ACCEPTED",
  "poll": {
    "recommendedIntervalMs": 500,
    "maxAttempts": 20,
    "timeoutMs": 10000
  },
  "expectedProjection": {
    "status": "IN_PROGRESS"
  }
}
```

---

### 1.1 `POST /api/tickets/{id}/actions/assign`

| | |
|---|---|
| **Roller** | `ROLE_AGENT`, `ROLE_MANAGER`, `ROLE_ADMIN` |
| **Agent kısıtı** | Agent yalnızca kendine atayabilir; başka agente atanmış ticket'ı devralamaz (mevcut `assignTicket` kuralları) |

**Request body:**

```json
{
  "assigneeId": 12
}
```

**202 `expectedProjection`:**

```json
{
  "expectedProjection": {
    "status": "IN_PROGRESS",
    "assigneeId": 12
  }
}
```

**jBPM sinyali:** `ASSIGNED` — variables: `{ "assigneeId": 12, "assignedByUserId": <JWT user id> }`

---

### 1.2 `POST /api/tickets/{id}/actions/unassign`

| | |
|---|---|
| **Roller** | `ROLE_MANAGER`, `ROLE_ADMIN` |

**Request body:** `{}` (boş object veya body yok)

**202 `expectedProjection`:**

```json
{
  "expectedProjection": {
    "assigneeId": null
  }
}
```

**jBPM sinyali:** `UNASSIGNED` (BPMN'de yoksa Faz 1'de `ASSIGNED` + `assigneeId: null` payload ile implement edin)

---

### 1.3 `POST /api/tickets/{id}/actions/wait-for-customer`

| | |
|---|---|
| **Roller** | `ROLE_AGENT`, `ROLE_MANAGER`, `ROLE_ADMIN` |
| **Önkoşul** | Ticket assignee = current user (agent için) |

**Request body:** `{}`

**202 `expectedProjection`:**

```json
{
  "expectedProjection": {
    "status": "WAITING_FOR_CUSTOMER"
  }
}
```

**jBPM sinyali:** `WAITING_FOR_CUSTOMER`

---

### 1.4 `POST /api/tickets/{id}/actions/resume`

| | |
|---|---|
| **Roller** | `ROLE_AGENT`, `ROLE_MANAGER`, `ROLE_ADMIN`, `ROLE_CUSTOMER` (müşteri yorumu resume — ileride) |
| **Agent** | Assignee olmalı |

**Request body:** `{}`

**202 `expectedProjection`:**

```json
{
  "expectedProjection": {
    "status": "IN_PROGRESS"
  }
}
```

**jBPM sinyali:** `RESUMED`

---

### 1.5 `POST /api/tickets/{id}/actions/resolve`

| | |
|---|---|
| **Roller** | `ROLE_AGENT`, `ROLE_MANAGER`, `ROLE_ADMIN` |
| **Agent** | Assignee olmalı; agent CLOSED yapamaz |

**Request body:** `{}`

**202 `expectedProjection`:**

```json
{
  "expectedProjection": {
    "status": "RESOLVED"
  }
}
```

**jBPM sinyali:** `RESUMED` → hayır, `RESOLVED`

---

### 1.6 `POST /api/tickets/{id}/actions/close`

| | |
|---|---|
| **Roller** | `ROLE_MANAGER`, `ROLE_ADMIN` |
| **Kural** | `closureReason` zorunlu; `CUSTOMER_APPROVED` kabul edilmez |

**Request body:**

```json
{
  "closureReason": "INVALID"
}
```

Geçerli `closureReason`: `INVALID`, `DUPLICATE`, `NO_RESPONSE` (manager). `CUSTOMER_APPROVED` yalnızca approve action.

**202 `expectedProjection`:**

```json
{
  "expectedProjection": {
    "status": "CLOSED",
    "closureReason": "INVALID"
  }
}
```

**jBPM sinyali:** `FORCE_CLOSED` — variables: `{ "closureReason": "INVALID" }`

---

### 1.7 `POST /api/tickets/{id}/actions/change-priority`

| | |
|---|---|
| **Roller** | `ROLE_AGENT`, `ROLE_MANAGER`, `ROLE_ADMIN` |
| **Agent** | Assignee olmalı |
| **Kural** | RESOLVED / CLOSED ticket'ta priority değişmez |

**Request body:**

```json
{
  "priority": "HIGH"
}
```

Geçerli değerler: `HIGH`, `MEDIUM`, `LOW`

**202 `expectedProjection`:**

```json
{
  "expectedProjection": {
    "priority": "HIGH"
  }
}
```

**jBPM sinyali:** `PRIORITY_UPDATED` — variables: `{ "priority": "HIGH" }` (SLA hesabı BPMN'de)

---

### 1.8 `POST /api/tickets/{id}/actions/approve`

| | |
|---|---|
| **Roller** | `ROLE_CUSTOMER` |
| **Kural** | Ticket creator = current user; status = RESOLVED |

**Request body:** `{}`

**202 `expectedProjection`:**

```json
{
  "expectedProjection": {
    "status": "CLOSED",
    "closureReason": "CUSTOMER_APPROVED"
  }
}
```

**jBPM sinyali:** `CUSTOMER_APPROVED`

**Not:** Mevcut `POST /api/tickets/{id}/approve` Faz 1'de bu action'a delegate edilir (alias).

---

### 1.9 `POST /api/tickets/{id}/actions/reject`

| | |
|---|---|
| **Roller** | `ROLE_CUSTOMER` |
| **Kural** | Creator; status = RESOLVED; reason zorunlu |

**Request body:**

```json
{
  "reason": "The issue is not fully fixed."
}
```

**202 `expectedProjection`:**

```json
{
  "expectedProjection": {
    "status": "IN_PROGRESS"
  }
}
```

**jBPM sinyali:** `CUSTOMER_REJECTED` — variables: `{ "customerRejectionNote": "..." }`

**Not:** Mevcut `POST /api/tickets/{id}/reject` alias.

---

### 1.10 `POST /api/tickets/{id}/actions/assign-to-me` (opsiyonel kısayol)

| | |
|---|---|
| **Roller** | `ROLE_AGENT` |
| **Davranış** | `actions/assign` + `{ "assigneeId": <current user id> }` |

**Request body:** `{}`

**202 `expectedProjection`:** assign ile aynı.

---

### 1.11 Legacy endpoint'ler (Faz 1 — deprecated, silinmez)

| Endpoint | Durum |
|----------|-------|
| `PUT /api/tickets/{id}` | `status`, `priority`, `assigneeId`, `closureReason` → deprecated log; yalnızca `description` güvenli |
| `POST /api/tickets/{id}/assign` | `actions/assign` alias |
| `POST /api/tickets/{id}/approve` | `actions/approve` alias |
| `POST /api/tickets/{id}/reject` | `actions/reject` alias |

---

## 2. BPMN Script Task Şablonları

> Business Central → Script Task → Language: **Java**  
> Process Variables önceden tanımlı olmalı (plan v4 listesi).  
> `WEBHOOK_SECRET` değerini Business Central **Deployment Descriptor** veya process variable olarak set edin (Faz 0: `destrova-webhook-dev-secret`).

### 2.0 Ortak yardımcı (her script'in başına kopyalayın)

```java
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

String WEBHOOK_BASE = "http://host.docker.internal:8080/api/webhook/jbpm";
String WEBHOOK_SECRET = "destrova-webhook-dev-secret";
String CONTAINER_ID = "destrova-ticket-process_1.0.0-SNAPSHOT";
String PROCESS_ID = "destrova-ticket-process.TicketLifecycleProcess";

java.util.function.Function<Object, String> jsonStr = (Object o) -> {
    if (o == null) return "null";
    String s = String.valueOf(o);
    return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r") + "\"";
};

java.util.function.Function<Object, String> jsonLong = (Object o) -> {
    if (o == null) return "null";
    return String.valueOf(((Number) o).longValue());
};

java.util.function.Function<Object, String> jsonBool = (Object o) -> {
    if (o == null) return "false";
    if (o instanceof Boolean) return ((Boolean) o) ? "true" : "false";
    return Boolean.parseBoolean(String.valueOf(o)) ? "true" : "false";
};

java.util.function.BiFunction<String, String, Integer> postWebhook = (String path, String jsonBody) -> {
    try {
        URL url = new URL(WEBHOOK_BASE + path);
        HttpURLConnection con = (HttpURLConnection) url.openConnection();
        con.setRequestMethod("POST");
        con.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        con.setRequestProperty("X-Webhook-Secret", WEBHOOK_SECRET);
        con.setRequestProperty("X-Idempotency-Key", UUID.randomUUID().toString());
        con.setDoOutput(true);
        byte[] bytes = jsonBody.getBytes(StandardCharsets.UTF_8);
        con.setFixedLengthStreamingMode(bytes.length);
        try (OutputStream os = con.getOutputStream()) {
            os.write(bytes);
        }
        int code = con.getResponseCode();
        System.out.println("Webhook POST " + path + " -> HTTP " + code);
        return code;
    } catch (Exception e) {
        System.out.println("Webhook error " + path + ": " + e.getMessage());
        return -1;
    }
};

Object ticketIdObj = kcontext.getVariable("ticketId");
long ticketId = (ticketIdObj != null) ? ((Number) ticketIdObj).longValue() : 0L;
long processInstanceId = kcontext.getProcessInstance().getId();
String correlationKey = String.valueOf(ticketId);
String eventId = UUID.randomUUID().toString();
String occurredAt = java.time.Instant.now().toString();
```

---

### 2.1 `status-changed` Script Task

**Ne zaman:** Statü değiştiren her ScriptTask sonunda (Waiting, Resolved, Closed, Resume vb.)  
**Önkoşul:** Script içinde `currentStatus` variable'ını güncelledikten **sonra** çalıştırın.  
**Ek process variable (öneri):** `previousStatus` — gateway/script başında snapshot alın.

```java
// === 2.0 ortak yardımcı bloğu buraya ===

// Bu script'e özel: önceki statü snapshot (ScriptTask başında set edilmiş olmalı)
Object prevObj = kcontext.getVariable("previousStatus");
String previousStatus = (prevObj != null) ? String.valueOf(prevObj) : "NEW";

Object currObj = kcontext.getVariable("currentStatus");
String newStatus = (currObj != null) ? String.valueOf(currObj) : previousStatus;

Object slaPausedObj = kcontext.getVariable("slaPaused");
boolean slaPaused = (slaPausedObj instanceof Boolean) ? (Boolean) slaPausedObj : Boolean.parseBoolean(String.valueOf(slaPausedObj));

Object closedAtObj = kcontext.getVariable("closedAt");
String closedAtJson = (closedAtObj != null) ? jsonStr.apply(String.valueOf(closedAtObj)) : "null";

Object closureReasonObj = kcontext.getVariable("closureReason");
String closureReasonJson = (closureReasonObj != null) ? jsonStr.apply(String.valueOf(closureReasonObj)) : "null";

Object rejectionNoteObj = kcontext.getVariable("customerRejectionNote");
String rejectionNoteJson = (rejectionNoteObj != null) ? jsonStr.apply(String.valueOf(rejectionNoteObj)) : "null";

// triggeredBy — ScriptTask'a göre sabit string'i değiştirin
String signalName = "WAITING_FOR_CUSTOMER";  // <-- BURAYI DEĞİŞTİRİN
String nodeId = "ScriptTask_StatusChanged_01";
String nodeName = "Notify status-changed";

String json = "{"
    + "\"eventId\":" + jsonStr.apply(eventId) + ","
    + "\"eventType\":\"status-changed\","
    + "\"occurredAt\":" + jsonStr.apply(occurredAt) + ","
    + "\"ticketId\":" + ticketId + ","
    + "\"processInstanceId\":" + processInstanceId + ","
    + "\"correlationKey\":" + jsonStr.apply(correlationKey) + ","
    + "\"processId\":" + jsonStr.apply(PROCESS_ID) + ","
    + "\"containerId\":" + jsonStr.apply(CONTAINER_ID) + ","
    + "\"triggeredBy\":{"
        + "\"signal\":" + jsonStr.apply(signalName) + ","
        + "\"nodeId\":" + jsonStr.apply(nodeId) + ","
        + "\"nodeName\":" + jsonStr.apply(nodeName)
    + "},"
    + "\"payload\":{"
        + "\"previousStatus\":" + jsonStr.apply(previousStatus) + ","
        + "\"newStatus\":" + jsonStr.apply(newStatus) + ","
        + "\"slaPaused\":" + jsonBool.apply(slaPaused) + ","
        + "\"closedAt\":" + closedAtJson + ","
        + "\"closureReason\":" + closureReasonJson + ","
        + "\"customerRejectionNote\":" + rejectionNoteJson
    + "}"
    + "}";

postWebhook.apply("/status-changed", json);
```

**Sinyal adı referans tablosu (signalName):**

| ScriptTask | `signalName` |
|------------|--------------|
| Waiting | `WAITING_FOR_CUSTOMER` |
| Resume | `RESUMED` |
| Resolved | `RESOLVED` |
| Closed (customer) | `CUSTOMER_APPROVED` |
| Rejected | `CUSTOMER_REJECTED` |
| Force close | `FORCE_CLOSED` |

---

### 2.2 `sla-updated` Script Task

**Ne zaman:** Process start, RESUMED, CUSTOMER_REJECTED, PRIORITY_UPDATED sonrası  
**Önkoşul:** `slaDeadline`, `slaStartedAt`, `priority`, `totalPausedDuration` güncel olmalı.

```java
// === 2.0 ortak yardımcı bloğu buraya ===

Object slaDeadlineObj = kcontext.getVariable("slaDeadline");
String slaDueDate = (slaDeadlineObj != null) ? String.valueOf(slaDeadlineObj) : null;

Object slaStartedAtObj = kcontext.getVariable("slaStartedAt");
String slaStartedAt = (slaStartedAtObj != null) ? String.valueOf(slaStartedAtObj) : null;

Object priorityObj = kcontext.getVariable("priority");
String priority = (priorityObj != null) ? String.valueOf(priorityObj) : "MEDIUM";

Object totalPausedObj = kcontext.getVariable("totalPausedDuration");
long totalPausedDurationMs = (totalPausedObj != null) ? ((Number) totalPausedObj).longValue() : 0L;

Object slaPausedObj = kcontext.getVariable("slaPaused");
boolean slaPaused = (slaPausedObj instanceof Boolean) ? (Boolean) slaPausedObj : false;

// remainingDurationIso — timer expression ile aynı mantık; basit fallback
String remainingDurationIso = "PT24H";
if ("HIGH".equals(priority)) remainingDurationIso = "PT4H";
else if ("LOW".equals(priority)) remainingDurationIso = "PT48H";

// reason — ScriptTask'a göre değiştirin
String reason = "RESUMED_FROM_WAITING";  // PROCESS_STARTED | RESUMED_FROM_WAITING | RESUMED_FROM_RESOLVED | PRIORITY_CHANGED | TIMER_RESTART

Object prevPriorityObj = kcontext.getVariable("previousPriority");
String previousPriorityJson = (prevPriorityObj != null) ? jsonStr.apply(String.valueOf(prevPriorityObj)) : "null";

String signalName = "RESUMED";
String nodeId = "ScriptTask_SlaUpdated_01";
String nodeName = "Notify sla-updated";

String json = "{"
    + "\"eventId\":" + jsonStr.apply(eventId) + ","
    + "\"eventType\":\"sla-updated\","
    + "\"occurredAt\":" + jsonStr.apply(occurredAt) + ","
    + "\"ticketId\":" + ticketId + ","
    + "\"processInstanceId\":" + processInstanceId + ","
    + "\"correlationKey\":" + jsonStr.apply(correlationKey) + ","
    + "\"processId\":" + jsonStr.apply(PROCESS_ID) + ","
    + "\"containerId\":" + jsonStr.apply(CONTAINER_ID) + ","
    + "\"triggeredBy\":{"
        + "\"signal\":" + jsonStr.apply(signalName) + ","
        + "\"nodeId\":" + jsonStr.apply(nodeId) + ","
        + "\"nodeName\":" + jsonStr.apply(nodeName)
    + "},"
    + "\"payload\":{"
        + "\"slaDueDate\":" + jsonStr.apply(slaDueDate) + ","
        + "\"slaStartedAt\":" + jsonStr.apply(slaStartedAt) + ","
        + "\"priority\":" + jsonStr.apply(priority) + ","
        + "\"slaPaused\":" + jsonBool.apply(slaPaused) + ","
        + "\"totalPausedDurationMs\":" + totalPausedDurationMs + ","
        + "\"remainingDurationIso\":" + jsonStr.apply(remainingDurationIso) + ","
        + "\"reason\":" + jsonStr.apply(reason) + ","
        + "\"previousPriority\":" + previousPriorityJson
    + "}"
    + "}";

postWebhook.apply("/sla-updated", json);
```

---

### 2.3 `assigned` Script Task

**Ne zaman:** `ASSIGNED` boundary signal sonrası  
**Process variables (sinyal payload'dan):** `assigneeId`, `assignedByUserId` (opsiyonel)

```java
// === 2.0 ortak yardımcı bloğu buraya ===

Object prevAssigneeObj = kcontext.getVariable("previousAssigneeId");
Long previousAssigneeId = (prevAssigneeObj != null) ? ((Number) prevAssigneeObj).longValue() : null;

Object newAssigneeObj = kcontext.getVariable("assigneeId");
Long newAssigneeId = (newAssigneeObj != null) ? ((Number) newAssigneeObj).longValue() : null;

Object assignedByObj = kcontext.getVariable("assignedByUserId");
Long assignedByUserId = (assignedByObj != null) ? ((Number) assignedByObj).longValue() : null;

Object prevStatusObj = kcontext.getVariable("previousStatus");
String previousStatus = (prevStatusObj != null) ? String.valueOf(prevStatusObj) : "NEW";

Object currStatusObj = kcontext.getVariable("currentStatus");
String newStatus = (currStatusObj != null) ? String.valueOf(currStatusObj) : "IN_PROGRESS";

boolean unassign = (newAssigneeId == null);

String previousAssigneeJson = (previousAssigneeId != null) ? String.valueOf(previousAssigneeId) : "null";
String newAssigneeJson = (newAssigneeId != null) ? String.valueOf(newAssigneeId) : "null";
String assignedByJson = (assignedByUserId != null) ? String.valueOf(assignedByUserId) : "null";

String signalName = "ASSIGNED";
String nodeId = "ScriptTask_Assigned_01";
String nodeName = "Notify assigned";

String json = "{"
    + "\"eventId\":" + jsonStr.apply(eventId) + ","
    + "\"eventType\":\"assigned\","
    + "\"occurredAt\":" + jsonStr.apply(occurredAt) + ","
    + "\"ticketId\":" + ticketId + ","
    + "\"processInstanceId\":" + processInstanceId + ","
    + "\"correlationKey\":" + jsonStr.apply(correlationKey) + ","
    + "\"processId\":" + jsonStr.apply(PROCESS_ID) + ","
    + "\"containerId\":" + jsonStr.apply(CONTAINER_ID) + ","
    + "\"triggeredBy\":{"
        + "\"signal\":" + jsonStr.apply(signalName) + ","
        + "\"nodeId\":" + jsonStr.apply(nodeId) + ","
        + "\"nodeName\":" + jsonStr.apply(nodeName)
    + "},"
    + "\"payload\":{"
        + "\"previousAssigneeId\":" + previousAssigneeJson + ","
        + "\"newAssigneeId\":" + newAssigneeJson + ","
        + "\"assignedByUserId\":" + assignedByJson + ","
        + "\"previousStatus\":" + jsonStr.apply(previousStatus) + ","
        + "\"newStatus\":" + jsonStr.apply(newStatus) + ","
        + "\"unassign\":" + (unassign ? "true" : "false")
    + "}"
    + "}";

postWebhook.apply("/assigned", json);
```

**Not:** `assigned` webhook tek başına `status` + `assigneeId` yazar; aynı olay için ayrı `status-changed` göndermeyin.

---

## 3. Cursor Promptları — Faz 0 Backend

Her adımdan önce: `git add . && git commit -m "chore: pre-faz0-step-N checkpoint"`

---

### Adım 0.1 — Feature flags ve webhook secret

```
Görev: application.yaml'a workflow feature flag'leri ve webhook secret ekle.

Dosya: backend/src/main/resources/application.yaml

Ekle:
  destrova:
    workflow:
      shadow-projection: true          # true = webhook DB yazmaz, sadece log/compare
      legacy-put-enabled: true         # Faz 1'e kadar PUT status kabul
    webhook:
      secret: destrova-webhook-dev-secret

Kural: Başka dosyaya dokunma.
```

---

### Adım 0.2 — Webhook envelope DTO'ları

```
Görev: jBPM webhook envelope için DTO record/class'ları oluştur.

Yeni paket: backend/src/main/java/com/ticket/backend/dto/webhook/

Dosyalar:
  - JbpmWebhookEnvelope.java (eventId, eventType, occurredAt, ticketId, processInstanceId, correlationKey, processId, containerId, triggeredBy, payload as Map veya typed)
  - JbpmTriggeredByDto.java (signal, nodeId, nodeName)
  - StatusChangedPayload.java
  - SlaUpdatedPayload.java
  - AssignedPayload.java
  - WebhookResponse.java (accepted, duplicate, ticketId, appliedAt, error)

Jackson @JsonIgnoreProperties(ignoreUnknown = true) kullan.
Kural: Sadece yeni dto dosyaları. Test yok.
```

---

### Adım 0.3 — Webhook secret doğrulama

```
Görev: Webhook isteklerinde X-Webhook-Secret header doğrulaması ekle.

Dosyalar:
  - backend/src/main/java/com/ticket/backend/config/WebhookSecretFilter.java (OncePerRequestFilter, yalnızca /api/webhook/jbpm/*)
  - application.yaml'daki destrova.webhook.secret ile karşılaştır
  - SecurityConfig permitAll kalır; filter 401 döner

Kural: TicketService'e dokunma.
```

---

### Adım 0.4 — Idempotency migration

```
Görev: Webhook idempotency tablosu için Flyway migration ekle.

Dosya: backend/src/main/resources/db/migration/V12__webhook_idempotency.sql

Tablo: webhook_processed_events
  - event_id VARCHAR(36) PRIMARY KEY
  - ticket_id BIGINT NOT NULL
  - event_type VARCHAR(50) NOT NULL
  - processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

Repository: WebhookEventRepository.java
Kural: Sadece migration + repository.
```

---

### Adım 0.5 — TicketProjectionService (aptal yazar)

```
Görev: Webhook'lardan DB projection yazan ince servis oluştur.

Yeni dosya: backend/src/main/java/com/ticket/backend/service/TicketProjectionService.java

Metotlar (iş kuralı YOK, sadece persist):
  - applyStatusChanged(StatusChangedPayload, Instant occurredAt)
  - applySlaUpdated(SlaUpdatedPayload, Instant occurredAt)
  - applyAssigned(AssignedPayload, Instant occurredAt)
  - applyTotalPausedDuration(Long ticketId, Long totalPausedDurationMs)

Kurallar:
  - occurredAt stale ise (ticket.updatedAt daha yeni) no-op + log warn
  - status-changed sonrası appendStatusTimelineCommentsIfNeeded mantığını TicketService'ten private metot olarak çağır VEYA timeline metotlarını ProjectionService'e taşı (duplicate yok)
  - notificationService çağrıları: assign, status change, sla breach — commit sonrası

TicketService'ten silme yok (Faz 0).
Kural: TicketProjectionService + gerekirse TicketService'te package-private timeline helper.
```

---

### Adım 0.6 — WebhookController genişletme

```
Görev: WebhookController'ı envelope formatına genişlet.

Dosya: backend/src/main/java/com/ticket/backend/controller/WebhookController.java

Endpoint'ler:
  POST /api/webhook/jbpm/status-changed
  POST /api/webhook/jbpm/sla-updated
  POST /api/webhook/jbpm/assigned
  POST /api/webhook/jbpm/paused-duration  (mevcut — envelope'a geçir, geriye uyumlu kalsın)
  POST /api/webhook/jbpm/sla-breach       (mevcut — envelope'a geçir)

Her endpoint:
  1. Idempotency: eventId varsa webhook_processed_events kontrol
  2. destrova.workflow.shadow-projection=true ise: drift log (DB vs payload compare), DB YAZMA
  3. shadow=false ise: TicketProjectionService.apply*
  4. WebhookResponse döndür

@Value("${destrova.workflow.shadow-projection}") kullan.
Kural: WebhookController + WebhookEventService (idempotency) + TicketProjectionService wiring.
```

---

### Adım 0.7 — Shadow drift logger

```
Görev: Shadow mode drift karşılaştırma log servisi ekle.

Yeni dosya: backend/src/main/java/com/ticket/backend/service/WebhookShadowComparator.java

Metot: logDrift(Long ticketId, String field, Object dbValue, Object webhookValue)
  - Eşitse: DEBUG "SHADOW_OK"
  - Farklıysa: WARN "SHADOW_DRIFT"

WebhookController shadow branch'inde her alan için çağır.
Kural: Sadece comparator + controller wiring.
```

---

### Adım 0.8 — Faz 0 commit

```
git add .
git commit -m "feat(faz0): jBPM webhook envelope, projection service, shadow mode"
```

**Manuel:** Business Central'da Bölüm 2 script şablonlarını ilgili ScriptTask'lara yapıştır → Build & Deploy.

---

## 4. Cursor Promptları — Faz 1 Backend

### Adım 1.1 — TicketActionController

```
Görev: Action API controller oluştur.

Yeni dosya: backend/src/main/java/com/ticket/backend/controller/TicketActionController.java

Base: @RequestMapping("/api/tickets/{id}/actions")

Endpoint'ler (OpenAPI referansı DESTROVA_REFACTOR_PLAN.md Bölüm 1):
  POST assign, unassign, wait-for-customer, resume, resolve, close, change-priority, approve, reject, assign-to-me

Her endpoint:
  - @PreAuthorize (roller plan'daki gibi)
  - TicketActionService.executeAction(...) → 202 + ActionAcceptedResponse

Mevcut TicketController'daki approve/reject/assign endpoint'leri TicketActionService'e delegate et (duplicate logic yok).

Kural: Controller + DTO (ActionAcceptedResponse, *ActionRequest) + Service interface. TicketService workflow silme yok.
```

---

### Adım 1.2 — TicketActionService

```
Görev: Action orchestration servisi — RBAC + jBPM signal (SYNC).

Yeni dosya: backend/src/main/java/com/ticket/backend/service/TicketActionService.java

Akış:
  1. Ticket yükle, mevcut TicketService RBAC helper'larını reuse et (isAgentOnly, assertAssigneeAgent, vb.)
  2. assign için assignWithLimitCheck (TicketService'ten package-private veya inject)
  3. JbpmService.signalProcess SYNC (Faz 1 action path için @Async KULLANMA)
  4. jBPM exception → 503; invalid transition mesajı → 409
  5. commandId UUID üret, ActionAcceptedResponse döndür (poll config application.yaml'dan)

application.yaml'a ekle:
  destrova:
    workflow:
      poll:
        recommended-interval-ms: 500
        max-attempts: 20
        timeout-ms: 10000

Faz 1'de DB'ye status YAZMA — webhook projection beklenir.
Kural: TicketActionService + JbpmService'e sync signal metodu ekle (signalProcessSync).
```

---

### Adım 1.3 — JbpmService sync signal

```
Görev: Action API için senkron jBPM sinyal metodu ekle.

Dosya: backend/src/main/java/com/ticket/backend/service/JbpmService.java

Yeni metot: signalProcessSync(Long ticketId, String signalName, Map<String, Object> variables)
  - @Async YOK
  - Hata durumunda exception fırlat (TicketActionService yakalar)
  - Mevcut async metotlar createTicket/start için kalabilir

Kural: Sadece JbpmService + TicketActionService wiring.
```

---

### Adım 1.4 — Legacy PUT deprecation

```
Görev: PUT /api/tickets/{id} içinde workflow alanları için deprecation log.

Dosya: backend/src/main/java/com/ticket/backend/controller/TicketController.java

destrova.workflow.legacy-put-enabled=false ise:
  body'de status, priority, assigneeId, closureReason varsa → 400 + "Use /actions/* endpoints"

true ise (default Faz 1): mevcut davranış + WARN log "deprecated PUT workflow field: status"

Kural: Minimal diff TicketController + application.yaml doc.
```

---

### Adım 1.5 — Shadow mode kapatma (Faz 1 sonu)

```
Görev: Shadow projection'ı kapat — webhook'lar DB yazar.

Dosya: application.yaml
  destrova.workflow.shadow-projection: false

Manuel test: 10 ticket drift = 0
Commit: "feat(faz1): action API + webhook projection live"
```

---

## 5. Cursor Promptları — Faz 1 Frontend (destrova only)

> **KAPSAM:** Yalnızca `frontend/src/components/destrova/**`  
> Paylaşılan HTTP client için `frontend/src/services/api.js` **Faz 1'de action helper eklenmez** — destrova kendi API katmanını kullanır.

---

### Adım F1 — destrova ticketActions API katmanı

```
Görev: Destrova action API helper modülü oluştur.

Yeni dosya: frontend/src/components/destrova/shared/api/ticketActions.js

Fonksiyonlar:
  - executeTicketAction(ticketId, action, body?)
      → POST http://localhost:8080/api/tickets/{id}/actions/{action}
      → Keycloak token: mevcut pattern için import keycloak from '../../../../keycloak' ve Authorization header
      → 202 response parse

  - waitForTicketProjection(ticketId, expectedProjection, pollConfig, getTicketByIdFn)
      → polling loop (plan spec)
      → ProjectionTimeoutError export

  - statusToAction(currentStatus, targetStatus) → action name mapper (agent/manager)

  - ACTION_EXPECTED_PROJECTION constant map

axios instance: destrova/shared/api/httpClient.js (baseURL localhost:8080/api, token interceptor)

Kural: Sadece destrova/shared/api/* yeni dosyalar. Legacy frontend dosyalarına dokunma.
```

---

### Adım F2 — CustomerPreviewPage (approve/reject + poll)

```
Görev: Müşteri onay/red akışını action API + polling'e geçir.

Dosya: frontend/src/components/destrova/customer/preview/CustomerPreviewPage.jsx

Değişiklikler:
  - approveTicket/rejectTicket import'unu kaldır (services/api)
  - ticketActions.js'den executeTicketAction + waitForTicketProjection import et
  - approve handler: actions/approve → optimistic patch (status CLOSED) → poll → getTicketById
  - reject handler: actions/reject + { reason } → optimistic IN_PROGRESS → poll
  - syncState UI: "Syncing…" badge (CustomerTicketDetailView'e prop olarak syncState geçilebilir)

getTicketById için: mevcut services/api getTicketById'i callback olarak geç (import OK — dosya değişmez)

Kural: SADECE CustomerPreviewPage.jsx (+ gerekirse customer/components/CustomerTicketDetailView.jsx sync badge). destrova dışı yok.
```

---

### Adım F3 — AgentWorkspaceSplit (assign + status + priority)

```
Görev: Agent workspace'i action API'ye geçir.

Dosyalar:
  - frontend/src/components/destrova/agent/preview/AgentWorkspaceSplit.jsx
  - frontend/src/components/destrova/agent/data/ticketStatusGraph.js (status → action mapper ekle)

Değişiklikler:
  1. handleAssignToMe: assignTicketToMe yerine executeTicketAction(id, 'assign', { assigneeId: appUser.id })
  2. handleApplyRightRailMeta:
     - status değişimi → statusToAction → executeTicketAction
     - priority değişimi → executeTicketAction(id, 'change-priority', { priority })
     - ikisi birden → sequential chain (status önce, poll, sonra priority)
  3. Optimistic displayTicket merge + syncState
  4. loadTicketDetail + reload → poll tamamlandıktan sonra

ticketStatusGraph.js: getActionForStatusTransition(from, to) ekle; validateStatusTransition yorumunu "backend/jBPM authoritative" olarak güncelle

Kural: Sadece belirtilen destrova agent dosyaları.
```

---

### Adım F4 — ManagerTicketDetailView (composite save parçalama)

```
Görev: Manager ticket detail composite PUT'u action chain'e çevir.

Dosya: frontend/src/components/destrova/manager/components/ManagerTicketDetailView.jsx

handleApplyChanges refactor:
  1. assignee değiştiyse → actions/assign veya actions/unassign
  2. status değiştiyse → ilgili action (close için actions/close + closureReason)
  3. priority değiştiyse → actions/change-priority
  4. description değiştiyse → PUT /api/tickets/{id} yalnızca { description } (legacy, workflow dışı)

Sıra: assign → status → priority
UI: saving state → "Applying (1/3)…"
Her adım: 202 → waitForTicketProjection → sonraki

manager/api/api.js: updateTicket export kalabilir (description için); executeTicketAction re-export ekle:
  export { executeTicketAction, waitForTicketProjection } from '../../shared/api/ticketActions';

Kural: ManagerTicketDetailView.jsx + manager/api/api.js only.
```

---

### Adım F5 — Agent RightRail sync indicator (opsiyonel UX)

```
Görev: Status/priority kaydederken syncing göstergesi.

Dosyalar:
  - frontend/src/components/destrova/agent/components/RightRail.jsx
  - frontend/src/components/destrova/shared/StatusBadge.jsx (opsiyonel spinner prop)

syncState === 'syncing' iken Confirm butonu disabled + "Syncing…" label

Kural: Sadece destrova agent/shared bileşenleri.
```

---

### Adım F6 — Faz 1 frontend commit

```
git add frontend/src/components/destrova
git commit -m "feat(faz1): destrova UI — action API + optimistic poll projection"
```

---

## 6. Cursor Promptları — Faz 2 Backend (workflow silme)

> Faz 1 stabil olduktan sonra. Her adım ayrı commit.

### Adım 2.1 — validateStatusTransition sil

```
TicketService.java'dan validateStatusTransition metodunu ve tüm çağrılarını sil.
PUT workflow alanlarını ignore et (legacy-put-enabled=false).
```

### Adım 2.2 — SLA matematiği sil

```
Sil: calculateSlaDueDate, recalculateSlaDueDate, formatIso8601Duration
Sil: updateTicket içindeki SLA extension blokları (465-477, 680-690, 869-872)
Sil: updateTicketForUser priority SLA bloğu (260-265)
createTicketForCustomer: slaDueDate hesabını kaldır; jBPM start + webhook set eder
```

### Adım 2.3 — jBPM signal follower sil

```
TicketService/updateTicket/assignTicket/approve/reject/addComment içindeki tüm jbpmService.signal* çağrılarını sil.
Workflow yalnızca TicketActionService → JbpmService (sync).
```

### Adım 2.4 — SlaNotificationScheduler sil

```
backend/.../scheduler/SlaNotificationScheduler.java sil
BackendApplication @EnableScheduling kontrol et
```

---

## 7. Manuel Adımlar (Business Central)

1. [ ] Process Variables: `previousStatus`, `previousAssigneeId`, `closureReason`, `customerRejectionNote`, `assigneeId`, `assignedByUserId` ekle
2. [ ] Her statü ScriptTask: önce `previousStatus = currentStatus`, sonra `currentStatus` güncelle, sonra **2.1 status-changed** script
3. [ ] ASSIGNED script: assignee snapshot + **2.3 assigned** script
4. [ ] RESUMED / PRIORITY / START: **2.2 sla-updated** script
5. [ ] Build & Deploy → container ID doğrula
6. [ ] `docker-compose` jbpm ayakta, `host.docker.internal` erişimi test
7. [ ] Shadow mode drift log review → Faz 1'de shadow=false

---

## 8. Test Checklist

### Faz 0
- [ ] POST status-changed (curl/Postman) → 200, shadow log SHADOW_OK
- [ ] Duplicate eventId → 200 duplicate:true
- [ ] Yanlış X-Webhook-Secret → 401
- [ ] Mevcut PUT akışı bozulmadı

### Faz 1 Backend
- [ ] POST actions/resume → 202, jBPM signal log
- [ ] Webhook → DB status güncellendi (shadow=false)
- [ ] jBPM down → 503

### Faz 1 Frontend (destrova)
- [ ] AgentWorkspaceSplit: status change → optimistic + ≤3s confirmed
- [ ] ManagerTicketDetailView: assign + close chain
- [ ] CustomerPreviewPage: approve/reject poll
- [ ] Poll timeout → sarı banner, rollback yok

### Faz 2
- [ ] TicketService'te validateStatusTransition yok
- [ ] calculateSlaDueDate yok
- [ ] Yeni statü = yalnızca BPMN + action endpoint

---

## Ek: Destrova Frontend Dosya Haritası (aktif)

| Dosya | Faz 1 aksiyonu |
|-------|----------------|
| `destrova/shared/api/ticketActions.js` | **YENİ** — action + poll |
| `destrova/shared/api/httpClient.js` | **YENİ** — axios + JWT |
| `destrova/customer/preview/CustomerPreviewPage.jsx` | approve/reject migrate |
| `destrova/agent/preview/AgentWorkspaceSplit.jsx` | assign, status, priority |
| `destrova/agent/data/ticketStatusGraph.js` | status→action mapper |
| `destrova/agent/components/RightRail.jsx` | syncing UX |
| `destrova/manager/components/ManagerTicketDetailView.jsx` | composite → action chain |
| `destrova/manager/api/api.js` | re-export ticketActions |

**Dokunulmayacak legacy:** `frontend/src/components/TicketDetailView.jsx`, `TicketList.jsx`, `pages/manager/*` (destrova dışı).

---

*Plan versiyonu: 1.0 — Single Source of Truth / Strangler Fig — May 2026*












