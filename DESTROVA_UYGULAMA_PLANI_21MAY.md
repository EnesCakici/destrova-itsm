# Destrova ITSM — Uygulama Planı
> Eksik listesi (DESTROVA_eksik_21may.md) ve mevcut duruma göre hazırlanmıştır.
> Tarih: 21 Mayıs 2026 · Kod yazma yok, yönlendirme planı.

---

## ÖNCE OKUMANI GEREKENLERİ: Mevcut Durumun Gerçeği

Kodu inceledim. Bazı şeyler eksik listesinde "kritik" yazıyor ama aslında yapılmış:

| Eksik ID | Eksik Listede Ne Yazıyor | Gerçek Durum |
|----------|--------------------------|--------------|
| J-04 | SLA timer'ları jBPM'de değil | `@Scheduled` SLA checker var ve çalışıyor — bu yanlış değil, jBPM ile paralel çalışacak |
| K-01..K-07 | Kafka yok | `TicketService`'de `KafkaLogProducer` zaten inject edilmiş, `kafkaLogProducer.sendLog(...)` çağrıları var — Kafka servis katmanı yazılmış, docker servisi eksik |
| B-01 | Agent ticket devri yok | `transferAllTickets` manager için var; agent için `assignTicket` self-assign çalışıyor |
| F-05 | Assignee kısmı mock | `TicketService.updateTicket` assigneeId güncellemeyi handle ediyor, frontend sorunu |

Bu tespitler planı etkiliyor. Sıralamayı buna göre yaptım.

---

## BÖLÜM 0 — GitHub: En Acil İş

### Neden önce GitHub?

Şu an tüm kod lokalde. Herhangi bir disk arızası, yanlış bir silme veya Cursor hatası → her şey gider. Üstelik jüri için commit geçmişi önemli.

      ### GitHub'a ilk kez nasıl başlayacaksın — adım adım

      #### 0.1 Git kurulumu ve yapılandırma (terminal / PowerShell)

      ```
      git --version
      ```
      Sonuç geliyorsa Git kurulu. Gelmiyorsa https://git-scm.com/download/win adresinden indir.

      ```
      git config --global user.name "Enes Cakici"
      git config --global user.email "senin@email.com"
   ```

      #### 0.2 GitHub'da repo oluştur

      - github.com → New repository
      - İsim: `destrova-itsm`
      - Private (önerilir, jüri öncesi public yaparsın)
      - README ekleme (biz ekleyeceğiz)
      - .gitignore ekleme → **Java** seç (Vite/Node için manuel ekleyeceğiz)
      - Oluştur → URL'i kopyala (örn: `https://github.com/enes-cakici/destrova-itsm.git`)

#### 0.3 Proje klasöründe Git başlat

```
cd C:\Users\Enes\Desktop\itsm-ticket-system
git init
```

#### 0.4 .gitignore dosyasını kontrol et ve düzenle

Proje kökünde `.gitignore` yoksa oluştur. İçeriği şöyle olmalı:

```
# Java / Spring Boot
target/
*.class
*.jar
*.war
*.ear
.mvn/wrapper/maven-wrapper.jar

# Node / React
node_modules/
dist/
.env
.env.local
.env.*.local
npm-debug.log*

# IDE
.idea/
*.iml
.vscode/
*.suo
*.ntvs*
*.njsproj
*.sln
.DS_Store

# Docker volumes (local)
postgres_data/

# Geçici dosyalar
seed_products_manual.sql
TicketService_PATCH.java
```

#### 0.5 İlk commit — geçmişi doğal göster

**Önemli not:** Şu an tek bir devasa commit atmak yerine, anlamlı küçük commit'ler atmak hem geçmişi temizler hem de "son 1 ayda yapılmış" görüntüsünü azaltır. Ama git geçmişi olmadan da proje ciddiye alınır — jüri commit tarihlerine bakmaz, koda bakar. Şu an için öncelik kodu kayıt altına almak.

```
git add .
git commit -m "feat: initial project setup — Spring Boot + React + Keycloak + PostgreSQL"
```

#### 0.6 Remote bağla ve push yap

```
git remote add origin https://github.com/enes-cakici/destrova-itsm.git
git branch -M main
git push -u origin main
```

#### 0.7 Bundan sonrası için commit kuralı

Her önemli iş bitince:
```
git add .
git commit -m "feat: jBPM process instance entegrasyonu"
git push
```

