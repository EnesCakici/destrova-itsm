# DESTROVA ITSM — Master QA & E2E Test Matrisi
> **Versiyon:** 1.0 | **Hazırlayan:** Kıdemli QA Otomasyon Mühendisi  
> **Kapsam:** Frontend (React/Vite), Backend (Spring Boot), jBPM (TicketLifecycleProcess), Notification, Kafka, Keycloak  
> **Hedef:** Playwright otomasyon süitine birebir aktarılabilir, sıfır boşluklu E2E test planı

---

## İÇİNDEKİLER

1. [Test Ortamı & Ön Koşullar](#1-test-ortamı--ön-koşullar)
2. [Rol Bazlı Erişim & Yetkilendirme Testleri](#2-rol-bazlı-erişim--yetkilendirme-testleri)
3. [Customer (Müşteri) Senaryoları](#3-customer-müşteri-senaryoları)
4. [Agent Senaryoları](#4-agent-senaryoları)
5. [Manager Senaryoları](#5-manager-senaryoları)
6. [Admin Senaryoları](#6-admin-senaryoları)
7. [jBPM State Machine Testleri](#7-jbpm-state-machine-testleri)
8. [SLA Engine Testleri](#8-sla-engine-testleri)
9. [Bildirim (Notification) Testleri](#9-bildirim-notification-testleri)
10. [Kafka Log Pipeline Testleri](#10-kafka-log-pipeline-testleri)
11. [Veri Validasyon & Guard Testleri](#11-veri-validasyon--guard-testleri)
12. [Güvenlik & Yetki İhlali Testleri](#12-güvenlik--yetki-i̇hlali-testleri)
13. [Transfer & Devir Senaryoları](#13-transfer--devir-senaryoları)
14. [Yorum & Worklog Senaryoları](#14-yorum--worklog-senaryoları)
15. [Attachment (Dosya Ekleme) Testleri](#15-attachment-dosya-ekleme-testleri)
16. [Dashboard & Raporlama Testleri](#16-dashboard--raporlama-testleri)
17. [Frontend Guard & Routing Testleri](#17-frontend-guard--routing-testleri)
18. [Edge Case & Concurrency Testleri](#18-edge-case--concurrency-testleri)
19. [Webhook & Shadow Comparator Testleri](#19-webhook--shadow-comparator-testleri)
20. [Test Öncelik Matrisi](#20-test-öncelik-matrisi)

---

## 1. TEST ORTAMI & ÖN KOŞULLAR

### Servisler (docker-compose.yml bazlı)
| Servis | Port | Bağımlılık |
|--------|------|-----------|
| Spring Boot Backend | 8080 | PostgreSQL, Kafka, jBPM, Keycloak |
| jBPM / KIE Server | 8180 | Ayrı process engine |
| Keycloak | 8082 | Realm: destrova |
| Kafka | 9092 | log-consumer ile birlikte |
| PostgreSQL | 5432 | Schema: destrova |
| Frontend (Vite) | 5173 | Backend API |

### Test Kullanıcı Seti (Keycloak'ta önceden oluşturulacak)
| Kullanıcı | Rol | Amaç |
|-----------|-----|------|
| `customer1@test.com` | CUSTOMER | Standart müşteri akışları |
| `customer2@test.com` | CUSTOMER | Çapraz erişim testleri |
| `agent1@test.com` | AGENT | Birincil agent |
| `agent2@test.com` | AGENT | Transfer hedefi |
| `agent-full@test.com` | AGENT | Limiti dolu agent (maxTicketLimit=1, 1 aktif ticket) |
| `manager1@test.com` | MANAGER | Manager akışları |
| `admin1@test.com` | ADMIN | Admin akışları |

### Playwright Ortam Değişkenleri (`.env.test`)
```
BASE_URL=http://localhost:5173
API_URL=http://localhost:8080
KEYCLOAK_URL=http://localhost:8082
JBPM_URL=http://localhost:8180
```

---

## 2. ROL BAZLI ERİŞİM & YETKİLENDİRME TESTLERİ

### TC-AUTH-001 · Kimlik doğrulamasız erişim engeli
| Alan | Detay |
|------|-------|
| **Önkoşul** | Oturum yok |
| **Adımlar** | 1. `http://localhost:5173/customer/tickets` adresine doğrudan git |
| **Beklenen** | `/login` sayfasına yönlendir |
| **Nasıl Test Edilir?** | `page.goto('/customer/tickets')` → `expect(page).toHaveURL('/login')` |

### TC-AUTH-002 · Rol uyumsuzluğu → `/unauthorized` yönlendirmesi
| Alan | Detay |
|------|-------|
| **Önkoşul** | `customer1` ile oturum açık |
| **Adımlar** | 1. `/agent/inbox` adresine git |
| **Beklenen** | `/unauthorized` sayfası gösterilir |
| **Nasıl Test Edilir?** | `customer1` token ile `page.goto('/agent/inbox')` → URL `/unauthorized` olmalı |

### TC-AUTH-003 · JWT süresi dolmuş token ile istek
| Alan | Detay |
|------|-------|
| **Önkoşul** | Geçersiz/süresi dolmuş JWT |
| **Adımlar** | 1. `Authorization: Bearer <expired>` ile `GET /api/tickets` isteği at |
| **Beklenen** | HTTP 401 |
| **Nasıl Test Edilir?** | `request.get('/api/tickets', { headers: { Authorization: 'Bearer expired' } })` → status 401 |

### TC-AUTH-004 · Keycloak oturum kapatma → token geçersizleşmesi
| Alan | Detay |
|------|-------|
| **Önkoşul** | `agent1` oturum açık |
| **Adımlar** | 1. Keycloak admin panelinden `agent1` oturumunu sonlandır → 2. Frontend üzerinden `GET /api/tickets` iste |
| **Beklenen** | 401 veya otomatik `/login` yönlendir |
| **Nasıl Test Edilir?** | Keycloak API ile session sonlandır → `page.reload()` → `/login` beklenir |

### TC-AUTH-005 · CUSTOMER rolü ile `/api/manager/dashboard` isteği
| Alan | Detay |
|------|-------|
| **Adımlar** | `customer1` token ile `GET /api/manager/dashboard` |
| **Beklenen** | HTTP 403 |
| **Nasıl Test Edilir?** | Direct API request → `expect(response.status()).toBe(403)` |

### TC-AUTH-006 · AGENT rolü ile `/api/admin/products` POST isteği
| Alan | Detay |
|------|-------|
| **Adımlar** | `agent1` token ile `POST /api/admin/products` |
| **Beklenen** | HTTP 403 |

---

## 3. CUSTOMER (MÜŞTERİ) SENARYOLARI

### TC-CUST-001 · Yeni ticket oluşturma — başarılı yol (Happy Path)
| Alan | Detay |
|------|-------|
| **Önkoşul** | `customer1` oturum açık, en az 1 ürün mevcut |
| **Adımlar** | 1. "New Request" butonuna tıkla → 2. Title: "Yazıcı çalışmıyor" → 3. Description: "3. katdaki HP yazıcı kağıt sıkışıyor." → 4. Priority: HIGH → 5. Ürün seç → 6. Submit |
| **Beklenen** | - HTTP 201 döner, `status: NEW`, `priority: HIGH` - `slaDueDate` = `createdAt + 4 saat` - Müşteriye `TICKET_CREATED` in-app bildirimi gelir - Kafka'ya `TICKET_CREATED` logu yazılır - jBPM süreci başlar (correlationKey = ticketId) |
| **Nasıl Test Edilir?** | Submit → `response.status() === 201` → DB'de `sla_due_date` kontrol → bildirim API'yi poll et → Kafka consumer logunu kontrol |

### TC-CUST-002 · Ticket oluşturma — başlık eksik
| Alan | Detay |
|------|-------|
| **Adımlar** | Title alanını boş bırak, description dolu → Submit |
| **Beklenen** | Form validasyon hatası, ticket oluşturulmaz |
| **Nasıl Test Edilir?** | Submit → backend `400` veya form HTML validation error mesajı gözlemle |

### TC-CUST-003 · Ticket oluşturma — description eksik
| Alan | Detay |
|------|-------|
| **Adımlar** | Description alanı boş → Submit |
| **Beklenen** | `400 Bad Request` veya validasyon hatası |

### TC-CUST-004 · Sadece kendi ticketlarını görebilme
| Alan | Detay |
|------|-------|
| **Önkoşul** | `customer1` ve `customer2` her biri 1 ticket oluşturdu |
| **Adımlar** | `customer1` ile `GET /api/tickets` |
| **Beklenen** | Sadece `customer1`'in ticketları döner, `customer2`'ninkiler gelmez |
| **Nasıl Test Edilir?** | Response'daki tüm `creatorId`'lerin `customer1`'e ait olduğunu doğrula |

### TC-CUST-005 · Başka müşterinin ticketına doğrudan erişim
| Alan | Detay |
|------|-------|
| **Adımlar** | `customer2`'ye ait `ticketId` ile `customer1` token kullanarak `GET /api/tickets/{id}` |
| **Beklenen** | HTTP 403 |

### TC-CUST-006 · Çözüm önerisi onaylama (RESOLVED → CLOSED)
| Alan | Detay |
|------|-------|
| **Önkoşul** | Ticket statüsü `RESOLVED` |
| **Adımlar** | 1. Ticket detayında "Accept Solution" butonuna tıkla |
| **Beklenen** | - Ticket `CLOSED` statüsüne geçer - `closureReason: CUSTOMER_APPROVED` - Timeline'da "Customer approved the resolution. Ticket closed." sistem yorumu eklenir - SLA durumu `STOPPED` - Müşteri + Atanan agent'a `TICKET_CLOSED` bildirimi - Kafka'ya `TICKET_CLOSED` logu |
| **Nasıl Test Edilir?** | POST `/api/tickets/{id}/actions/approve` → status 202 → ticket poll et → `status: CLOSED` |

### TC-CUST-007 · Çözüm önerisini reddetme (RESOLVED → IN_PROGRESS)
| Alan | Detay |
|------|-------|
| **Önkoşul** | Ticket statüsü `RESOLVED` |
| **Adımlar** | 1. "Decline" butonuna tıkla → 2. Red gerekçesi gir: "Sorun hâlâ devam ediyor." |
| **Beklenen** | - Ticket `IN_PROGRESS` statüsüne döner - `customerRejectionNote` kaydedilir - `slaDueDate` uzatılır (resolved süresi kadar) - Atanan agent'a `STATUS_CHANGED` / "Customer Declined" bildirimi - "Customer declined the solution — ticket reopened." sistem yorumu |
| **Nasıl Test Edilir?** | POST `/api/tickets/{id}/actions/reject` body: `{reason: "Sorun hâlâ devam ediyor."}` → 202 → ticket poll |

### TC-CUST-008 · Boş red gerekçesiyle reddetme
| Alan | Detay |
|------|-------|
| **Adımlar** | RESOLVED ticket → reject → reason: "" |
| **Beklenen** | HTTP 400, "Reason is required." |

### TC-CUST-009 · RESOLVED olmayan ticket'ı onaylama girişimi
| Alan | Detay |
|------|-------|
| **Önkoşul** | Ticket statüsü `IN_PROGRESS` |
| **Adımlar** | POST `/api/tickets/{id}/actions/approve` |
| **Beklenen** | HTTP 409, "Ticket is not awaiting approval." |

### TC-CUST-010 · Müşteri kendi kendine kapatma (customer-close)
| Alan | Detay |
|------|-------|
| **Önkoşul** | Ticket `IN_PROGRESS` statüsünde |
| **Adımlar** | POST `/api/tickets/{id}/customer-close` body: `{closureReason: "SOLVED"}` |
| **Beklenen** | Ticket `CLOSED`, `closureReason: SOLVED`, bildirimleri gönderilir |

### TC-CUST-011 · Müşteri INVALID nedenle kapatma girişimi
| Alan | Detay |
|------|-------|
| **Adımlar** | POST `/api/tickets/{id}/customer-close` body: `{closureReason: "INVALID"}` |
| **Beklenen** | HTTP 400, "Bu kapatma nedeni müşteri tarafından kullanılamaz." |

### TC-CUST-012 · WAITING_FOR_CUSTOMER durumundaki ticket'a yorum yazma → otomatik IN_PROGRESS
| Alan | Detay |
|------|-------|
| **Önkoşul** | Ticket statüsü `WAITING_FOR_CUSTOMER` |
| **Adımlar** | Müşteri yorum yazar |
| **Beklenen** | - Ticket otomatik `IN_PROGRESS`'e geçer - jBPM'e `RESUMED` sinyali gönderilir - SLA timer devam eder - Agent'a "Customer Responded" bildirimi |

### TC-CUST-013 · Müşteri internal not yazma girişimi
| Alan | Detay |
|------|-------|
| **Adımlar** | POST `/api/tickets/{id}/comments` body: `{message: "test", isInternal: true}` |
| **Beklenen** | HTTP 403, "Musteri internal yorum ekleyemez." |

### TC-CUST-014 · Müşteri ticket'ında internal yorumları görmemesi
| Alan | Detay |
|------|-------|
| **Önkoşul** | Agent bir internal not yazmış |
| **Adımlar** | `customer1` ile `GET /api/tickets/{id}` |
| **Beklenen** | Response'daki `comments` listesinde `isInternal: true` olan yorum bulunmaz |

### TC-CUST-015 · Müşteri worklog ekleme girişimi
| Alan | Detay |
|------|-------|
| **Adımlar** | POST `/api/tickets/{id}/worklogs` |
| **Beklenen** | HTTP 403 |

### TC-CUST-016 · CLOSED ticket'a yorum ekleme
| Alan | Detay |
|------|-------|
| **Önkoşul** | Ticket statüsü `CLOSED` |
| **Adımlar** | Müşteri yorum gönderir |
| **Beklenen** | HTTP 4xx veya yorum formu pasif (UI engeli) |

---

## 4. AGENT SENARYOLARI

### TC-AGENT-001 · Ticket'ı kendine atama (assign-to-me)
| Alan | Detay |
|------|-------|
| **Önkoşul** | Unassigned `NEW` ticket, `agent1` kapasitesi müsait |
| **Adımlar** | POST `/api/tickets/{id}/actions/assign-to-me` |
| **Beklenen** | - Ticket `IN_PROGRESS`'e geçer - `assigneeId = agent1.id` - jBPM'e `ASSIGNED` sinyali - Kafka'ya `TICKET_ASSIGNED` logu |

### TC-AGENT-002 · Başka agent'a atanmış ticket'ı kendine alma girişimi
| Alan | Detay |
|------|-------|
| **Önkoşul** | Ticket `agent2`'ye atanmış |
| **Adımlar** | `agent1` ile POST `/api/tickets/{id}/actions/assign-to-me` |
| **Beklenen** | HTTP 403, "Baska agente atanmis ticket kendinize atanamaz." |

### TC-AGENT-003 · Agent kapasitesi doluyken ticket alma
| Alan | Detay |
|------|-------|
| **Önkoşul** | `agent-full` kullanıcısının `maxTicketLimit=1`, 1 aktif ticket zaten var |
| **Adımlar** | `agent-full` ile yeni ticket'a assign-to-me |
| **Beklenen** | HTTP 400/409, "Agent bilet limitine ulasti!" |

### TC-AGENT-004 · WAITING_FOR_CUSTOMER sinyali gönderme
| Alan | Detay |
|------|-------|
| **Önkoşul** | Agent1'e atanmış `IN_PROGRESS` ticket |
| **Adımlar** | POST `/api/tickets/{id}/actions/wait-for-customer` |
| **Beklenen** | - Ticket `WAITING_FOR_CUSTOMER` - SLA timer `PAUSED` (slaState: "PAUSED") - jBPM'e `WAITING_FOR_CUSTOMER` sinyali - Müşteriye "Response Needed" bildirimi |

### TC-AGENT-005 · Başkasına atanmış ticket'ta wait-for-customer girişimi
| Alan | Detay |
|------|-------|
| **Önkoşul** | Ticket `agent2`'ye atanmış |
| **Adımlar** | `agent1` ile POST `/api/tickets/{id}/actions/wait-for-customer` |
| **Beklenen** | HTTP 403, "Sadece uzerinize atanmis ticket uzerinde islem yapabilirsiniz." |

### TC-AGENT-006 · Ticket'ı RESOLVE etme — resolution note ile
| Alan | Detay |
|------|-------|
| **Önkoşul** | `agent1`'e atanmış `IN_PROGRESS` ticket |
| **Adımlar** | POST `/api/tickets/{id}/actions/resolve` body: `{resolutionNote: "HP yazıcı kağıt yolu temizlendi, test başarılı."}` |
| **Beklenen** | - Ticket `RESOLVED` - `resolutionNote` DB'ye yazılır - Conversation thread'de agent yorumu eklenir - Müşteriye "Solution Proposed" bildirimi + e-posta - jBPM'e `RESOLVED` sinyali |

### TC-AGENT-007 · Boş resolution note ile resolve girişimi
| Alan | Detay |
|------|-------|
| **Adımlar** | POST `/api/tickets/{id}/actions/resolve` body: `{}` |
| **Beklenen** | HTTP 400, "Resolution note is required." |

### TC-AGENT-008 · 10 karakterden kısa resolution note ile resolve
| Alan | Detay |
|------|-------|
| **Adımlar** | POST `.../resolve` body: `{resolutionNote: "Tamam"}` (5 karakter) |
| **Beklenen** | HTTP 400, "Resolution note must be at least 10 characters." |

### TC-AGENT-009 · RESOLVED ticket'a priority değiştirme girişimi
| Alan | Detay |
|------|-------|
| **Önkoşul** | Ticket `RESOLVED` |
| **Adımlar** | POST `/api/tickets/{id}/actions/change-priority` body: `{priority: "LOW"}` |
| **Beklenen** | HTTP 409, "Cannot change priority on resolved or closed tickets." |

### TC-AGENT-010 · Priority değiştirme — geçerli akış
| Alan | Detay |
|------|-------|
| **Önkoşul** | `IN_PROGRESS` ticket |
| **Adımlar** | POST `/api/tickets/{id}/actions/change-priority` body: `{priority: "HIGH"}` |
| **Beklenen** | - Priority güncellenir - jBPM'e `PRIORITY_UPDATED` sinyali (SLA süresi yeniden hesaplanır) - jBPM değişkenleri güncellenir - Timeline'a "Priority changed: MEDIUM → HIGH" yorumu |

### TC-AGENT-011 · Force-close: INVALID neden ile
| Alan | Detay |
|------|-------|
| **Önkoşul** | `IN_PROGRESS` ticket |
| **Adımlar** | POST `/api/tickets/{id}/actions/close` body: `{closureReason: "INVALID"}` |
| **Beklened** | - Ticket `CLOSED`, `closureReason: INVALID` - jBPM'e `FORCE_CLOSED` sinyali - Bildirim gönderilir |

### TC-AGENT-012 · Force-close: CUSTOMER_APPROVED neden ile girişimi
| Alan | Detay |
|------|-------|
| **Adımlar** | POST `/api/tickets/{id}/actions/close` body: `{closureReason: "CUSTOMER_APPROVED"}` |
| **Beklenen** | HTTP 400, "CUSTOMER_APPROVED is only valid for approve action." |

### TC-AGENT-013 · Force-close: SOLVED neden ile girişimi
| Alan | Detay |
|------|-------|
| **Adımlar** | POST `.../close` body: `{closureReason: "SOLVED"}` |
| **Beklenen** | HTTP 400, "SOLVED is not a force-close reason." |

### TC-AGENT-014 · Zaten CLOSED ticket'ı force-close etme
| Alan | Detay |
|------|-------|
| **Adımlar** | POST `.../close` body: `{closureReason: "INVALID"}` |
| **Beklenen** | HTTP 409, "Ticket is already closed." |

### TC-AGENT-015 · Agent inbox — sadece ilgili ticketları görme
| Alan | Detay |
|------|-------|
| **Önkoşul** | agent1: 2 atanmış ticket, agent2: 2 atanmış ticket |
| **Adımlar** | `agent1` ile `GET /api/tickets` |
| **Beklenen** | agent2'ye atanmış ticketlar listede yok. Ancak unassigned pool ticketları (ekip ürünleri) görünür |

### TC-AGENT-016 · @mention ile erişim kazanma
| Alan | Detay |
|------|-------|
| **Önkoşul** | Ticket `agent2`'ye atanmış, bir internal yorumda `@agent1@test.com` mention var |
| **Adımlar** | `agent1` ile `GET /api/tickets/{id}` |
| **Beklenen** | HTTP 200, ticket erişilebilir (mention erişim kuralı) |

### TC-AGENT-017 · Worklog ekleme — başarılı
| Alan | Detay |
|------|-------|
| **Önkoşul** | Ticket `agent1`'e atanmış |
| **Adımlar** | POST `/api/tickets/{id}/worklogs` body: `{durationMinutes: 30, description: "Yazıcı donanım kontrolü yapıldı."}` |
| **Beklenen** | HTTP 201, worklog kaydedilir |

### TC-AGENT-018 · Sıfır dakika worklog ekleme
| Alan | Detay |
|------|-------|
| **Adımlar** | POST `.../worklogs` body: `{durationMinutes: 0, description: "Test"}` |
| **Beklenen** | HTTP 400, "Efor suresi sifirdan buyuk olmalidir." |

### TC-AGENT-019 · Unassigned ticket'a worklog ekleme (agent olarak)
| Alan | Detay |
|------|-------|
| **Önkoşul** | Ticket unassigned |
| **Adımlar** | `agent1` ile worklog ekle |
| **Beklenen** | HTTP 403 |

---

## 5. MANAGER SENARYOLARI

### TC-MGR-001 · Tüm ticketları görme
| Alan | Detay |
|------|-------|
| **Adımlar** | `manager1` ile `GET /api/tickets` |
| **Beklenen** | Sistemdeki tüm ticketlar döner (customer/agent sınırı yok) |

### TC-MGR-002 · Filtreli ticket listesi
| Alan | Detay |
|------|-------|
| **Adımlar** | `GET /api/manager/tickets?status=IN_PROGRESS&priority=HIGH` |
| **Beklenen** | Sadece `IN_PROGRESS` + `HIGH` ticketlar döner |

### TC-MGR-003 · Herhangi bir ticket'a agent atama
| Alan | Detay |
|------|-------|
| **Adımlar** | POST `/api/tickets/{id}/actions/assign` body: `{assigneeId: agent1.id}` |
| **Beklenen** | Ticket `IN_PROGRESS`, atanan agent'a bildirim |

### TC-MGR-004 · Ticket silme
| Alan | Detay |
|------|-------|
| **Adımlar** | DELETE `/api/tickets/{id}` |
| **Beklenen** | HTTP 204, ticket DB'den kaldırılır |

### TC-MGR-005 · Dashboard metriklerini görme
| Alan | Detay |
|------|-------|
| **Adımlar** | `GET /api/manager/dashboard?startDate=2026-01-01&endDate=2026-12-31` |
| **Beklenen** | `openTickets`, `slaViolations`, `atRiskTickets`, `averageResolutionHours`, `slaCompliancePercent`, `statusDistribution`, `weeklyFlow` alanları dolu döner |

### TC-MGR-006 · Agent kapasite tablosu
| Alan | Detay |
|------|-------|
| **Adımlar** | `GET /api/manager/capacity` |
| **Beklenen** | Her agent için `agentName`, `maxTicketLimit`, `activeTicketCount` döner |

### TC-MGR-007 · Agent ticket limitini güncelleme
| Alan | Detay |
|------|-------|
| **Adımlar** | PUT `/api/manager/agents/{agentId}/limit` body: `{maxTicketLimit: 10}` |
| **Beklenen** | `maxTicketLimit` güncellenir |

### TC-MGR-008 · Agent limitini sıfır veya negatif yapma girişimi
| Alan | Detay |
|------|-------|
| **Adımlar** | PUT `.../limit` body: `{maxTicketLimit: 0}` |
| **Beklenen** | HTTP 400, "Agent ticket limiti en az 1 olmalidir." |

### TC-MGR-009 · Toplu devir (transfer-all)
| Alan | Detay |
|------|-------|
| **Önkoşul** | `agent1`: 2 aktif ticket, hedef agent kapasiteli |
| **Adımlar** | POST `/api/manager/transfer-all` body: `{fromAgentId: agent1.id, toAgentId: agent2.id}` |
| **Beklenen** | `{transferredCount: 2}`, her ikisi de `agent2`'ye atanır, bildirimler gönderilir |

### TC-MGR-010 · Hedef agent kapasitesi yetersizken transfer-all
| Alan | Detay |
|------|-------|
| **Önkoşul** | `agent-full` maxLimit=1, zaten 1 aktif ticket. Transfer: 2 ticket gönderilmeye çalışılıyor |
| **Adımlar** | POST `.../transfer-all` body: `{fromAgentId: agent1.id, toAgentId: agent-full.id}` |
| **Beklenen** | HTTP 400, "Agent bilet limitine ulasti!" |

### TC-MGR-011 · Aynı agent'a transfer-all
| Alan | Detay |
|------|-------|
| **Adımlar** | POST `.../transfer-all` `fromAgentId == toAgentId` |
| **Beklenen** | HTTP 400, "Kaynak ve hedef agent ayni olamaz." |

### TC-MGR-012 · CSV rapor export
| Alan | Detay |
|------|-------|
| **Adımlar** | `GET /api/manager/reports/export?startDate=2026-01-01&endDate=2026-12-31` |
| **Beklenen** | HTTP 200, `Content-Type: text/csv`, başlıklar ve satırlar doğru formatlanmış |

### TC-MGR-013 · Manager ticket silme
| Alan | Detay |
|------|-------|
| **Adımlar** | DELETE `/api/tickets/{id}` (manager token) |
| **Beklenen** | HTTP 204 |

---

## 6. ADMIN SENARYOLARI

### TC-ADMIN-001 · Ürün oluşturma
| Alan | Detay |
|------|-------|
| **Adımlar** | POST `/api/admin/products` body: `{name: "SAP ERP", isActive: true}` |
| **Beklenen** | HTTP 200/201, ürün oluşturulur |

### TC-ADMIN-002 · Ürün güncelleme
| Alan | Detay |
|------|-------|
| **Adımlar** | PUT `/api/admin/products/{id}` body: `{name: "SAP ERP v2", isActive: false}` |
| **Beklenen** | Güncellenir, artık aktif olmayan ürün yeni ticket formunda görünmez |

### TC-ADMIN-003 · Aktif ticket özeti görme
| Alan | Detay |
|------|-------|
| **Adımlar** | `GET /api/admin/overview/tickets` |
| **Beklenen** | `{activeTickets: N}`, N = CLOSED olmayan ticket sayısı |

### TC-ADMIN-004 · Keycloak kullanıcı yönetimi erişimi (AdminUserController)
| Alan | Detay |
|------|-------|
| **Adımlar** | Admin ile Keycloak kullanıcı listeleme/düzenleme endpointleri |
| **Beklenen** | HTTP 200, diğer roller 403 |

### TC-ADMIN-005 · Admin olarak herhangi bir ticket'a atama
| Alan | Detay |
|------|-------|
| **Adımlar** | Admin ile POST `/api/tickets/{id}/actions/assign` herhangi bir ticket için |
| **Beklenen** | Atama başarılı (assignee kontrolü olmaksızın) |

### TC-ADMIN-006 · Admin ticket worklog ekleme
| Alan | Detay |
|------|-------|
| **Adımlar** | Admin ile POST `.../worklogs` (atanmış olmasa da) |
| **Beklenen** | HTTP 201 (admin assignee kontrolünden muaf) |

---

## 7. jBPM STATE MACHINE TESTLERİ

> **Sinyal Haritası** (TicketLifecycleProcess.bpmn'den çıkartılmış):
> `ASSIGNED`, `WAITING_FOR_CUSTOMER`, `RESUMED`, `RESOLVED`, `CUSTOMER_APPROVED`, `CUSTOMER_REJECTED`, `FORCE_CLOSED`, `PRIORITY_UPDATED`, `PRIORITY_UPDATED_BREACH`, `SLA_BREACH_CHECK`

### TC-JBPM-001 · Süreç başlatma (startTicketProcess)
| Alan | Detay |
|------|-------|
| **Önkoşul** | Yeni ticket oluşturuldu |
| **Adımlar** | Ticket oluştur → jBPM REST API'sini sorgula: `GET /kie-server/services/rest/server/queries/processes/instance/correlation/{ticketId}` |
| **Beklenen** | HTTP 200, process instance aktif, `ticketId` correlationKey olarak kayıtlı |

### TC-JBPM-002 · Aynı ticketId ile ikinci kez süreç başlatma (409 idempotency)
| Alan | Detay |
|------|-------|
| **Adımlar** | Aynı `ticketId` ile `startTicketProcess` tekrar çağır |
| **Beklenen** | jBPM 409 döner → log'da "correlation key conflict — skipping duplicate start" görülür, exception fırlatılmaz |

### TC-JBPM-003 · ASSIGNED sinyali → statü IN_PROGRESS
| Alan | Detay |
|------|-------|
| **Adımlar** | POST `/api/tickets/{id}/actions/assign` → `signalProcessSync` → jBPM process variables kontrol |
| **Beklenen** | jBPM'de `currentStatus = IN_PROGRESS`, `assigneeId` güncellendi |

### TC-JBPM-004 · WAITING_FOR_CUSTOMER sinyali → SLA pause
| Alan | Detay |
|------|-------|
| **Adımlar** | wait-for-customer sinyali gönder → jBPM variables kontrol |
| **Beklenen** | jBPM'de `slaPaused = true`, `waitingStartedAt` set edildi |

### TC-JBPM-005 · RESUMED sinyali → SLA devam + pause süresinin hesabı
| Alan | Detay |
|------|-------|
| **Önkoşul** | Ticket `WAITING_FOR_CUSTOMER`, 30 dakika bekletildi |
| **Adımlar** | resume sinyali gönder |
| **Beklenen** | `slaPaused = false`, `totalPausedDuration` artmış, SLA timer daki 30 dk daha uzatılmış |

### TC-JBPM-006 · RESOLVED sinyali → süreç "resolved" durumuna geçiş
| Alan | Detay |
|------|-------|
| **Adımlar** | resolve eylemi → jBPM process instance variables kontrol |
| **Beklenen** | `currentStatus = RESOLVED`, `resolvedAt` set edildi |

### TC-JBPM-007 · CUSTOMER_APPROVED sinyali → süreç sona erer
| Alan | Detay |
|------|-------|
| **Adımlar** | approve eylemi |
| **Beklened** | jBPM process instance tamamlandı (completed state), `closedAt` set |

### TC-JBPM-008 · CUSTOMER_REJECTED sinyali → IN_PROGRESS'e dönüş
| Alan | Detay |
|------|-------|
| **Adımlar** | reject eylemi → jBPM variables kontrol |
| **Beklened** | `currentStatus = IN_PROGRESS`, `customerRejectionNote` yazıldı |

### TC-JBPM-009 · FORCE_CLOSED sinyali
| Alan | Detay |
|------|-------|
| **Adımlar** | force-close eylemi → jBPM kontrol |
| **Beklenen** | Process instance tamamlandı, `closureReason` set |

### TC-JBPM-010 · PRIORITY_UPDATED sinyali — 3 adımlı akış
| Alan | Detay |
|------|-------|
| **Adımlar** | 1. change-priority → 2. Kodu: correlationKey → processInstanceId çöz → 3. Variables güncelle → 4. PRIORITY_UPDATED sinyali at |
| **Beklenen** | jBPM'de `priority` değişti, SLA loop yeniden başladı |

### TC-JBPM-011 · jBPM unavailable → JbpmUnavailableException yayılması
| Alan | Detay |
|------|-------|
| **Adımlar** | jBPM servisini durdur → resolve eylemi dene |
| **Beklenen** | HTTP 503 veya 500, "jBPM is unreachable" mesajı, ticket DB'de değişmez |

### TC-JBPM-012 · Var olmayan ticketId için sinyal gönderme
| Alan | Detay |
|------|-------|
| **Adımlar** | jBPM'de süreci olmayan `ticketId=99999` ile sinyal gönder |
| **Beklenen** | 404 → `TicketActionConflictException` fırlatılır |

### TC-JBPM-013 · Webhook üzerinden jBPM → Backend güncelleme
| Alan | Detay |
|------|-------|
| **Adımlar** | jBPM iş kuralı tetikleyerek WebhookController'a POST at |
| **Beklenen** | `WebhookEventService` işler, `WebhookProcessedEvent` kaydedilir, çift işleme engellenir |

---

## 8. SLA ENGINE TESTLERİ

### TC-SLA-001 · HIGH priority → 4 saatlik SLA
| Alan | Detay |
|------|-------|
| **Adımlar** | HIGH priority ticket oluştur |
| **Beklenen** | `slaDueDate = createdAt + 4h`, `slaState: SAFE` |

### TC-SLA-002 · MEDIUM priority → 24 saatlik SLA
| Alan | Detay |
|------|-------|
| **Adımlar** | MEDIUM priority ticket oluştur |
| **Beklenen** | `slaDueDate = createdAt + 24h` |

### TC-SLA-003 · LOW priority → 48 saatlik SLA
| Alan | Detay |
|------|-------|
| **Adımlar** | LOW priority ticket oluştur |
| **Beklened** | `slaDueDate = createdAt + 48h` |

### TC-SLA-004 · AT_RISK durumu (sürenin %80'i geçmişken)
| Alan | Detay |
|------|-------|
| **Adımlar** | HIGH ticket oluştur → `createdAt`'i 3.5 saat öncesine al (DB üzerinde) → `getSlaState()` çağrısını tetikle |
| **Beklened** | `slaState: AT_RISK` |

### TC-SLA-005 · BREACHED durumu
| Alan | Detay |
|------|-------|
| **Adımlar** | `slaDueDate`'i geçmişe al → ticket fetch et |
| **Beklenen** | `slaState: BREACHED` |

### TC-SLA-006 · WAITING_FOR_CUSTOMER → slaState PAUSED
| Alan | Detay |
|------|-------|
| **Adımlar** | wait-for-customer et |
| **Beklenen** | `slaState: PAUSED` |

### TC-SLA-007 · RESOLVED/CLOSED → slaState STOPPED
| Alan | Detay |
|------|-------|
| **Adımlar** | Ticket resolve veya close et |
| **Beklenen** | `slaState: STOPPED` |

### TC-SLA-008 · SLA_BREACHED bildirimi — 24 saatte bir tekrar göndermeme
| Alan | Detay |
|------|-------|
| **Adımlar** | `notifySlaBreached` iki kez çağır (aralık < 24h) |
| **Beklenen** | İkinci çağrı `countRecentByTicketAndType` kontrolü sayesinde bildirim göndermez |

### TC-SLA-009 · SLA ihlali → Manager + Assignee bildirimi
| Alan | Detay |
|------|-------|
| **Adımlar** | SLA süresi aşılmış ticket tetikle |
| **Beklened** | - Atanan agent'a `SLA_BREACHED` bildirimi - Tüm MANAGER rolündeki kullanıcılara bildirim - E-posta gönderilir |

### TC-SLA-010 · Priority HIGH → MEDIUM → SLA uzaması
| Alan | Detay |
|------|-------|
| **Adımlar** | HIGH ticket oluştur → MEDIUM'a düşür |
| **Beklened** | yeni `slaDueDate` = yeni priority SLA'sına göre hesaplanmış |

---

## 9. BİLDİRİM (NOTIFICATION) TESTLERİ

### TC-NOTIF-001 · Ticket oluşturmada müşteriye bildirim
| Alan | Detay |
|------|-------|
| **Adımlar** | Ticket oluştur → `GET /api/notifications` (customer) |
| **Beklenen** | `type: TICKET_CREATED`, mesaj `#id — Request Received|||HH:mm · We'll start working on it soon.` formatında |

### TC-NOTIF-002 · Atama bildirimi — aynı kişiye atamada bildirim yok
| Alan | Detay |
|------|-------|
| **Adımlar** | `agent1` kendi kendine atama yapar → kendi bildirimlerini kontrol et |
| **Beklenen** | Yeni `TICKET_ASSIGNED` bildirimi gelmez (aynı actor = assignee engeli) |

### TC-NOTIF-003 · Manager atadığında agent'a bildirim
| Alan | Detay |
|------|-------|
| **Adımlar** | Manager, ticket'ı `agent1`'e atar |
| **Beklenen** | `agent1` kullanıcısına `TICKET_ASSIGNED` bildirimi gelir |

### TC-NOTIF-004 · Status değişiminde müşteriye bildirim — RESOLVED
| Alan | Detay |
|------|-------|
| **Adımlar** | Agent ticket'ı resolve eder |
| **Beklenen** | Müşteriye `STATUS_CHANGED` bildirimi, message "Solution Proposed" |

### TC-NOTIF-005 · Müşteri red yaptığında agent'a bildirim
| Alan | Detay |
|------|-------|
| **Adımlar** | Müşteri çözümü reddeder |
| **Beklenen** | Atanan agent'a "Customer Declined" bildirimi |

### TC-NOTIF-006 · Müşteri yorum yazdığında agent'a bildirim
| Alan | Detay |
|------|-------|
| **Adımlar** | Müşteri normal yorum yazar |
| **Beklenen** | Atanan agent'a `COMMENT_ADDED`, "New Customer Reply" |

### TC-NOTIF-007 · Agent yorum yazdığında müşteriye bildirim
| Alan | Detay |
|------|-------|
| **Adımlar** | Agent harici yorum yazar |
| **Beklenen** | Müşteriye `COMMENT_ADDED`, "New Reply on Request" |

### TC-NOTIF-008 · Internal not → müşteriye gitmemeli
| Alan | Detay |
|------|-------|
| **Adımlar** | Agent internal not yazar |
| **Beklenen** | Müşteriye hiçbir bildirim gitmez; ilgili agent/mention kişilerine gider |

### TC-NOTIF-009 · @email mention — internal notta
| Alan | Detay |
|------|-------|
| **Adımlar** | Agent internal nota `@agent2@test.com` yazar |
| **Beklenen** | `agent2`'ye "You Were Mentioned" bildirimi gelir |

### TC-NOTIF-010 · Geçersiz e-posta ile mention → bildirim gitmemeli
| Alan | Detay |
|------|-------|
| **Adımlar** | Internal nota `@yokboylesibiri@test.com` yaz |
| **Beklenen** | DB'de kullanıcı bulunamaz, bildirim gitmez, hata fırlatılmaz |

### TC-NOTIF-011 · Ticket kapatıldığında hem müşteri hem agent'a bildirim
| Alan | Detay |
|------|-------|
| **Adımlar** | Ticket close edilir |
| **Beklenen** | Creator'a + assignee'ye `TICKET_CLOSED` bildirimi (müşteriye "Thank you!", agent'a "The request has been closed.") |

### TC-NOTIF-012 · Okunmamış bildirim sayısı (unread count)
| Alan | Detay |
|------|-------|
| **Adımlar** | 3 bildirim gönder → `GET /api/notifications/unread-count` |
| **Beklenen** | `{count: 3}` |

### TC-NOTIF-013 · Tek bildirimi okundu olarak işaretleme
| Alan | Detay |
|------|-------|
| **Adımlar** | POST `/api/notifications/{id}/read` |
| **Beklenen** | Bildirim `read: true`, unread count azalır |

### TC-NOTIF-014 · Tümünü okundu işaretleme
| Alan | Detay |
|------|-------|
| **Adımlar** | POST `/api/notifications/read-all` |
| **Beklenen** | Tüm bildirimler `read: true`, count 0 |

### TC-NOTIF-015 · Başka kullanıcının bildirimini okundu işaretleme girişimi
| Alan | Detay |
|------|-------|
| **Adımlar** | `customer1` token ile `customer2`'nin bildirim ID'sini işaretle |
| **Beklened** | `markRead` `false` döner (userId filtresi), bildirim değişmez |

### TC-NOTIF-016 · Transfer pending approval bildirimi
| Alan | Detay |
|------|-------|
| **Adımlar** | agent1, ticket'ı agent2'ye transfer isteğinde bulunur |
| **Beklenen** | agent2'ye "Transfer Request" bildirimi, agent1'e "Transfer Pending" bildirimi |

### TC-NOTIF-017 · Transfer onaylandığında bildirim
| Alan | Detay |
|------|-------|
| **Adımlar** | agent2 transfer'i onaylar |
| **Beklenen** | agent1'e "Transfer Approved" bildirimi |

### TC-NOTIF-018 · Transfer reddedildiğinde bildirim
| Alan | Detay |
|------|-------|
| **Adımlar** | agent2 transfer'i reddeder |
| **Beklenen** | agent1'e "Transfer Declined" bildirimi |

### TC-NOTIF-019 · E-posta gönderimi — müşteriye ticket oluşturma
| Alan | Detay |
|------|-------|
| **Adımlar** | Müşteri ticket oluşturur (e-posta varsa) |
| **Beklenen** | MailService aracılığıyla "Request #X received" e-postası gider (log/mock ile doğrula) |

---

## 10. KAFKA LOG PIPELINE TESTLERİ

### TC-KAFKA-001 · TICKET_CREATED logu
| Alan | Detay |
|------|-------|
| **Adımlar** | Ticket oluştur → Kafka topic `destrova-logs` dinle |
| **Beklenen** | `{action: "TICKET_CREATED", level: "INFO", ticketId: X, serviceName: "destrova-backend"}` |

### TC-KAFKA-002 · TICKET_ASSIGNED logu
| Alan | Detay |
|------|-------|
| **Adımlar** | Ticket ata |
| **Beklenen** | `{action: "TICKET_ASSIGNED", level: "INFO"}` |

### TC-KAFKA-003 · STATUS_CHANGED logu
| Alan | Detay |
|------|-------|
| **Adımlar** | Statü değiştir |
| **Beklenen** | `{action: "STATUS_CHANGED", message: "Status changed: New → In progress"}` |

### TC-KAFKA-004 · TICKET_CLOSED logu
| Alan | Detay |
|------|-------|
| **Adımlar** | Ticket kapat |
| **Beklenen** | `{action: "TICKET_CLOSED", level: "INFO"}` |

### TC-KAFKA-005 · Müşteri reddi → WARN level logu
| Alan | Detay |
|------|-------|
| **Adımlar** | Müşteri çözümü reddeder |
| **Beklenen** | `{action: "STATUS_CHANGED", level: "WARN", message: "Ticket reopened by customer rejection"}` |

### TC-KAFKA-006 · Transfer akışları için Kafka logları
| Alan | Detay |
|------|-------|
| **Adımlar** | Transfer request / approve / reject |
| **Beklened** | `TICKET_TRANSFER_REQUESTED`, `TICKET_TRANSFER_APPROVED`, `TICKET_TRANSFER_REJECTED` logları |

### TC-KAFKA-007 · Kafka broker kapalıyken graceful degradation
| Alan | Detay |
|------|-------|
| **Adımlar** | Kafka broker'ı durdur → ticket oluştur |
| **Beklenen** | Ticket başarıyla oluşturulur, Kafka log warning ile yutulur (exception cascade olmaz) |

### TC-KAFKA-008 · log-consumer servisi mesajları işliyor mu?
| Alan | Detay |
|------|-------|
| **Adımlar** | log-consumer servisini başlat → Kafka'ya log gönder → log-consumer çıktısını kontrol et |
| **Beklened** | Mesajlar consumer tarafından tüketildi |

---

## 11. VERİ VALİDASYON & GUARD TESTLERİ

### TC-VALID-001 · Title maksimum uzunluk (200 karakter)
| Alan | Detay |
|------|-------|
| **Adımlar** | 201 karakterlik title ile ticket oluştur |
| **Beklenen** | HTTP 400 veya DB constraint hatası |

### TC-VALID-002 · Resolution note minimum uzunluk (10 karakter)
| Alan | Detay |
|------|-------|
| **Adımlar** | 9 karakterlik resolution note ile resolve |
| **Beklenen** | HTTP 400 |

### TC-VALID-003 · Geçersiz priority enum değeri
| Alan | Detay |
|------|-------|
| **Adımlar** | POST `/api/tickets` body: `{..., priority: "CRITICAL"}` |
| **Beklenen** | HTTP 400, deserialization hatası |

### TC-VALID-004 · Geçersiz status enum değeri
| Alan | Detay |
|------|-------|
| **Adımlar** | PUT `/api/tickets/{id}` body: `{status: "UNKNOWN"}` |
| **Beklened** | HTTP 400 |

### TC-VALID-005 · Geçersiz transferReason
| Alan | Detay |
|------|-------|
| **Adımlar** | POST `.../transfer` body: `{toAgentId: X, transferReason: "BORED"}` |
| **Beklened** | HTTP 400, "Geçersiz transferReason. Geçerli değerler: [VACATION, OVERLOAD, EXPERTISE, KNOWLEDGE_GAP]" |

### TC-VALID-006 · Boş transferReason
| Alan | Detay |
|------|-------|
| **Adımlar** | POST `.../transfer` body: `{toAgentId: X}` (transferReason yok) |
| **Beklenen** | HTTP 400, "transferReason zorunludur." |

### TC-VALID-007 · Boş yorum mesajı
| Alan | Detay |
|------|-------|
| **Adımlar** | POST `.../comments` body: `{message: "   "}` |
| **Beklened** | HTTP 400, "Yorum mesaji zorunludur." |

### TC-VALID-008 · Negatif worklog süresi
| Alan | Detay |
|------|-------|
| **Adımlar** | POST `.../worklogs` body: `{durationMinutes: -10, description: "Test"}` |
| **Beklened** | HTTP 400 |

### TC-VALID-009 · Ticket oluşturmada JWT sub kontrolü
| Alan | Detay |
|------|-------|
| **Adımlar** | JWT'de `sub` claim'i boş olan token ile ticket oluştur |
| **Beklened** | HTTP 400, "JWT sub zorunludur." |

### TC-VALID-010 · Kendine transfer girişimi
| Alan | Detay |
|------|-------|
| **Adımlar** | POST `.../transfer` `toAgentId = mevcut assignee` |
| **Beklened** | HTTP 400, "Ticket zaten bu agent'a atanmış." |

### TC-VALID-011 · Hedef agent e-postasız iken agent-to-agent transfer
| Alan | Detay |
|------|-------|
| **Önkoşul** | `agent2`'nin DB'de e-postası yok |
| **Adımlar** | `agent1` → `agent2`'ye transfer |
| **Beklened** | HTTP 400, "Hedef agent e-posta adresi tanimli degil; mention gonderilemez." |

### TC-VALID-012 · Bekleyen transfer varken yeni transfer isteği
| Alan | Detay |
|------|-------|
| **Önkoşul** | Ticket üzerinde `pendingTransferToAgentId` dolu |
| **Adımlar** | Tekrar transfer isteği gönder |
| **Beklenen** | HTTP 409, "Bu ticket için zaten bekleyen bir devir talebi var." |

---

## 12. GÜVENLİK & YETKİ İHLALİ TESTLERİ

### TC-SEC-001 · CUSTOMER başka müşterinin ticket'ına PUT isteği
| Alan | Detay |
|------|-------|
| **Adımlar** | `customer1` token ile `customer2`'nin ticket'ına PUT |
| **Beklened** | HTTP 403 |

### TC-SEC-002 · AGENT olmayan kişinin ticket close etme girişimi
| Alan | Detay |
|------|-------|
| **Adımlar** | `customer1` ile POST `.../actions/close` |
| **Beklened** | HTTP 403 (PreAuthorize) |

### TC-SEC-003 · AGENT başkasına ait ticket'ı resolve etme girişimi
| Alan | Detay |
|------|-------|
| **Adımlar** | `agent1` token → `agent2`'ye atanmış ticket → POST `.../actions/resolve` |
| **Beklened** | HTTP 403, "Sadece uzerinize atanmis ticket uzerinde islem yapabilirsiniz." |

### TC-SEC-004 · CUSTOMER başkasına ait ticket'ı onaylama
| Alan | Detay |
|------|-------|
| **Adımlar** | `customer2` token → `customer1`'in RESOLVED ticket'ı → approve |
| **Beklened** | HTTP 403, "This request does not belong to you." |

### TC-SEC-005 · CUSTOMER başkasının transfer'ini onaylama
| Alan | Detay |
|------|-------|
| **Adımlar** | `agent1` transfer isteği → `agent2` yerine `agent3` onaylamaya çalışır |
| **Beklened** | HTTP 403, "Sadece hedef agent devir talebini onaylayabilir." |

### TC-SEC-006 · Unassigned agent WAITING_FOR_CUSTOMER set etme
| Alan | Detay |
|------|-------|
| **Adımlar** | `agent1` → farklı agent'a atanmış ticket → wait-for-customer |
| **Beklened** | HTTP 403 |

### TC-SEC-007 · MANAGER olmayan kişinin `/api/manager/*` erişimi
| Alan | Detay |
|------|-------|
| **Adımlar** | `agent1` token ile `GET /api/manager/dashboard` |
| **Beklened** | HTTP 403 |

### TC-SEC-008 · SQL injection denemesi — title alanı
| Alan | Detay |
|------|-------|
| **Adımlar** | Title: `'; DROP TABLE tickets; --` |
| **Beklened** | Ticket hatasız oluşur ama SQL çalışmaz (JPA parameterized query), DB tablosu yerinde |

### TC-SEC-009 · XSS denemesi — yorum alanı
| Alan | Detay |
|------|-------|
| **Adımlar** | Yorum: `<script>alert('xss')</script>` |
| **Beklened** | Yorum kaydedilir ama frontend'de script çalışmaz (React escaping) |

### TC-SEC-010 · IDOR — farklı customer'ın attachment'ına erişim
| Alan | Detay |
|------|-------|
| **Adımlar** | `customer2`'nin upload ettiği dosyanın URL'ini `customer1` ile eriş |
| **Beklened** | HTTP 403 veya 404 |

---

## 13. TRANSFER & DEVİR SENARYOLARI

### TC-TRNSFR-001 · Agent-to-agent transfer isteği oluşturma
| Alan | Detay |
|------|-------|
| **Adımlar** | `agent1` (atanmış) → POST `.../transfer` body: `{toAgentId: agent2.id, transferReason: "OVERLOAD", transferNote: "Hasta oldum.", internalMessage: "@agent2@test.com Seni de haberdar ettim."}` |
| **Beklened** | - `pendingTransferToAgentId = agent2.id` set - `assigneeId` hâlâ `agent1` - Internal sistem yorumu oluştu - agent2'ye bildirim, agent1'e "Transfer Pending" |

### TC-TRNSFR-002 · Transfer onayı
| Alan | Detay |
|------|-------|
| **Adımlar** | `agent2` → POST `.../transfer/approve` |
| **Beklened** | - `assigneeId = agent2.id` - `pendingTransfer*` alanları temizlendi - agent1'e "Transfer Approved" bildirimi - Kafka `TICKET_TRANSFER_APPROVED` logu |

### TC-TRNSFR-003 · Transfer reddi
| Alan | Detay |
|------|-------|
| **Adımlar** | `agent2` → POST `.../transfer/reject` body: `{note: "Kapasitem dolu."}` |
| **Beklened** | - `assigneeId` hâlâ `agent1` - `pendingTransfer*` alanları temizlendi - Internal yorum: "Transfer request declined. — Kapasitem dolu." - agent1'e "Transfer Declined" bildirimi |

### TC-TRNSFR-004 · Manager doğrudan transfer (onay gerektirmez)
| Alan | Detay |
|------|-------|
| **Adımlar** | `manager1` → POST `.../transfer` body: `{toAgentId: agent2.id, transferReason: "EXPERTISE"}` |
| **Beklened** | Anında `assigneeId = agent2.id`, pendingTransfer yok, agent2'ye bildirim |

### TC-TRNSFR-005 · Transfer onayı — kapasitesi dolu agent
| Alan | Detay |
|------|-------|
| **Önkoşul** | `agent2` kapasitesi dolu |
| **Adımlar** | agent2 transfer'i onaylamaya çalışır |
| **Beklened** | HTTP 400, limit aşımı hatası |

---

## 14. YORUM & WORKLOG SENARYOLARI

### TC-CMT-001 · Harici yorum (customer görür)
| Alan | Detay |
|------|-------|
| **Adımlar** | Agent yorum: `{message: "Sorunu inceliyorum.", isInternal: false}` |
| **Beklened** | `isInternal: false`, müşteri `GET /api/tickets/{id}` ile görür |

### TC-CMT-002 · Internal yorum (customer görmez)
| Alan | Detay |
|------|-------|
| **Adımlar** | Agent yorum: `{message: "Önceki ticket ile aynı root cause.", isInternal: true}` |
| **Beklened** | Müşteri bu yorumu ticket detayında görmez |

### TC-CMT-003 · WAITING_FOR_CUSTOMER'da müşteri yorum → otomatik IN_PROGRESS
| Alan | Detay |
|------|-------|
| **Adımlar** | Ticket `WAITING_FOR_CUSTOMER` → müşteri yorum yaz → ticket status kontrol et |
| **Beklened** | Status `IN_PROGRESS`, jBPM `RESUMED` sinyali, yorum kaydedildi, assignee bildirimi |

### TC-CMT-004 · Atanmamış agentin harici yorum yazma girişimi
| Alan | Detay |
|------|-------|
| **Adımlar** | `agent2` (atanmamış) harici yorum gönder |
| **Beklened** | HTTP 403, "Atanmamis agent musteri gorunur yorum yazamaz." |

### TC-CMT-005 · Atanmamış agent internal yorum — mention erişimi olmadan
| Alan | Detay |
|------|-------|
| **Adımlar** | `agent2` (mention erişimi yok) internal yorum gönder |
| **Beklened** | HTTP 403, "Bu ticket icin internal not yazma yetkiniz yok." |

### TC-WL-001 · Worklog özeti (week/day)
| Alan | Detay |
|------|-------|
| **Adımlar** | `GET /api/agent/analytics/worklog-summary?period=week` |
| **Beklened** | `totalLoggedMinutes`, `ticketsWorked`, `avgMinutesPerTicket`, activities, distribution, insights döner |

---

## 15. ATTACHMENT (DOSYA EKLEME) TESTLERİ

### TC-ATTACH-001 · Dosya yükleme — başarılı
| Alan | Detay |
|------|-------|
| **Adımlar** | `POST /api/attachments` multipart form ile 1MB PDF yükle |
| **Beklened** | HTTP 200/201, dosya yolunun döndüğü response |

### TC-ATTACH-002 · İzin verilmeyen dosya tipi
| Alan | Detay |
|------|-------|
| **Adımlar** | `.exe` dosyası yükle |
| **Beklened** | HTTP 400 (FileStorageService kontrol) |

### TC-ATTACH-003 · Boyut limitini aşan dosya
| Alan | Detay |
|------|-------|
| **Adımlar** | Spring Boot'ta tanımlı limit üzerinde dosya gönder |
| **Beklened** | HTTP 413 veya 400 |

### TC-ATTACH-004 · Başka ticket'ın attachment'ına erişim
| Alan | Detay |
|------|-------|
| **Adımlar** | `ticket1`'e ait dosya URL'ini `customer2` token ile eriş |
| **Beklened** | HTTP 403 |

---

## 16. DASHBOARD & RAPORLAMA TESTLERİ

### TC-DASH-001 · Dashboard metrikler — tarih aralığı olmaksızın
| Alan | Detay |
|------|-------|
| **Adımlar** | `GET /api/manager/dashboard` (parametresiz) |
| **Beklened** | Son 30 günü kapsar, tüm alanlar dolu |

### TC-DASH-002 · SLA Compliance hesabı doğruluğu
| Alan | Detay |
|------|-------|
| **Adımlar** | 4 ticket oluştur: 2 tanesi SLA'ya uygun, 2 tanesi ihlal ile kapat → dashboard'a bak |
| **Beklened** | `slaCompliancePercent: 50.0` |

### TC-DASH-003 · Status dağılım grafiği
| Alan | Detay |
|------|-------|
| **Adımlar** | Çeşitli statuslerde ticket oluştur → dashboard |
| **Beklened** | `statusDistribution` her statü için `{name, value}` içerir |

### TC-DASH-004 · Reports export CSV formatı
| Alan | Detay |
|------|-------|
| **Adımlar** | `GET /api/manager/reports/export` |
| **Beklened** | İlk satır `Product,Tickets,Avg Resolution,SLA Met %`, her ürün için satır var, virgül içeren değerler tırnak içinde |

### TC-DASH-005 · Reports — boş tarih aralığında sıfır dönüşü
| Alan | Detay |
|------|-------|
| **Adımlar** | Ticket olmayan tarih aralığı için rapor iste |
| **Beklened** | `totalCreated: 0`, `totalResolved: 0`, boş listeler (exception değil) |

### TC-DASH-006 · Agent Analytics — worklog özeti ürüne göre filtre
| Alan | Detay |
|------|-------|
| **Adımlar** | `GET /api/agent/analytics/worklog-summary?period=week&productId=1` |
| **Beklened** | Sadece ürün 1'e ait worklog ve yorumlar dahil |

---

## 17. FRONTEND GUARD & ROUTING TESTLERİ

### TC-FE-001 · HomeRedirectPage — rol bazlı yönlendirme
| Alan | Detay |
|------|-------|
| **Adımlar** | `customer1` oturum aç → `/` adresine git |
| **Beklened** | `/customer/tickets`'a yönlendir |

### TC-FE-002 · HomeRedirectPage — Agent yönlendirme
| Alan | Detay |
|------|-------|
| **Adımlar** | `agent1` oturum aç → `/` |
| **Beklened** | `/agent/inbox`'a yönlendir |

### TC-FE-003 · HomeRedirectPage — Manager yönlendirme
| Alan | Detay |
|------|-------|
| **Beklened** | Manager'ı ilgili manager view'ına yönlendir |

### TC-FE-004 · Var olmayan sayfa → 404
| Alan | Detay |
|------|-------|
| **Adımlar** | `/yokboylesibir` adresine git |
| **Beklened** | NotFoundPage göster |

### TC-FE-005 · ProtectedRoute — Keycloak auth kontrolü
| Alan | Detay |
|------|-------|
| **Adımlar** | Oturumsuz tüm protected route'lara eriş |
| **Beklened** | Hepsi login'e yönlendir |

### TC-FE-006 · RoleGuard — izin verilmeyen rol
| Alan | Detay |
|------|-------|
| **Adımlar** | CUSTOMER rolü ile agent route'una git |
| **Beklened** | `/unauthorized` |

### TC-FE-007 · Customer ticket listesi — sayfalama ve boş durum
| Alan | Detay |
|------|-------|
| **Adımlar** | Hiç ticket olmayan müşteri ile `CustomerTicketsPage` aç |
| **Beklened** | Boş durum UI görünür, hata olmaz |

### TC-FE-008 · Agent Inbox aksiyon butonu gizleme — CLOSED ticket
| Alan | Detay |
|------|-------|
| **Adımlar** | CLOSED statüsündeki ticket'ı agent olarak aç |
| **Beklened** | Resolve, Wait-for-Customer gibi aksiyon butonları görünmez |

### TC-FE-009 · SLA durumu rozeti rengi
| Alan | Detay |
|------|-------|
| **Adımlar** | BREACHED, AT_RISK, SAFE, PAUSED durumlarındaki ticket'ları listele |
| **Beklened** | Her durum için farklı renk rozeti gösterilir |

### TC-FE-010 · Action polling mekanizması
| Alan | Detay |
|------|-------|
| **Adımlar** | Agent resolve eylemi başlatır → `ActionAcceptedResponse` alır → UI poll eder |
| **Beklened** | `commandId` ile polling başlar, timeout içinde (10 sn, max 20 deneme) ticket statüsü güncellenir |

---

## 18. EDGE CASE & CONCURRENCY TESTLERİ

### TC-EDGE-001 · Eş zamanlı assign — iki agent aynı ticket için
| Alan | Detay |
|------|-------|
| **Adımlar** | `agent1` ve `agent2` aynı unassigned ticket'a aynı anda assign-to-me gönder |
| **Beklened** | Sadece biri başarılı, diğeri 409 veya limit hatası; ticket sadece 1 agent'a atanmış |

### TC-EDGE-002 · Eş zamanlı resolve + reject
| Alan | Detay |
|------|-------|
| **Adımlar** | Agent resolve + müşteri aynı anda reject gönder |
| **Beklened** | jBPM sinyal sırası korunur, son durum tutarlı, exception cascade yok |

### TC-EDGE-003 · Çok hızlı ardışık sinyal — jBPM race condition
| Alan | Detay |
|------|-------|
| **Adımlar** | 100ms arayla ASSIGNED → WAITING_FOR_CUSTOMER → RESUMED sinyalleri gönder |
| **Beklened** | Her sinyal işlenir, jBPM logs'ta out-of-order yok, DB tutarlı |

### TC-EDGE-004 · Bildirim mesajı 500 karakter sınırı
| Alan | Detay |
|------|-------|
| **Adımlar** | 600 karakterlik ticket başlığıyla bildirim üret |
| **Beklened** | Bildirim 497 karakter + "..." ile kesilir (`abbreviateMessage`) |

### TC-EDGE-005 · Atanmamış ticket RESOLVED edilmeye çalışılması
| Alan | Detay |
|------|-------|
| **Önkoşul** | Ticket unassigned (assigneeId = null) |
| **Adımlar** | Manager ile resolve eylemi |
| **Beklened** | Akış tamamlanır ya da anlamlı hata verilir (özellikle jBPM sinyal sonrası) |

### TC-EDGE-006 · slaDueDate null olan ticket'ta getSlaState()
| Alan | Detay |
|------|-------|
| **Adımlar** | DB'de `sla_due_date = null` olan aktif ticket'ı GET ile çek |
| **Beklened** | `slaState: UNKNOWN`, exception fırlatılmaz |

### TC-EDGE-007 · Ticket silinmişken bildirim servisi tetiklenirse
| Alan | Detay |
|------|-------|
| **Adımlar** | Ticket sil → async bildirim zamanlamasını bekle (afterCommit hook) |
| **Beklened** | `ticketRepository.findById` null döner, servis `return` ile çıkar, NullPointerException yok |

### TC-EDGE-008 · Keycloak preferred_username vs email vs sub çözümleme
| Alan | Detay |
|------|-------|
| **Adımlar** | `preferred_username` boş ama `name` dolu JWT ile işlem yap |
| **Beklened** | `resolveAuthorName` → `name` kullanır, exception yok |

### TC-EDGE-009 · Manager dashboard — gelecek tarih aralığı
| Alan | Detay |
|------|-------|
| **Adımlar** | `startDate = 2030-01-01` gibi gelecek tarih → dashboard |
| **Beklened** | Boş metrik seti, NaN/exception değil |

### TC-EDGE-010 · CUSTOMER_APPROVED closure reason ile customer-close denemesi
| Alan | Detay |
|------|-------|
| **Adımlar** | POST `.../customer-close` body: `{closureReason: "CUSTOMER_APPROVED"}` |
| **Beklened** | HTTP 400, "Bu kapatma nedeni müşteri tarafından kullanılamaz." |

### TC-EDGE-011 · Bekleyen transferi olan ticket silinirse
| Alan | Detay |
|------|-------|
| **Adımlar** | Ticket'a pending transfer set et → DELETE `/api/tickets/{id}` |
| **Beklened** | Ticket silinir, orphan pending transfer verisi DB'de kalmaz (cascade) |

### TC-EDGE-012 · Aynı yorum ID'sine iki kez "okundu" işaretleme
| Alan | Detay |
|------|-------|
| **Adımlar** | `markRead(notificationId, userId)` iki kez çağır |
| **Beklened** | İkinci çağrı `read: true` olan bildirimi tekrar kaydetmez (idempotent) |

---

## 19. WEBHOOK & SHADOW COMPARATOR TESTLERİ

### TC-WH-001 · Webhook isteği işleme
| Alan | Detay |
|------|-------|
| **Adımlar** | POST `/api/webhook` geçerli payload ile |
| **Beklened** | `WebhookEventService` işler, `WebhookProcessedEvent` kaydedilir |

### TC-WH-002 · Aynı webhook event ID ile çift gönderim (idempotency)
| Alan | Detay |
|------|-------|
| **Adımlar** | Aynı event ID ile iki kez POST `/api/webhook` |
| **Beklened** | İlk işlenir, ikincisi `WebhookProcessedEvent` kaydı nedeniyle atlanır |

### TC-WH-003 · WebhookShadowComparator karşılaştırması
| Alan | Detay |
|------|-------|
| **Adımlar** | jBPM webhook payload → shadow comparator → beklenen state ile karşılaştır |
| **Beklened** | Eşleşme varsa OK, fark varsa log'a uyarı yazılır |

---

## 20. TEST ÖNCELİK MATRİSİ

| Öncelik | Test Grubu | Test Case'ler | Playwright Suite |
|---------|-----------|--------------|-----------------|
| 🔴 **P0 — Blocker** | Auth & RBAC | TC-AUTH-001 ~ 006 | `auth.spec.ts` |
| 🔴 **P0 — Blocker** | Ticket Lifecycle (Happy Path) | TC-CUST-001, TC-AGENT-001, TC-AGENT-004, TC-AGENT-006, TC-CUST-006 | `lifecycle.spec.ts` |
| 🔴 **P0 — Blocker** | jBPM Sinyal Akışı | TC-JBPM-001 ~ 009 | `jbpm.spec.ts` |
| 🔴 **P0 — Blocker** | Güvenlik İhlali Engeli | TC-SEC-001 ~ 006 | `security.spec.ts` |
| 🟠 **P1 — Kritik** | SLA Engine | TC-SLA-001 ~ 010 | `sla.spec.ts` |
| 🟠 **P1 — Kritik** | Validasyon Guardları | TC-VALID-001 ~ 012 | `validation.spec.ts` |
| 🟠 **P1 — Kritik** | Bildirim Akışları | TC-NOTIF-001 ~ 019 | `notifications.spec.ts` |
| 🟠 **P1 — Kritik** | Transfer Senaryoları | TC-TRNSFR-001 ~ 005 | `transfer.spec.ts` |
| 🟡 **P2 — Önemli** | Manager/Admin Akışları | TC-MGR-001 ~ 013, TC-ADMIN-001 ~ 006 | `manager.spec.ts`, `admin.spec.ts` |
| 🟡 **P2 — Önemli** | Kafka Pipeline | TC-KAFKA-001 ~ 008 | `kafka.spec.ts` |
| 🟡 **P2 — Önemli** | Frontend Guards & Routing | TC-FE-001 ~ 010 | `frontend.spec.ts` |
| 🟢 **P3 — Normal** | Edge Cases & Concurrency | TC-EDGE-001 ~ 012 | `edge.spec.ts` |
| 🟢 **P3 — Normal** | Dashboard & Raporlama | TC-DASH-001 ~ 006 | `reports.spec.ts` |
| 🟢 **P3 — Normal** | Attachment | TC-ATTACH-001 ~ 004 | `attachments.spec.ts` |
| 🔵 **P4 — Düşük** | Webhook / Shadow | TC-WH-001 ~ 003 | `webhook.spec.ts` |

---

## NOTLAR & ÖNERİLER

### Tespit Edilen Potansiyel Riskler (Kod Analizinden)
1. **jBPM async/sync karışıklığı**: `startTicketProcess` `@Async`, ancak `signalProcessSync` senkron — jBPM unavailable olduğunda action API hata verir ama ticket oluşturma hata vermez. Bu ikili davranış test edilmeli (TC-JBPM-011).
2. **Legacy PUT endpoint**: `destrova.workflow.legacy-put-enabled=true` iken hem eski hem yeni endpoint çalışıyor. Her iki modda da testler çalıştırılmalı.
3. **Notification async after-commit**: `@Async` + `runAfterCommit` kombinasyonu race condition üretebilir — bildirim testlerinde retry/polling stratejisi kullan.
4. **SLA pause duration hesabı**: `totalPausedDurationMs` DB'de güncelleniyor ancak frontend `getSlaState()` transient hesap yapıyor — tutarlılık testi gerekli (TC-SLA-005).
5. **Agent inbox mention erişimi**: Internal yorum silindiğinde erişim kaybı testi eksik (TC-EDGE-007 genişletilebilir).

### Playwright Strateji Önerileri
- **Auth state dosyaları**: Her rol için Keycloak oturumlarını `storageState` ile kaydet, her testte yeniden login yapma.
- **API polling helper**: `ActionAcceptedResponse` dönen işlemler için `waitForTicketStatus(ticketId, status, timeout)` yardımcı fonksiyon yaz.
- **jBPM mock vs gerçek**: CI'da jBPM gerçek değilse kritik state machine testleri için WireMock/Mockito stub kullan.
- **Test izolasyonu**: Her test suite başında DB'yi seed verisiyle temizle; `afterEach` ticket silme yapmak yerine unique title prefixes ile çalış.
- **Kafka assertion**: `kafkajs` consumer ile test süiti içinde Kafka mesajlarını dinle, assertion'ı `await consumer.seek()` + timeout ile yap.
