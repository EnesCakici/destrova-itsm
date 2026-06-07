# IT Servis / Ticket Yönetimi Sistemi

Ticket oluşturma, takip etme, durum yönetimi, bildirim, iş akışı ve merkezi log izleme özellikleri olan servis yönetim sistemidir.

---

## Kullanılan Teknolojiler

| Katman | Teknoloji |
|--------|-----------|
| Frontend | ReactJS, Vite, Tailwind CSS, Keycloak JS |
| Backend | Java 17, Spring Boot, Spring Data JPA / Hibernate |
| Veritabanı | PostgreSQL, Flyway |
| Kimlik Doğrulama | Keycloak, JWT (OAuth2 Resource Server) |
| Mesajlaşma | Apache Kafka |
| Log / Arama | OpenSearch |
| İş Akışı | jBPM |
| API Dokümantasyonu | Swagger / OpenAPI, springdoc-openapi |
| Loglama | SLF4J + Logback |
| Build | Maven |
| Konteyner | Docker, Docker Compose |
| Test | Spring Boot Test, Playwright (E2E) |

---

## Sistem Mimarisi

Sistem, Docker Compose üzerinde çalışan mikro servis ve altyapı bileşenlerinden oluşur:

- **Frontend** — Kullanıcı arayüzü; müşteri, agent, manager ve admin ekranlarını sunar.
- **Backend API** — Ticket yönetimi, iş kuralları, bildirimler ve jBPM entegrasyonunu yürütür.
- **PostgreSQL** — Ticket, kullanıcı, bildirim ve iş akışı projection verilerinin kalıcı deposudur.
- **Kafka** — Ticket olayları ve log/event mesajlarını taşır (`destrova-logs` topic).
- **Log Consumer** — Kafka mesajlarını tüketerek OpenSearch'e aktarır.
- **OpenSearch** — Merkezi log ve arama altyapısıdır.
- **jBPM** — `TicketLifecycleProcess` BPMN süreci ile ticket yaşam döngüsünü yönetir.
- **Swagger / OpenAPI** — REST API dokümantasyonunu sağlar.

**Teknik not:** Backend, Spring Boot Actuator üzerinden uygulama sağlık ve metrik endpoint'lerini sunacak şekilde yapılandırılmıştır.

---

## Docker Compose ile Kurulum ve Çalıştırma

### Ön koşullar