Commit mesaj formatı: `feat:` (yeni özellik), `fix:` (hata düzeltme), `refactor:` (kod düzenleme), `docs:` (belge)

---

## BÖLÜM 1 — Öncelik Sıralaması: Ne Önce Yapılacak?

Eksik listeyi üç kritere göre sıraladım:

1. **Jüri için görünürlük** — jüri görecek mi, duyacak mı?
2. **Sistem bütünlüğü** — bu eksik sistemin çalışmasını kırıyor mu?
3. **Emek/etki oranı** — az emekle çok etki yaratıyor mu?

### Öncelik Matrisi

| Öncelik | Kategori | Ne yapılacak | Kim |
|---------|----------|-------------|-----|
| 🔴 P0 | GitHub | Repo oluştur, ilk commit, push | SEN |
| 🔴 P0 | jBPM | Docker + BPMN + JbpmService + Webhook | Cursor |
| 🔴 P0 | Frontend | Notification zil ikonu + dropdown | Cursor |
| 🔴 P0 | Frontend | Manager ticket detail — attachment görünümü | Cursor |
| 🟡 P1 | Backend | Agent ticket devri (transfer reason) | Cursor |
| 🟡 P1 | Backend | Attachment validasyon (5 dosya/10MB) | Cursor |
| 🟡 P1 | Frontend | Customer ekran UI sorunları (F-01, F-02, F-03) | Cursor |
| 🟡 P1 | Frontend | Manager timeline/conversation düzeni | Cursor |
| 🟢 P2 | Altyapı | Kafka Docker servisi (kod zaten var) | Cursor |
| 🟢 P2 | Altyapı | OpenTelemetry docker + agent | Cursor |
| 🟢 P2 | Test | Birim testleri (JUnit/Mockito) | Cursor |
| 🟢 P2 | Frontend | i18n Türkçe dil desteği | Cursor |
| ⏸️ P3 | Altyapı | OpenSearch + Dashboard | Ertelendi |
| ⏸️ P3 | Güvenlik | 2FA (Keycloak config) | Ertelendi |
| ⏸️ P3 | Güvenlik | HTTPS / Nginx | Ertelendi |

---

## BÖLÜM 2 — jBPM Entegrasyonu (En Kritik)

### Mevcut durumun analizi

`TicketService.java` okundu. Şu an:
- `calculateSlaDueDate()` → Spring Boot içinde manuel (doğru, kalacak — fallback)
- `validateStatusTransition()` → Spring Boot içinde manuel (doğru, kalacak)
- `SlaNotificationScheduler` → `@Scheduled` ile SLA breach kontrolü (çalışıyor)
- `KafkaLogProducer` → inject edilmiş, tetikleyiciler var ama Docker'da Kafka servisi yok

jBPM eklenmesi şu anlama gelir:
- Ticket oluşturunca ARKA PLANDA (async) jBPM'de process instance açılır
- jBPM 4 saat sonra (HIGH) kendi timer'ı ile Spring Boot webhook'u çağırır
- Spring Boot webhook → SLA ihlal işlemi (mevcut scheduler ile aynı şey, sadece kaynağı farklı)
- Mevcut sistem çalışmaya devam eder — jBPM ek bir katman olarak gelir

### jBPM Entegrasyon Planı — 4 Aşama

#### Aşama J-A: Docker Compose'a jBPM Ekle

`docker-compose.yml`'a eklenecek servis:

```yaml
jbpm-server:
  image: jboss/jbpm-server-full:7.74.1.Final
  container_name: destrova-jbpm
  environment:
    JBPM_DB_DRIVER: postgres
    JBPM_DB_HOST: postgres-db
    JBPM_DB_PORT: 5432
    JBPM_DB_NAME: ticket_db
    JBPM_DB_USER: ticket_user
    JBPM_DB_PASSWORD: ticket_password
  ports:
    - "8180:8080"
  depends_on:
    - postgres-db
```

**Dikkat:** jBPM kendi tablolarını `ticket_db`'ye oluşturacak. Flyway migration'larınla çakışmaz — jBPM farklı prefix kullanır (örn: `JBPM_*`, `TASK_*`). Ama ilk açılışta uzun sürer (2-3 dakika).

