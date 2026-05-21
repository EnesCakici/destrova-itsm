# Destrova ITSM — Proje Dokümanı
> Güncel durum, mimari ve ilerleme yol haritası  
> Son güncelleme: Nisan 2026

---

## 1. Proje Nedir?

Destrova, kurumsal destek operasyonlarını yönetmek için geliştirilmekte olan bir **IT Service Management (ITSM) ticket sistemidir.** Müşterilerin destek talebi açması, ajanların bu talepleri işlemesi, yöneticilerin ekip ve SLA performansını izlemesi, adminlerin sistemi yapılandırması hedeflenmektedir.

---

## 2. Kullanıcı Rolleri

| Rol | Yetkiler |
|-----|----------|
| **Customer** | Ticket oluşturma, kendi ticketlarını görme, çözüm onaylama/reddetme |
| **Agent** | Atanan ticketları işleme, yorum & worklog ekleme, dosya yükleme |
| **Manager** | Tüm ticketları görme, ekip yükünü yönetme, raporları görme, ticket kapatma |
| **Admin** | Tüm yetkiler + kullanıcı yönetimi + sistem yapılandırması |

---

## 3. Teknoloji Stack'i

### Frontend
- **React** + **Vite** + **Tailwind CSS**
- **Keycloak** (kimlik doğrulama — JWT)
- **Axios** (API istekleri)
- Özel bileşen sistemi: `destrova/` altında rol bazlı klasörler

### Backend
- **Spring Boot** (Java)
- **Keycloak** (JWT doğrulama, rol yönetimi)
- **PostgreSQL** (veritabanı)
- **Flyway** (migration yönetimi)
- **JPA / Hibernate** (ORM)

### Altyapı (Docker Compose)
- PostgreSQL
- Keycloak

---

## 4. Veri Modeli (Özet)

```
Ticket
  ├── id, title, description
  ├── status: NEW | IN_PROGRESS | WAITING_FOR_CUSTOMER | RESOLVED | CLOSED
  ├── priority: HIGH | MEDIUM | LOW
  ├── slaState: SAFE | AT_RISK | BREACHED | PAUSED | STOPPED (computed)
  ├── slaDueDate (HIGH=4h, MEDIUM=24h, LOW=48h)
  ├── creatorId → User (Customer)
  ├── assigneeId → User (Agent)
  ├── product → Product
  ├── comments: Comment[]
  ├── worklogs: Worklog[]
  └── attachments: Attachment[]

User
  ├── id, name, role, keycloakSub
  └── maxTicketLimit (agent kapasitesi)

Product
  ├── id, name, description

Comment
  ├── message, authorType (USER | AGENT | SYSTEM)
  └── isInternal (agent-only notlar)

Worklog
  └── agentId, durationMinutes, description

Attachment
  └── fileName, fileSize, uploadedAt
```

### SLA Kuralları
- **HIGH priority:** 4 saat içinde kapatılmalı
- **MEDIUM priority:** 24 saat
- **LOW priority:** 48 saat
- WAITING_FOR_CUSTOMER durumunda SLA duraklar, müşteri yanıtında süresi uzatılır
- Resolved → In Progress (müşteri red) durumunda da SLA uzatılır

---

## 5. Mevcut API Endpoint'leri

### Ticket (`/api/tickets`)
| Method | Path | Rol | Açıklama |
|--------|------|-----|----------|
| GET | `/api/tickets` | Tümü | Rol bazlı liste (customer: kendi, diğerleri: tümü) |
| GET | `/api/tickets/{id}` | Tümü | Detay |
| POST | `/api/tickets` | Customer | Yeni ticket |
| PUT | `/api/tickets/{id}` | Tümü | Güncelleme |
| DELETE | `/api/tickets/{id}` | Manager, Admin | Silme |
| POST | `/api/tickets/{id}/assign` | Agent, Manager, Admin | Atama |
| POST | `/api/tickets/{id}/comments` | Tümü | Yorum ekleme |
| POST | `/api/tickets/{id}/worklogs` | Agent, Admin | Worklog |
| POST | `/api/tickets/{id}/approve` | Customer | Çözümü onayla |
| POST | `/api/tickets/{id}/reject` | Customer | Çözümü reddet |
| GET | `/api/tickets/{id}/attachments` | Tümü | Dosya listesi |
| POST | `/api/tickets/{id}/attachments` | Tümü | Dosya yükle |
| GET | `/api/tickets/{id}/attachments/{aid}` | Tümü | Dosya indir |
| DELETE | `/api/tickets/{id}/attachments/{aid}` | Tümü | Dosya sil |

### Manager (`/api/manager`) — MANAGER ve ADMIN rolü gerekli
| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/manager/dashboard` | Dashboard KPI (startDate, endDate) |
| GET | `/api/manager/reports` | Performans raporu (startDate, endDate) ✅ Yeni |
| GET | `/api/manager/tickets` | Filtreli liste (assigneeId, status, priority) ✅ Yeni |
| GET | `/api/manager/capacity` | Agent yük tablosu |
| PUT | `/api/manager/agents/{id}/limit` | Agent limit güncelle |
| POST | `/api/manager/transfer-all` | Toplu ticket devri |

### Diğer
| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/users/me` | Giriş yapan kullanıcı bilgisi |
| GET | `/api/products` | Ürün listesi |
| GET | `/api/agent/worklog-summary` | Agent worklog özeti |

---

## 6. Frontend Ekran Durumu

### Manager Ekranları (şu anki odak)