- [Docker](https://www.docker.com/) ve Docker Compose
- [Git](https://git-scm.com/)

### Sistemi başlatma

```bash
git clone https://github.com/EnesCakici/destrova-itsm.git
cd destrova-itsm
docker compose up -d --build
```

Tüm servisler (frontend, backend, log-consumer, postgres, zookeeper, kafka, opensearch) tek komutla ayağa kalkar.

### Servisleri durdurma

```bash
docker compose down
```

### Logları izleme

Tüm servisler:

```bash
docker compose logs -f
```

Belirli servisler:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f log-consumer
```

---

## Docker Compose Servisleri

| Servis | Açıklama |
|--------|----------|
| **frontend** | React tabanlı web arayüzü |
| **backend** | Spring Boot REST API |
| **log-consumer** | Kafka → OpenSearch log aktarım servisi |
| **postgres** | PostgreSQL veritabanı |
| **zookeeper** | Kafka koordinasyon servisi |
| **kafka** | Event ve log mesaj broker'ı |
| **opensearch** | Merkezi log indeksleme ve arama |

---

## Servis Adresleri

| Servis | Adres |
|--------|-------|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| OpenAPI Docs | http://localhost:8080/v3/api-docs |
| OpenSearch | http://localhost:9200 |

---

## Test Kullanıcıları (Varsayılan Hesaplar)

Sistemi lokalde test edebilmeniz ve rol bazlı ekranları görüntüleyebilmeniz için önceden tanımlanmış varsayılan kullanıcı giriş bilgileri aşağıdadır.

| Rol | Kullanıcı Adı | Email | Şifre | Açıklama |
|---|---|---|---|---|
| **Admin** | admin | admin@destrova.com | admin | Tüm sistem yetkilerine sahip yönetici hesabı. |
| **Manager** | manager | manager@destrova.com | manager | Ekip iş yükü ve dashboard raporlarını görebilen yönetici. |
| **Agent** | agent | agent@destrova.com | agent | Ticket'ları işleyen ve çözüm üreten destek personeli. |
| **Customer** | customer | customer@destrova.com | customer | Ticket oluşturan ve durumunu takip eden standart müşteri. |



## Backend API

Backend servisi ticket yaşam döngüsünün merkezindedir. Temel sorumlulukları:

- **Ticket oluşturma, listeleme ve detay görüntüleme**
- **Ticket durum güncelleme** — Atama, işleme alma, müşteriden bilgi bekleme, çözümleme, kapatma ve transfer işlemleri
- **Kullanıcı / rol bazlı erişim kontrolü** — Keycloak JWT ile kimlik doğrulama; `CUSTOMER`, `AGENT`, `MANAGER`, `ADMIN` rollerine göre endpoint yetkilendirmesi
- **Bildirim üretimi** — Ticket olaylarına bağlı uygulama içi bildirimler
- **jBPM entegrasyonu** — Ticket oluşturulduğunda `TicketLifecycleProcess` süreci başlatılır; jBPM webhook'ları ile durum projection'ı güncellenir
- **Kafka event/log gönderimi** — Ticket işlemlerinde üretilen log olayları `KafkaLogProducer` üzerinden `destrova-logs` topic'ine aktarılır
- **Ek özellikler** — Dosya ekleri, ekip yönetimi, ürün kataloğu, agent analitiği, manager raporları

---

## Frontend

React tabanlı frontend, rol bazlı ekranlar sunar:

- **Müşteri (Customer)** — Ticket oluşturma, listeleme, detay görüntüleme, onay/red işlemleri
- **Agent** — Atanan ticket'ları yönetme, durum güncelleme, worklog, bilgi tabanı
- **Manager** — Ekip iş yükü, dashboard metrikleri, raporlar
- **Admin** — Kullanıcı ve sistem yönetimi

Frontend, Keycloak üzerinden oturum açar ve Backend API ile JWT Bearer token ile haberleşir.

---

## Log Consumer

Log Consumer servisi merkezi log pipeline'ının tüketici ayağıdır:

1. Kafka `destrova-logs` topic'ini dinler.
2. Backend'den gelen ticket event/log mesajlarını tüketir.
3. Mesajları OpenSearch `destrova-logs` indeksine yazar.
4. Log kayıtlarının merkezi olarak aranabilir ve incelenebilir olmasını sağlar.

---

## PostgreSQL

| Parametre | Değer |
|-----------|-------|
| Host | `postgres` |
| Port | `5432` |
| Database | `ticket_db` |
| Username | `ticket_user` |
| Password | `ticket_password` |

Veritabanı şeması Flyway migration'ları ile yönetilir (`backend/src/main/resources/db/migration`).

---

## Kafka ve OpenSearch Log Akışı

```
Backend API → Kafka → Log Consumer → OpenSearch
```

**Akış açıklaması:**

1. Ticket oluşturma, güncelleme ve durum değişiklikleri sırasında uygulama içerisinde log olayları üretilir.
2. Bu olaylar Spring Kafka producer (`KafkaLogProducer`) üzerinden `destrova-logs` topic'ine aktarılır.
3. Log Consumer servisi mesajları tüketir ve OpenSearch'e indeksler.
4. OpenSearch üzerinde log kayıtları aranabilir ve incelenebilir.

---

## API Dokümantasyonu / Swagger

API dokümantasyonu Swagger UI üzerinden görüntülenebilir.

| Kaynak | Adres |
|--------|-------|
| Swagger UI | http://localhost:8080/swagger-ui.html |
| OpenAPI JSON | http://localhost:8080/v3/api-docs |

Swagger UI üzerinde korumalı endpoint'ler **JWT Bearer token** ile test edilebilir. Keycloak'tan alınan access token, Swagger'daki **Authorize** alanına `Bearer <token>` formatında girilir.

---

## jBPM İş Akışı

Ticket süreçleri jBPM üzerinde `TicketLifecycleProcess` (`destrova-ticket-process.TicketLifecycleProcess`) BPMN tanımı ile yönetilir. BPMN dosyası proje kökünde `TicketLifecycleProcess.bpmn` olarak yer alır.

Süreç, ticket yaşam döngüsünü signal tabanlı adımlarla yönetir:

| Adım / Sinyal | Açıklama |
|---------------|----------|
| Ticket oluşturma | Süreç başlatılır, SLA zamanlayıcıları devreye girer |
| Atama (`ASSIGNED`) | Ticket bir agent'a atanır |
| İşleme alma | Agent ticket üzerinde çalışmaya başlar |
| Müşteriden bilgi bekleme (`WAITING_FOR_CUSTOMER`) | SLA duraklatılır |
| Devam (`RESUMED`) | Müşteri yanıtından sonra süreç devam eder |
| Çözümleme (`RESOLVED`) | Agent çözüm sunar |
| Müşteri onayı / reddi | `CUSTOMER_APPROVED` veya `CUSTOMER_REJECTED` |
| Kapatma (`FORCE_CLOSED`) | Ticket kapatılır |

jBPM olayları webhook'lar aracılığıyla Backend'e iletilir ve ticket projection'ı güncellenir.

---

## Test Komutları

### Backend testleri

Proje kökünden:

```bash
cd backend
mvn test
```

Docker Compose ortamında backend konteyneri içinden:

```bash
docker compose exec backend mvn test
```

### E2E testleri (Playwright)

Sistemin çalışır durumda olduğu bir ortamda, proje kök dizininden:

```bash
npx playwright test
```

Playwright yapılandırması `playwright.config.ts` dosyasında tanımlıdır; test senaryoları `e2e/` klasöründe yer alır.

---

## Bilinen Geliştirme Alanları

Aşağıdaki konular sistemin mevcut işlevlerini etkilemeden genişletilebilecek alanlardır:

- Keycloak OTP flow ile **2FA desteğinin** genişletilmesi
- **Monitoring altyapısının** Prometheus ve Grafana ile genişletilmesi
- Sık erişilen veriler için **Redis veya in-memory cache** mekanizması eklenmesi
- Log aktarım yapısının **Log4j2 Kafka Appender** mimarisiyle genişletilmesi
- **Unit test kapsamının** daha ileri seviyeye taşınması

---

## GitHub Repository

Proje kaynak kodu:

https://github.com/EnesCakici/destrova-itsm