**Cursor Prompt A:**
```
docker-compose.yml dosyasına jBPM Server servisi ekle.
Mevcut servisler: postgres-db (5432), pgadmin (5050), keycloak (8081), mailhog (1025/8025)
Eklenecek: jboss/jbpm-server-full:7.74.1.Final, port 8180, postgres-db'ye bağlı
Environment değişkenleri: JBPM_DB_DRIVER=postgres, JBPM_DB_HOST=postgres-db,
JBPM_DB_PORT=5432, JBPM_DB_NAME=ticket_db, JBPM_DB_USER=ticket_user,
JBPM_DB_PASSWORD=ticket_password
Dosyaları değiştirme: sadece docker-compose.yml
```

#### Aşama J-B: BPMN Süreci Tasarla (Manuel — sen yapacaksın)

jBPM çalıştıktan sonra:
1. `http://localhost:8180/business-central` → admin/admin ile giriş
2. Yeni proje: `destrova-ticket-process`
3. Yeni process: `TicketLifecycleProcess`
4. BPMN editörde şu yapıyı kur:

```
[Start Event]
    ↓
[Script Task: SLA Başlat]
    ↓ (dallanma: priority'ye göre)
[Timer Event: PT4H (HIGH) | PT24H (MEDIUM) | PT48H (LOW)]
    ↓ (timer dolunca)
[Script Task: Webhook Çağır → POST http://backend:8080/api/webhook/jbpm/sla-breach]
    ↓
[End Event]
```

Değişkenler (process variables):
- `ticketId` (Integer)
- `priority` (String: HIGH / MEDIUM / LOW)

5. Build & Deploy → KIE Server'a deploy et
6. Container ID'yi not al (örn: `destrova-ticket-process_1.0.0`)

**Bu aşama tamamen sende, Cursor yardımcı olamaz — Business Central arayüzü.**

#### Aşama J-C: Backend — JbpmService ve WebhookController (Cursor)

İki yeni dosya eklenecek:

**JbpmService.java:**
- `startTicketProcess(Long ticketId, String priority)` metodu
- `@Async` + try-catch — jBPM hatası sistemi durdurmaz
- jBPM KIE Server REST API'ye POST: `http://localhost:8180/kie-server/services/rest/server/containers/{containerId}/processes/destrova-ticket-process.TicketLifecycleProcess/instances`
- Body: `{"ticketId": ticketId, "priority": priority}`
- Basic Auth: `kieserver/kieserver1!`

**WebhookController.java:**
- `POST /api/webhook/jbpm/sla-breach` → `{ "ticketId": 123 }`
- Security: IP whitelist veya basit API key header
- İçi: `notificationService.notifySlaBreached(ticketId)` çağrısı
- `SecurityConfig.java`'ya `/api/webhook/**` path'ini permit all yap (internal endpoint)

**Cursor Prompt C:**
```
Destrova ITSM backend'ine jBPM entegrasyonu ekle.

Yeni dosyalar:
1. backend/src/main/java/com/ticket/backend/service/JbpmService.java
   - @Service, @Async, @RequiredArgsConstructor
   - startTicketProcess(Long ticketId, String priority) metodu
   - jBPM KIE Server REST API'ye POST isteği: http://localhost:8180/kie-server/services/rest/server/containers/destrova-ticket-process_1.0.0/processes/destrova-ticket-process.TicketLifecycleProcess/instances
   - Basic Auth header: kieserver:kieserver1!
   - Body: {"ticketId": ticketId, "priority": priority}
   - @Async + try-catch ile sarılı, hata olsa sadece log.warn basılır, exception fırlatılmaz
   - RestTemplate kullan (Spring Boot'ta hazır)

2. backend/src/main/java/com/ticket/backend/controller/WebhookController.java
   - @RestController, @RequestMapping("/api/webhook")
   - POST /jbpm/sla-breach endpoint'i
   - @RequestBody Map<String, Object> body → ticketId al
   - notificationService.notifySlaBreached(ticketId) çağır (bu metot zaten var)
   - @PreAuthorize olmadan — security config'de permit all yapılacak

3. SecurityConfig.java'da /api/webhook/** path'ini permitAll() yap

Mevcut dosyalara kesinlikle dokunma: TicketService.java, NotificationService.java
```

#### Aşama J-D: TicketService'e jBPM Tetikleyici (Cursor)

`createTicketForCustomer` metodunun sonuna bir satır eklenecek:

```java
jbpmService.startTicketProcess(persisted.getId(), persisted.getPriority().name());
```

Bu satır şu an `kafkaLogProducer.sendLog(...)` çağrısının hemen altına gelecek.

**Cursor Prompt D:**
```
TicketService.java dosyasında sadece şu değişikliği yap:

createTicketForCustomer metodunda, notificationService.notifyTicketCreated(persisted.getId()) 
çağrısının hemen ALTINA şu satırı ekle:
jbpmService.startTicketProcess(persisted.getId(), persisted.getPriority().name());

Constructor injection için: JbpmService'i @RequiredArgsConstructor ile inject et (sınıf başına field ekle).

BAŞKA HİÇBİR DOSYAYA DOKUNMA.
```

### jBPM Test Sırası

1. `docker-compose up -d jbpm-server` → 2-3 dakika bekle
2. `http://localhost:8180/business-central` → admin/admin
3. Proje deploy et (J-B)
4. Backend başlat
5. Customer olarak yeni ticket oluştur
6. Business Central → Manage → Process Instances → yeni instance var mı?
7. HIGH priority ticket için timer'ı test etmek için: Business Central'da timer'ı 1 dakikaya çek (test modunda)
8. 1 dakika sonra `POST /api/webhook/jbpm/sla-breach` logda görünüyor mu?

---

## BÖLÜM 3 — Frontend Notification Merkezi (X-01)

Backend hazır, sadece UI yazılacak.

### Mevcut durum
`NotificationCenter.jsx` dosyası `shell/` altında mevcut ama içeriği boş veya placeholder.
`/api/notifications` endpoint'i çalışıyor.
`RoleTopbar.jsx`'te `notifications` action'ı var ve `TopbarAction` renderer'ı `NotificationCenter` component'ini render ediyor.

### Yapılacaklar

**Cursor Prompt:**
```
Destrova ITSM frontend'inde NotificationCenter component'ini gerçek API'ye bağla.

Dosya: frontend/src/components/destrova/shell/NotificationCenter.jsx

Yapılacaklar:
1. useEffect ile GET /api/notifications çağır (api.js'deki publicApi kullan, token gerekiyor)
2. GET /api/notifications/unread-count ile rozet sayısını al
3. Zil ikonu üzerine okunmamış sayı rozeti (kırmızı badge)
4. Zil'e tıklayınca dropdown aç
5. Dropdown içinde bildirim listesi: mesaj, tarih, okundu mu
6. Her bildirime tıklayınca PATCH /api/notifications/{id}/read çağır
7. "Tümünü okundu işaretle" butonu → PATCH /api/notifications/read-all
8. Bildirime tıklayınca ilgili ticket'a git (related_ticket_id varsa openTicket(id) çağır)
9. Boş durum: "No notifications yet" mesajı

Stil: RoleTopbar.jsx'teki mevcut dark/light tema prop'unu kullan.
api.js'e iki fonksiyon ekle: getNotifications() ve markNotificationRead(id) ve markAllRead()

Dikkat: Sadece bu dosya ve api.js değişecek. Başka dosyaya dokunma.
```

---

## BÖLÜM 4 — Frontend Manager Ticket Detail Düzeltmeleri

Eksik listesindeki F-04, F-06, F-07, F-08, F-09 hepsi `ManagerTicketDetailView.jsx` ile ilgili.

### Durum tespiti

Kodu okudum: attachment endpoint'leri backend'de çalışıyor (`uploadAttachment`, `getAttachments`, `downloadAttachment`). Frontend'de wire edilmemiş veya görüntülenmiyor.

**Cursor Prompt:**
```
ManagerTicketDetailView.jsx dosyasını düzelt.

Sorunlar:
1. F-04: Manager dosya yükleyemiyor — uploadAttachment fonksiyonunu manager için de aktif et
2. F-08: Attachments listesi görünmüyor — getAttachments çağrısı yap, dosyaları listele
3. F-09: Timeline'da dosya yüklemesi gösterilmiyor — comment timeline'ında attachment event'lerini göster
4. F-06: Timeline karışık — SYSTEM yorumları gri/italic, AGENT yorumları sağda, USER yorumları solda göster. Internal badge ekle.
5. F-07: Composer en altta kaybolmuyor — sticky bottom ile sabitle

Her düzeltme için mevcut api.js fonksiyonlarını kullan (uploadAttachment, getAttachments, downloadAttachment zaten var).
Başka dosyaya dokunma.
```

