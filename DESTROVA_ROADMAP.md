# Destrova ITSM — Yol Haritası
> Proje mevcut durumu, öncelikli adımlar ve test planı  
> Son güncelleme: Mayıs 2026

---

## 1. Proje Özeti

Destrova, kurumsal destek operasyonlarını yönetmek için geliştirilmekte olan bir ITSM (IT Service Management) ticket sistemidir.

**Stack:** React + Vite + Tailwind (Frontend) · Spring Boot + Keycloak + PostgreSQL (Backend)  
**Roller:** Customer · Agent · Manager · Admin

---

## 2. Mevcut Durum (Mayıs 2026)

### ✅ Tamamlanan

| Alan | Durum |
|------|-------|
| Customer ekranları | Ticket oluşturma, listeleme, detay, onay/red — API bağlı |
| Agent ekranları | Workspace, ticket detail, worklog summary — API bağlı |
| Manager › Dashboard | KPI, flow, SLA, team snapshot — API bağlı |
| Manager › All Tickets | API bağlı, loading state düzeltildi |
| Manager › SLA Monitor | getAllTickets'tan türetiliyor, gerçek veri |
| Manager › Team Workload | Agent kapasitesi API, "View tickets" wire edildi |
| Manager › Reports | Hook + endpoint hazır, tarih filtresi, CSV export çalışıyor |
| Manager › Ticket Detail | Comment, worklog, attachment, status/priority/assignee/unassign |
| Admin › Overview | Canlı: Total users, Active agents, Active products, Rol dağılımı |
| Admin › Users & Roles | GET/PUT API bağlı, drawer, email read-only (Keycloak) |
| Admin › Products Catalog | GET/POST/PUT API bağlı, isActive toggle, category dropdown |
| Bildirim Sistemi (Faz 3) | In-app bildirim, NotificationService, @Async tetikleyiciler — tamamlandı |
| E-posta (Faz 4) | Spring Mail + MailHog, tüm tetikleyiciler — tamamlandı |
| Product entity | category, latestVersion (string), isActive — V5/V6 migration |
| User entity | email, status, department — V8/V9 migration |
| Notification entity | notifications tablosu — V10 migration |
| Keycloak email sync | JWT'den email otomatik güncelleniyor |
| @EnableAsync / @EnableScheduling | BackendApplication'da aktif |
| MailHog | docker-compose.yml'de mevcut (port 1025/8025) |

### ⚠️ Eksik / Bekleyen

| Alan | Sorun |
|------|-------|
| Manager › Dashboard › weeklyFlow prev/lastWeek | Önceki dönem karşılaştırması mock — ertelendi |
| Frontend bildirim merkezi (zil ikonu) | Backend hazır, frontend UI yazılacak |
| Faz 5 — Kafka, OpenSearch, OpenTelemetry, jBPM | Başlanmadı |

---

## 3. Tasarım Kararları ve Gerekçeleri

### Kullanıcı ekleme neden Keycloak'ta?
Analiz ve tasarım raporlarında kimlik doğrulama Keycloak'a devredilmiştir. Kullanıcı oluşturma Keycloak Admin API gerektirir. Mevcut mimari: Keycloak'ta kullanıcı oluştur → Destrova Admin'de rol/kapasite/department yönet. Jüri savunması: "Kimlik yönetimi Keycloak'a, uygulama yetkilendirmesi Destrova'ya devredilmiştir — separation of concerns."

### Admin rolü neden rapor dışı?
Analiz raporunda 3 rol tanımlıdır: Customer, Agent, Manager. Admin rolü bilinçli bir eklenti olarak geliştirilmiştir — sistem yönetimini kolaylaştırmak için.

### jBPM neden Faz 5'te?
Tasarım raporunda jBPM MVP kapsamındadır ancak tek geliştirici kısıtı nedeniyle SLA hesaplaması Spring Boot service katmanında implement edilmiştir. jBPM entegrasyonu mevcut çalışan sisteme büyük bir refactor gerektirdiğinden en sona bırakılmıştır.

---

## 4. Yol Haritası