| Ekran | Durum | Notlar |
|-------|-------|--------|
| Dashboard | ✅ API bağlı | Mock fallback var, KPI + flow gerçek veriden |
| All Tickets | ✅ API bağlı | Mock fallback var |
| SLA Monitor | ✅ API bağlı | getAllTickets'tan türetiliyor |
| Team Workload | ⚠️ Kısmen | Agent kapasitesi API'den, ticket listesi mock |
| Reports | ⚠️ Kısmen | Hook yazıldı, API bağlandı; export & categories mock |
| Ticket Detail | ✅ API bağlı | Comment, worklog, attachment gerçek |

### Bilinen Sorunlar / Eksikler (Manager)
1. **Export butonu** — UI var, backend endpoint yok
2. **Tickets by category** — Product seeder yok, kategori dağılımı mock kalıyor
3. **Team Workload "View tickets"** — Agent'ın ticketlarını filtreli göstermiyor
4. **Reassign single agent** — UI uyarı veriyor, backend'e bağlı değil
5. **Unassign ticket** — Backend `null` assigneeId kabul etmiyor

### Agent Ekranları
| Ekran | Durum |
|-------|-------|
| Workspace (ticket listesi) | ✅ API bağlı |
| Ticket Detail | ✅ API bağlı |
| Worklog Summary | ✅ API bağlı |

### Customer Ekranları
| Ekran | Durum |
|-------|-------|
| Ticket listesi | ✅ API bağlı |
| Ticket oluşturma | ✅ API bağlı |
| Ticket detay | ✅ API bağlı |

### Admin Ekranları
| Durum |
|-------|
| ❌ Henüz başlanmadı |

---

## 7. Yol Haritası

### Faz 1 — Manager Ekranlarını Tamamla (Şu an)

**Cursor Prompt'ları (sırayla):**

**[CP-01]** Product seeder ekle — DataSeeder'a 5-6 örnek ürün  
**[CP-02]** Team Workload "View tickets" — `getFilteredTickets(assigneeId)` ile filtreli liste  
**[CP-03]** Reassign single agent — ticket transfer dialog'unu backend'e bağla  
**[CP-04]** Unassign ticket — PUT endpoint'e `assigneeId: null` desteği ekle  
**[CP-05]** Manager comments — composer'daki "wire to backend" yorumunu temizle, test et  

**Export özelliği (ertelenebilir):** Backend'de CSV/PDF üretimi için ayrı bir servis gerekiyor. Önce diğer bağlantıları tamamla.  
**Tickets by category:** Product seeder olmadan anlamlı veri gelmez. CP-01 tamamlandıktan sonra otomatik çalışacak.

---

### Faz 2 — Admin Ekranları

- Admin dashboard
- Kullanıcı yönetimi (CRUD — Keycloak entegrasyonu gerekiyor)
- Ürün/kategori yönetimi
- Sistem ayarları

---

### Faz 3 — Bildirim Sistemi

- In-app bildirim merkezi (NotificationCenter component)
- WebSocket veya SSE ile gerçek zamanlı push
- SLA breach alert — backend'de scheduler ile tetikleme
- Ticket atama bildirimi

---

### Faz 4 — E-posta Entegrasyonu

- Spring Mail / SendGrid entegrasyonu
- Ticket oluşturma onay maili
- Agent atama bildirimi
- SLA uyarı maili
- Müşterinin e-posta ile yanıt verebilmesi (inbound mail parsing)

---

### Faz 5 — İleri Altyapı

- **Kafka** — Event-driven mimari, ticket olaylarını stream et
- **jBPM** — İş akışı motoru, onay süreçleri
- **OpenTelemetry** — Distributed tracing
- **Prometheus + Grafana** — Metrik dashboard

---

## 8. Çalışma Protokolü

### Claude (AI) Ne Yapar?
- Mimari analiz ve karar verme
- Cursor prompt'u hazırlama (net, tek işe odaklı)
- Eğer benim yapabileceğim bir şey ise bana öğret, token harcamayalım boşuna. 
- Küçük dosya değişikliklerini doğrudan yazma (ama önce sana gösterir)
- Hata ayıklama ve yönlendirme

### Cursor Ne Yapar?
- Uzun, çok dosyalı değişiklikler
- Refactor işlemleri
- UI bileşeni geliştirme

### Kural: Her değişiklik öncesi onay
Claude bir şey yazmadan önce şunu söyler:
> **📁 Dosya:** `X`  
> **🔧 Değişiklik:** `Y yapılacak`  
> **Onaylıyor musun?**

Sen "evet" dedin → yazılır  
Sen "hayır" dedin → tartışılır

### Cursor Prompt Formatı
Her prompt tek bir iş yapar. Format:
```
Görev: [Ne yapılacak]
Dosya(lar): [Hangi dosya(lar) değişecek]
Bağlam: [Gerekli bilgi]
Yapılacak değişiklik: [Adım adım]
Test: [Nasıl doğrulanır]
```

---

## 9. Geliştirme Ortamı

```bash
# Backend başlatma
cd backend
./mvnw spring-boot:run

# Frontend başlatma  
cd frontend
npm run dev

# Docker (PostgreSQL + Keycloak)
docker-compose up -d
```

Frontend: http://localhost:5173  
Backend: http://localhost:8080  
Keycloak: http://localhost:8180

---

## 10. Önemli Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `frontend/src/services/api.js` | Tüm API fonksiyonları buradan |
| `frontend/src/components/destrova/manager/` | Manager UI bileşenleri |
| `frontend/src/components/destrova/manager/hooks/` | Veri hook'ları |
| `frontend/src/components/destrova/manager/data/managerMock.js` | Mock veriler |
| `backend/.../controller/ManagerController.java` | Manager endpoint'leri |
| `backend/.../service/TicketService.java` | İş mantığı |
| `backend/.../config/DataSeeder.java` | Başlangıç verisi |