---

## BÖLÜM 5 — Backend: Agent Ticket Devri

Eksik B-01 ve B-13: `PUT /api/tickets/{id}/transfer` endpoint'i yok.

### Durum tespiti

`transferAllTickets` manager için var. Agent için tek ticket devri yok. Analiz raporunda "Agent üzerindeki ticket'lardan birini veya birden fazlasını başka bir agent'a devredebilir, devir nedeni belirterek" yazıyor.

**Cursor Prompt:**
```
Destrova ITSM'e agent ticket devri ekle.

Yeni DTO: TransferTicketRequest.java
- Long toAgentId (zorunlu)
- String transferReason (zorunlu: VACATION / OVERLOAD / EXPERTISE / KNOWLEDGE_GAP)
- String transferNote (opsiyonel, açıklama)

TicketController.java'ya:
POST /api/tickets/{id}/transfer → AGENT, MANAGER, ADMIN rolü
Body: TransferTicketRequest

TicketService.java'ya:
transferTicket(Long ticketId, TransferTicketRequest request, Authentication auth) metodu:
- Ticket var mı kontrol et
- Agent ise sadece kendi ticket'ını devredebilir
- assignWithLimitCheck(ticket, request.getToAgentId()) çağır
- saveSystemComment: "Ticket transferred to [name]. Reason: [transferReason]. [transferNote]"
- notificationService.notifyTicketTransferred(ticket.getId(), request.getToAgentId()) çağır

Mevcut transferAllTickets metoduna dokunma.
```

---

## BÖLÜM 6 — Backend: Attachment Validasyonu

Eksik B-05 ve B-06: 5 dosya / 10MB sınırı ve dosya türü kontrolü yok.

**Cursor Prompt:**
```
Destrova ITSM backend'ine attachment validasyonu ekle.

TicketController.java'daki POST /api/tickets/{id}/attachments endpoint'ine:
1. Maksimum dosya sayısı: Bir ticket'ta mevcut attachment sayısını al.
   Eğer mevcut + yeni ≥ 5 ise hata fırlat: "Maximum 5 files per ticket allowed."
2. Maksimum dosya boyutu: file.getSize() > 10 * 1024 * 1024 ise hata fırlat: "File size cannot exceed 10MB."
3. İzin verilen türler: .jpg, .jpeg, .png, .pdf, .txt, .log, .zip
   file.getOriginalFilename() uzantısını kontrol et, izin verilmiyorsa hata fırlat.

Hata türü: ResponseStatusException(HttpStatus.BAD_REQUEST, mesaj)
Başka dosyaya dokunma.
```

---

## BÖLÜM 7 — Kafka Docker Servisi (K-01, K-02)

Backend kodunda `KafkaLogProducer` zaten inject edilmiş ve `sendLog()` çağrıları var. Eksik olan Docker servisi.

**Cursor Prompt:**
```
docker-compose.yml dosyasına Kafka + Zookeeper + OpenSearch servisleri ekle.

Eklenecekler:
1. zookeeper: confluentinc/cp-zookeeper:7.4.0, port 2181
   ZOOKEEPER_CLIENT_PORT: 2181, ZOOKEEPER_TICK_TIME: 2000

2. kafka: confluentinc/cp-kafka:7.4.0, port 9092
   KAFKA_BROKER_ID: 1
   KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
   KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
   KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
   depends_on: zookeeper

3. opensearch: opensearchproject/opensearch:2.11.0, port 9200
   discovery.type: single-node
   DISABLE_SECURITY_PLUGIN: true
   volumes: opensearch_data kalıcı volume

4. opensearch-dashboards: opensearchproject/opensearch-dashboards:2.11.0, port 5601
   OPENSEARCH_HOSTS: '["http://opensearch:9200"]'
   DISABLE_SECURITY_DASHBOARDS_PLUGIN: true
   depends_on: opensearch

application.properties'e ekle: spring.kafka.bootstrap-servers=localhost:9092
Kafka bağlantısı başarısız olunca uygulama başlamasın diye: spring.kafka.producer.retries=3

Başka dosyaya dokunma.
```

---

## BÖLÜM 8 — OpenTelemetry