### FAZ 1 ✅ — Manager Eksikleri Kapatıldı
### FAZ 2 ✅ — Admin Ekranları Tamamlandı
### FAZ 3 ✅ — Bildirim Sistemi Tamamlandı
### FAZ 4 ✅ — E-posta Entegrasyonu Tamamlandı

---

### FAZ 5 — İleri Altyapı (Kafka · OpenSearch · OpenTelemetry · jBPM)

> Tasarım raporunun §2.2, §2.3, §2.4, §4.1, §5.3 bölümlerinde tanımlanan altyapı gereksinimleri.  
> Bu faz 4 bağımsız alt adımdan oluşur. Sıra önemlidir — her adım bir öncekine bağlıdır.

---

#### 5.1 — Kafka + Log Consumer + OpenSearch

**Neden:** Tasarım raporunda "yüksek hacimli log mesajlarının asenkron ve güvenilir şekilde iletilmesi için dağıtık mesaj kuyruğu" ve "log ile metrik verilerinin merkezi olarak toplanması" gereksinimleri var.

**Mimari:** `Backend → Kafka → Log Consumer Service → OpenSearch → OpenSearch Dashboard`

| ID | İş | Dosya / Servis | Açıklama |
|----|-----|----------------|----------|
| K-01 | docker-compose.yml'e Kafka + Zookeeper ekle | `docker-compose.yml` | Kafka image: `confluentinc/cp-kafka`, Zookeeper: `confluentinc/cp-zookeeper`. Port 9092. |
| K-02 | docker-compose.yml'e OpenSearch + Dashboard ekle | `docker-compose.yml` | OpenSearch image: `opensearchproject/opensearch:2`. Port 9200. Dashboard port 5601. Volume ile kalıcı. |
| K-03 | pom.xml'e `spring-kafka` bağımlılığı ekle | `pom.xml` | `org.springframework.kafka:spring-kafka` |
| K-04 | `KafkaProducerConfig.java` oluştur | `config/KafkaProducerConfig.java` | Topic: `destrova-logs`. Serializer: JSON. `application.properties`'e `spring.kafka.bootstrap-servers=localhost:9092` |
| K-05 | `LogEventDto.java` oluştur | `dto/LogEventDto.java` | Alan: `timestamp`, `level` (INFO/WARN/ERROR), `action` (TICKET_CREATED vb.), `ticketId`, `userId`, `message`, `serviceName` |
| K-06 | `KafkaLogProducer.java` oluştur | `service/KafkaLogProducer.java` | `sendLog(LogEventDto)` metodu. `@Async` + try-catch — hata sistemi durdurmaz. |
| K-07 | `TicketService`'e Kafka log tetikleyicileri ekle | `service/TicketService.java` | Ticket oluşturma, atama, statü değişimi, kapanma sonrası `kafkaLogProducer.sendLog(...)` çağrısı. Bildirim tetikleyicileriyle aynı pattern. |
| K-08 | Log Consumer Service oluştur (ayrı Spring Boot modülü) | `log-consumer/` yeni modül | Kafka'dan `destrova-logs` topic'ini dinler. Aldığı `LogEventDto`'yu OpenSearch'e REST ile index'ler. Veya Python script olabilir — basit tutulabilir. |
| K-09 | OpenSearch'te index mapping tanımla | OpenSearch REST API | Index adı: `destrova-logs`. Mapping: timestamp (date), level (keyword), action (keyword), ticketId (long), userId (long), message (text). |
| K-10 | OpenSearch Dashboard'da temel log dashboard oluştur | OpenSearch Dashboard UI | Log count by action, error rate, son 100 log — Discovery görünümü. |

**Test:**
- Backend başlatılınca Kafka bağlantısı kuruluyor mu?
- Ticket oluşturunca `destrova-logs` topic'ine mesaj düşüyor mu? (`kafka-console-consumer` ile kontrol)
- Log Consumer mesajı alıp OpenSearch'e yazıyor mu?
- `GET http://localhost:9200/destrova-logs/_search` — kayıtlar geliyor mu?
- Kafka hatası olsa bile ticket işlemi devam ediyor mu?