**Cursor Prompt:**
```
Destrova ITSM'e OpenTelemetry entegrasyonu ekle.

1. docker-compose.yml'a OTel Collector ekle:
   image: otel/opentelemetry-collector-contrib:0.95.0
   ports: 4317 (gRPC), 4318 (HTTP)
   config volume: ./otel-collector-config.yaml:/etc/otelcol/config.yaml

2. Proje kökünde otel-collector-config.yaml oluştur:
   receivers: otlp (grpc + http)
   exporters: logging (console) + opensearch (http://opensearch:9200)
   service pipeline: traces + metrics → logging + opensearch

3. backend/pom.xml'e ekle:
   io.opentelemetry.instrumentation:opentelemetry-spring-boot-starter:2.0.0

4. application.properties'e ekle:
   otel.service.name=destrova-backend
   otel.exporter.otlp.endpoint=http://localhost:4317
   otel.traces.exporter=otlp
   otel.metrics.exporter=otlp

Başka dosyaya dokunma.
```

---

## BÖLÜM 9 — Birim Testleri

Tasarım raporunda §9.1 "JUnit ve Mockito ile birim testleri" gereksinimi var.

### Öncelikli test senaryoları

**Cursor Prompt:**
```
Destrova ITSM backend'ine JUnit 5 + Mockito birim testleri ekle.

Yeni dosya: backend/src/test/java/com/ticket/backend/service/TicketServiceTest.java

Test senaryoları:
1. createTicketForCustomer: JWT ile ticket oluşturunca creatorId set ediliyor mu?
2. validateStatusTransition: Geçersiz geçiş (CLOSED → IN_PROGRESS) exception fırlatıyor mu?
3. assignWithLimitCheck: Limit aşılınca IllegalStateException fırlatıyor mu?
4. approveResolution: Müşteri olmayan biri onaylayamıyor mu? (AccessDeniedException)
5. transferAllTickets: fromAgentId == toAgentId ise exception fırlatıyor mu?
6. SLA hesaplama: HIGH priority → 4 saat, MEDIUM → 24 saat, LOW → 48 saat doğru mu?

Mock edilecekler: TicketRepository, UserRepository, NotificationService, KafkaLogProducer, AppUserService

@ExtendWith(MockitoExtension.class) kullan.
Başka dosyaya dokunma.
```

---

## BÖLÜM 10 — Frontend Düzeltmeleri

### 10.1 Customer Ekran UI (F-01, F-02, F-03)

**Cursor Prompt:**
```
CustomerMyTicketsView.jsx ve CustomerNewTicketView.jsx dosyalarında UI iyileştirme:

F-01: Arka plan gradient kaldır — düz beyaz veya çok hafif gri yap
F-02: Sekme çerçeveleri — ring ve box-shadow kaldır, sadece border-bottom ile aktif tab göster
F-03: Sayfalama — lacivert arka planlarda metin rengini white yap (dark background tespiti)

Stil değişiklikleri sadece bu iki dosyada. Backend'e dokunma.
```

### 10.2 i18n Türkçe Dil Desteği

**Cursor Prompt (ayrı oturum — büyük iş):**
```
react-i18next ile Destrova ITSM'e Türkçe/İngilizce dil desteği ekle.

Adım 1: Kurulum
npm install i18next react-i18next

Adım 2: src/i18n/i18n.js oluştur
- lng: 'tr' (varsayılan Türkçe)
- fallbackLng: 'en'
- localStorage key: 'destrova-lang'
- resources: tr ve en namespace'leri

Adım 3: src/i18n/locales/tr.json oluştur
[aşağıdaki tüm metinleri Türkçeleştir]

Adım 4: src/i18n/locales/en.json oluştur
[İngilizce orijinal metinler]

Adım 5: LanguageSwitcher.jsx oluştur (src/i18n/)
- Profil dropdown'a eklenecek
- 🇹🇷 Türkçe ve 🇬🇧 English seçenekleri
- Aktif dilde checkmark
- i18n.changeLanguage() çağrısı

Adım 6: main.jsx'e import './i18n/i18n.js' ekle

Adım 7: RoleTopbar.jsx'teki ProfileButton'a LanguageSwitcher ekle

Sonraki promptlarda her rol için ayrı ayrı view dosyaları çevrilecek.
```

---

## BÖLÜM 11 — GitHub Commit Stratejisi

Her büyük iş bittikten sonra commit at. Öneri:

```
feat: initial project setup — core entities, Spring Boot config       ← İlk commit (şimdi)
feat: ticket lifecycle — CRUD, SLA calculation, status transitions
feat: user roles — Customer, Agent, Manager, Admin with Keycloak
feat: manager dashboard and reports with real API
feat: admin panel — user management, product catalog
feat: notification system — in-app notifications with @Async
feat: email integration — Spring Mail with MailHog
feat: Kafka log streaming — async event publishing
feat: jBPM integration — process instances and SLA timers
feat: OpenTelemetry — distributed tracing
test: unit tests for TicketService business logic
fix: manager ticket detail — attachment display and upload
feat: i18n — Turkish/English language support
```

Bu commit mesajları chronological sırayla atılırsa proje geliştirme süreci anlamlı görünür.

**Git date trick (opsiyonel — dikkatli kullan):** Eğer geçmişe dönük commit tarihi ayarlamak istersen:
```
git commit --date="2026-04-01T10:00:00" -m "feat: initial project setup"
```
Bu teknik mevcuttur ama risklidir — tutarsız tarihler şüphe yaratabilir. Önermem. Asıl yetkinlik kodda gösterilir.

---

## BÖLÜM 12 — Yapılmayacaklar / Ertelenenler

| ID | İş | Neden Ertelendi |
|----|-----|-----------------|
| A-01 | 2FA | Keycloak config değişikliği, jüri öncesi riski yüksek |
| A-02 | HTTPS | Nginx + SSL sertifikası gerekiyor, lokal geliştirmede gerekli değil |
| B-08 | Full-text search | PostgreSQL FTS veya Elasticsearch büyük ekleme |
| B-09 | Pagination | Frontend client-side filtering şimdilik yeterli |
| E-01/02 | Ekip/ürün bazlı atama | Yeni entity değişikliği gerekiyor |
| R-04 | WeeklyFlow prev/lastWeek | Backend ek sorgu, düşük öncelik |

---

## BÖLÜM 13 — Uygulama Sırası (Özet)

```
GÜN 1:
  ├─ [SEN] GitHub repo oluştur → ilk commit → push
  ├─ [SEN] .gitignore doğrula
  └─ [Cursor] docker-compose.yml → jBPM servisi ekle (Prompt J-A)

GÜN 2:
  ├─ [SEN] jBPM Business Central'da BPMN tasarla (Prompt J-B — manual)
  ├─ [Cursor] JbpmService + WebhookController (Prompt J-C)
  └─ [Cursor] TicketService jBPM tetikleyici (Prompt J-D)

GÜN 3:
  ├─ [Cursor] NotificationCenter frontend (Prompt Bölüm 3)
  └─ [Cursor] Manager ticket detail düzeltmeleri (Prompt Bölüm 4)

GÜN 4:
  ├─ [Cursor] Agent ticket devri (Prompt Bölüm 5)
  ├─ [Cursor] Attachment validasyon (Prompt Bölüm 6)
  └─ [Cursor] Kafka Docker servisi (Prompt Bölüm 7)

GÜN 5:
  ├─ [Cursor] OpenTelemetry (Prompt Bölüm 8)
  ├─ [Cursor] Birim testleri (Prompt Bölüm 9)
  └─ [Cursor] Customer UI düzeltmeleri (Prompt 10.1)

GÜN 6+:
  └─ [Cursor] i18n Türkçe dil desteği (Prompt 10.2 — büyük iş, ayrı oturum)

Her gün sonunda: git add . → git commit → git push
```

---

## BÖLÜM 14 — Cursor'da Çalışırken Dikkat Edilecekler

1. **Her prompt tek iş yapmalı** — birden fazla dosya değiştiren büyük prompt'lar hata üretir
2. **Mevcut dosyaları context'e ekle** — `@TicketService.java` diyerek dosyayı Cursor'a ver
3. **"Başka dosyaya dokunma" her prompt'a ekle** — Cursor bazen alakasız dosyaları değiştirir
4. **Compile kontrolü** — her prompt sonrası `./mvnw compile` (backend) veya `npm run build` (frontend)
5. **jBPM prompt'ları özellikle hassas** — TicketService 500+ satır, yanlış değişiklik sistemi kırar
6. **Git commit Cursor'dan önce** — her büyük değişiklikten önce mevcut çalışan kodu commit et