---

#### 5.2 — OpenTelemetry

**Neden:** Analiz raporunda §5.3 "Loglama ve İzlenebilirlik" gereksinimi: dağıtık izleme (distributed tracing), uygulama performans metrikleri (istek sayısı, yanıt süreleri, hata oranları), JSON formatında standardize loglar.

**Mimari:** `Backend (OTel Java Agent) → OTel Collector → OpenSearch`

| ID | İş | Dosya / Servis | Açıklama |
|----|-----|----------------|----------|
✅| O-01 | docker-compose.yml'e OTel Collector ekle | `docker-compose.yml` | Image: `otel/opentelemetry-collector-contrib`. Port 4317 (OTLP gRPC), 4318 (OTLP HTTP). Config dosyası volume olarak mount edilir. |
✅| O-02 | `otel-collector-config.yaml` oluştur | `otel-collector-config.yaml` | Receivers: `otlp`. Exporters: `opensearch`. Pipeline: traces + metrics → opensearch. |
| O-03 | OTel Java Agent indir | `backend/` klasörü | `opentelemetry-javaagent.jar` indir. docker-compose'da backend servisine JVM arg olarak ekle: `-javaagent:/app/opentelemetry-javaagent.jar`. |
| O-04 | OTel environment variable'ları ayarla | `docker-compose.yml` backend servisi | `OTEL_SERVICE_NAME=destrova-backend`, `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317`, `OTEL_TRACES_EXPORTER=otlp`, `OTEL_METRICS_EXPORTER=otlp` |
| O-05 | OpenSearch'te trace ve metrik index'leri oluştur | OTel Collector config | OTel Collector otomatik oluşturur; index pattern: `otel-v1-apm-*` |
| O-06 | OpenSearch Dashboard'da trace ve metrik görünümleri ekle | OpenSearch Dashboard UI | API response time dağılımı, error rate, en yavaş endpoint'ler. |

**Test:**
- Backend başlatılınca OTel Agent log'u görünüyor mu? (`OpenTelemetry Java Agent` log satırı)
- `GET /api/tickets` isteği atılınca OTel Collector'a trace gidiyor mu?
- OpenSearch'te `otel-v1-apm-span-*` index'i oluşuyor mu?
- Dashboard'da span'lar görünüyor mu?



O-03	⏸️ Ertelendi	Agent jar'ı indirildi, final Docker kurulumunda devreye girecek
O-04	⏸️ Ertelendi	Ortam değişkenleri finalde eklenecek
O-05	⏸️ Ertelendi	Trace index'leri finalde oluşacak
O-06	⏸️ Ertelendi	Dashboard görünümleri finalde eklenecek




---

#### 5.3 — jBPM Entegrasyonu

**Neden:** Tasarım raporunda §4.1.2 "Yeni Ticket Oluşturma Senaryosu" — her ticket için jBPM'de process instance başlatılır. §4.1.4 "SLA Zamanlayıcı" — jBPM SLA süresini timer ile takip eder, dolunca `POST /api/webhook/jbpm/sla-breach` endpoint'ini çağırır.

**⚠️ Risk: Bu adım mevcut sisteme en büyük müdahale.** Şu an `TicketService.calculateSlaDueDate()` ve `@Scheduled` SLA checker Spring Boot içinde. jBPM bu sorumluluğu devralacak. Mevcut sistem çalışmaya devam edecek — jBPM paralel çalıştırılacak, geçiş kademeli olacak.

**Mimari:** `Ticket oluşturulur → Spring Boot → jBPM REST API (process instance başlat) → jBPM timer dolar → Spring Boot webhook → bildirim`

| ID | İş | Dosya / Servis | Açıklama |
|----|-----|----------------|----------|
| J-01 | docker-compose.yml'e jBPM Server ekle | `docker-compose.yml` | Image: `jboss/jbpm-server-full`. Port 8180 (jBPM Business Central). PostgreSQL'i shared DB olarak kullanır. |
| J-02 | jBPM Business Central'da BPMN süreci tasarla | jBPM UI (http://localhost:8180) | Process adı: `TicketLifecycleProcess`. Değişkenler: `ticketId` (Long), `priority` (String). Timer tanımı: priority'e göre `PT4H` / `PT24H` / `PT48H`. Timer dolunca `SlaBreachSignal` event'i tetikle. |
| J-03 | BPMN dosyasını export et | `backend/src/main/resources/processes/ticket-lifecycle.bpmn` | Business Central'dan export edilir. İleride kod ile deploy edilmesi için. |
| J-04 | `JbpmService.java` oluştur | `service/JbpmService.java` | `startTicketProcess(Long ticketId, String priority)` metodu. jBPM REST API'ye `POST /kie-server/services/rest/server/containers/{containerId}/processes/{processId}/instances` isteği atar. `@Async` + try-catch — jBPM hatası ticket işlemini bozmaz. |
| J-05 | `TicketService.createTicketForCustomer`'a jBPM tetikleyici ekle | `service/TicketService.java` | Ticket kaydedilip SLA hesaplandıktan sonra `jbpmService.startTicketProcess(saved.getId(), saved.getPriority().name())` çağrısı. |
| J-06 | `POST /api/webhook/jbpm/sla-breach` endpoint'i oluştur | `controller/WebhookController.java` | jBPM bu endpoint'i timer dolunca çağırır. Body: `{ "ticketId": 1 }`. Endpoint: ticket'ı BREACHED olarak işaretle, bildirim tetikle. IP veya API key ile koru (internal endpoint). |
| J-07 | `@Scheduled` SLA checker'ı devre dışı bırak | `service/NotificationService.java` (veya SlaScheduler) | jBPM timer devreye girince `@Scheduled` SLA breach checker'ın görevi jBPM'e geçer. Feature flag veya property ile kontrol edilebilir: `sla.scheduler.enabled=false` |
| J-08 | Mevcut SLA hesaplamasını koru (fallback) | `service/TicketService.java` | `calculateSlaDueDate()` metodu silinmez — jBPM'in SLA date'i ile senkronize tutulur. jBPM olmadan da sistem çalışmaya devam eder. |

**Test:**
- Ticket oluşturunca jBPM Business Central'da process instance görünüyor mu?
- HIGH öncelikli ticket 4 saat beklenince webhook çağrılıyor mu?
- Webhook çağrılınca Manager'a SLA ihlal bildirimi gidiyor mu?
- jBPM çalışmasa bile ticket oluşturma başarılı mı? (graceful degradation)

---

#### 5.4 — Docker Compose Tam Konfigürasyon

Tüm servislerin çalışır hale getirildiği son docker-compose.yml:

| Servis | Image | Port | Durum |
|--------|-------|------|-------|
| `postgres-db` | `postgres:15` | 5432 | ✅ Mevcut |
| `pgadmin` | `dpage/pgadmin4` | 5050 | ✅ Mevcut |
| `keycloak` | `quay.io/keycloak/keycloak:latest` | 8081 | ✅ Mevcut |
| `mailhog` | `mailhog/mailhog` | 1025/8025 | ✅ Mevcut |
| `zookeeper` | `confluentinc/cp-zookeeper:7.4.0` | 2181 | ❌ Faz 5.1 |
| `kafka` | `confluentinc/cp-kafka:7.4.0` | 9092 | ❌ Faz 5.1 |
| `opensearch` | `opensearchproject/opensearch:2` | 9200 | ❌ Faz 5.1 |
| `opensearch-dashboards` | `opensearchproject/opensearch-dashboards:2` | 5601 | ❌ Faz 5.1 |
| `otel-collector` | `otel/opentelemetry-collector-contrib` | 4317/4318 | ❌ Faz 5.2 |
| `jbpm-server` | `jboss/jbpm-server-full` | 8180 | ❌ Faz 5.3 |
| `log-consumer` | Custom Spring Boot / Python | — | ❌ Faz 5.1 |

---

### Bağımsız İşler (Faz sırasına bağlı değil)

| ID | İş | Teknoloji | Ne zaman |
|----|-----|-----------|----------|
| X-01 | Frontend bildirim merkezi — zil ikonu, okunmamış badge, dropdown | React | Faz 5 öncesi tamamlanabilir |
| X-02 | Ticket devir nedeni (transfer reason) | Backend + Frontend | İstenen zaman |
| X-03 | Attachment kısıtları — 5 dosya / 10MB backend doğrulama | Spring Boot | İstenen zaman |
| X-04 | Keycloak Admin API — kullanıcı oluşturma | Keycloak Admin Client | İstenen zaman |
| X-05 | AuditLog entity + admin action kayıtları | Spring Boot | Faz 5 sonrası |
| X-06 | Admin System Health ekranı — audit log görüntüleme | React | X-05 sonrası |

---

## 5. Faz 5 İlerleme Sırası ve Tavsiye

**Önerilen sıra:** 5.1 → 5.2 → 5.3

**5.1 önce çünkü:** Kafka ve OpenSearch bağımsız, riski en düşük adım. Log Consumer oluşturmak jBPM'den çok daha basit. Bu adım tamamlanınca 5.2 ve 5.3 için OpenSearch altyapısı hazır olur.

**5.2 ikinci çünkü:** OTel Java Agent kod değişikliği gerektirmez — sadece docker-compose ve JVM arg. Çok düşük risk.

**5.3 en son çünkü:** jBPM mevcut `TicketService`'e dokunur. SLA scheduler değişir. Bu en riskli adım, sistemi iyi anlayarak ve fallback mekanizması (J-08) ile yapılmalı.

**Cursor ile yapılacaklar (her adım ayrı prompt):**
- CP-K: Kafka + OpenSearch + Log Consumer (docker-compose + KafkaProducerConfig + KafkaLogProducer + TicketService tetikleyicileri)
- CP-O: OTel Collector (docker-compose + otel-collector-config.yaml + backend env)
- CP-J1: jBPM docker-compose + JbpmService + WebhookController
- CP-J2: TicketService jBPM tetikleyici + SLA scheduler devre dışı + fallback

---

## 6. Keycloak Mimari Kararı

| İş | Destrova Admin | Keycloak |
|----|---------------|----------|
| Kullanıcı oluşturma | ❌ (X-04'e kadar) | ✅ Keycloak arayüzü |
| Rol güncelleme | ✅ DB'de kayıt | ⚠️ Keycloak sync manuel |
| Status (Active/Disabled) | ✅ DB'de kayıt | ⚠️ Keycloak sync manuel |
| Email güncelleme | ❌ Read-only | ✅ Keycloak arayüzü |
| Şifre sıfırlama | ❌ | ✅ Keycloak arayüzü |
| Keycloak JWT → email sync | ✅ Otomatik login'de | — |

---

## 7. Veri Modeli Durumu

| Entity / Alan | Durum | Faz |
|--------------|-------|-----|
| `User.email`, `status`, `department` | ✅ V8/V9 | — |
| `Product.category`, `latestVersion`, `isActive` | ✅ V5/V6 | — |
| `Notification` entity | ✅ V10 | — |
| `AuditLog` entity | ❌ Yok | X-05 |
| `ProductVersion` entity | ⏸️ Ertelendi | — |

### Migration Sırası
```
V1  — initial schema
V2  — (?)
V3  — attachment schema fix
V4  — user role column
V5  — product catalog (category, latest_version)
V6  — product is_active
V7  — product created_at
V8  — user email/status/department
V9  — user status normalize
V10 — notifications tablosu ✅
V11 — (X-05: AuditLog)
```

---

## 8. Test Planı

### 8.1 Faz 1-4 — Manuel Test Kontrol Listesi (Regresyon)

#### Manager
- [ ] Dashboard KPI'lar gerçek veriden geliyor mu?
- [ ] All Tickets — loading spinner var, mock flash yok
- [ ] SLA Monitor — Breached/At Risk/Safe doğru ayrışıyor mu?
- [ ] Team Workload — "View tickets" agent filtreli açılıyor mu?
- [ ] Reports — tarih filtresi, product/agent tabloları, CSV export
- [ ] Ticket Detail — yorum, worklog, attachment, status/priority/assignee/unassign/kapatma

#### Admin
- [ ] Overview — Total users, Active agents, Active products doğru
- [ ] Users & Roles — liste, arama, drawer, kayıt
- [ ] Products Catalog — liste, ekleme, toggle, passive ticket formunda görünmüyor

#### Bildirim (Faz 3)
- [ ] Ticket oluşturunca müşteri in-app bildirim alıyor mu?
- [ ] Manager atama yapınca agent'a bildirim gidiyor mu?
- [ ] Agent kendi üstüne alınca bildirim gitmiyor mu?
- [ ] Bildirim başarısız olsa bile ticket oluşturuluyor mu?
- [ ] `GET /api/notifications` çalışıyor mu?

#### E-posta (Faz 4)
- [ ] Ticket oluşturunca MailHog'a (http://localhost:8025) e-posta düşüyor mu?
- [ ] Atama e-postası agent'a gidiyor mu?
- [ ] SLA ihlali e-postası manager'a gidiyor mu?

### 8.2 Faz 5 — Test Kontrol Listesi

#### Kafka + OpenSearch (5.1)
- [ ] `docker-compose up` sonrası Kafka topic oluşuyor mu?
- [ ] Ticket işlemi sonrası Kafka'da mesaj var mı? (`kafka-console-consumer --topic destrova-logs`)
- [ ] Log Consumer mesajı alıp OpenSearch'e yazıyor mu?
- [ ] `GET http://localhost:9200/destrova-logs/_search` kayıt dönüyor mu?
- [ ] Kafka hatası olsa bile ticket işlemi başarılı mı?

#### OpenTelemetry (5.2)
- [ ] Backend başlarken OTel Agent log satırı görünüyor mu?
- [ ] API isteği sonrası OTel Collector'da span var mı?
- [ ] OpenSearch'te `otel-v1-apm-span-*` index oluşuyor mu?

#### jBPM (5.3)
- [ ] Ticket oluşturunca jBPM'de process instance görünüyor mu? (http://localhost:8180)
- [ ] HIGH priority ticket için 4 saatlik timer başlıyor mu?
- [ ] Timer dolunca `POST /api/webhook/jbpm/sla-breach` çağrılıyor mu?
- [ ] Webhook sonrası Manager'a SLA ihlal bildirimi gidiyor mu?
- [ ] jBPM çalışmadığında ticket oluşturma yine de başarılı mı?

### 8.3 API Endpoint Test Listesi

```
# Bildirim
GET   /api/notifications
GET   /api/notifications/unread-count
PATCH /api/notifications/{id}/read
PATCH /api/notifications/read-all

# jBPM Webhook (internal)
POST  /api/webhook/jbpm/sla-breach    {"ticketId": 1}

# OpenSearch (doğrudan)
GET   http://localhost:9200/destrova-logs/_search
GET   http://localhost:9200/otel-v1-apm-span-*/_search

# Kafka (CLI)
kafka-console-consumer --bootstrap-server localhost:9092 --topic destrova-logs --from-beginning
```

### 8.4 Regresyon Kontrol Listesi (Her Deploy)

- [ ] Customer yeni ticket açabiliyor mu?
- [ ] Agent atanan ticket'ı görebiliyor mu?
- [ ] Manager All Tickets listesi geliyor mu?
- [ ] Admin kullanıcı listesi geliyor mu?
- [ ] Backend başlıyor mu? (`Started BackendApplication`)
- [ ] Flyway migration'lar hatasız mı?
- [ ] Bildirim servisi çalışıyor mu? (Ticket oluştur, notification kontrol et)

---

## 9. Teknik Borç

| Borç | Açıklama | Öncelik |
|------|----------|---------|
| `TestAuthController.java` | Production'a geçmeden kaldırılmalı | 🟡 |
| `seed_products_manual.sql` | `db/migration/` klasöründen kaldırılabilir | 🟡 |
| `TicketService.java` | 500+ satır — ProductService ve AdminService'e bölünmeli | 🟢 |
| Manager mock fallback'ler | Üretimde kaldırılabilir | 🟢 |

---

## 10. Dosya Referans Haritası

### Frontend
```
frontend/src/services/api.js                                   ← Tüm API fonksiyonları
frontend/src/components/destrova/manager/hooks/                ← Manager data hook'ları
frontend/src/components/destrova/manager/components/views/     ← Manager ekranları
frontend/src/components/destrova/admin/components/views/       ← Admin ekranları
```

### Backend (Mevcut)
```
backend/.../controller/TicketController.java     ← Ticket CRUD (JsonNode body)
backend/.../controller/ManagerController.java    ← Manager dashboard, reports, capacity, export
backend/.../controller/AdminController.java      ← User/Product admin API
backend/.../controller/NotificationController.java ← /api/notifications
backend/.../service/TicketService.java           ← Ana iş mantığı
backend/.../service/NotificationService.java     ← Bildirim tetikleyicileri (@Async)
backend/.../service/AppUserService.java          ← Keycloak JWT → DB user sync
backend/.../config/SecurityConfig.java           ← Rol bazlı yetkilendirme
backend/src/main/resources/db/migration/         ← V3-V10 migration'lar
```

### Backend (Faz 5 — Eklenecek)
```
backend/.../config/KafkaProducerConfig.java      ← Faz 5.1
backend/.../service/KafkaLogProducer.java        ← Faz 5.1
backend/.../dto/LogEventDto.java                 ← Faz 5.1
backend/.../service/JbpmService.java             ← Faz 5.3
backend/.../controller/WebhookController.java    ← Faz 5.3
log-consumer/                                    ← Faz 5.1 (ayrı modül)
otel-collector-config.yaml                       ← Faz 5.2
```

---

## 11. UI/UX Tasarım Rehberi

### Renk Sistemi

#### Manager Teması (`managerTokens.js`)
| Token | Değer | Kullanım |
|-------|-------|---------|
| `dark` | `#0F0E47` | Ana metin, başlıklar, primary butonlar |
| `surface` | `#FFFFFF` | Kart arka planı |
| `muted` | `#888780` | İkincil metin, label'lar |
| `support` | `#5F5E5A` | Üçüncül metin |
| `hairline` | `rgba(39,39,87,0.08)` | Kart border, divider |
| SLA Safe | `#639922` fg · `#EAF3DE` bg | Güvenli SLA |
| SLA AtRisk | `#BA7517` fg · `#FAEEDA` bg | Risk altında |
| SLA Breached | `#E24B4A` fg · `#FCEBEB` bg | İhlal |

#### Admin Teması (`adminTokens.js`)
| Token | Değer | Kullanım |
|-------|-------|---------|
| `dark` | `#272757` | Ana metin |
| `muted` | `rgba(39,39,87,0.45)` | İkincil metin |

### UX Kuralları
- Tüm API çağrıları `loading` state — spinner göster, boş liste değil
- Hata durumunda `getApiErrorMessage()` — backend mesajı, yoksa fallback
- Empty state: filtre → "No results match the current filters." / API boş → "No data available."
- Drawer kayıt: saving → disabled buton → başarı → kapat + yenile / hata → açık kal

### Bilinen Tutarsızlıklar
| Sorun | Nerede | Çözüm |
|-------|--------|-------|
| Assignee adı yerine "Agent #ID" | Manager Ticket Detail | `hydrateTicketDisplayNames` kontrol |
| `displayId` bazen `#null` | All Tickets | `buildRouteAndDisplayId` null guard |

---

## 12. Sonraki Sprint

1. X-01: Frontend bildirim merkezi (zil ikonu + dropdown) — bağımsız, hemen yapılabilir
2. Faz 5.1: Kafka + OpenSearch + Log Consumer
3. Faz 5.2: OpenTelemetry
4. Faz 5.3: jBPM (en riskli, en son)
