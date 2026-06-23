# DESTROVA — Kullanıcı Hata Mesajı Envanteri

**Tarih:** 2026-06-22  
**Amaç:** Kullanıcıya ham backend / HTTP detayı göstermeden, anlaşılır enterprise mesajlara geçiş için envanter ve uygulama planı.

---

## 1. Mevcut durum özeti

| Katman | Durum |
|--------|--------|
| **Backend** | `GlobalExceptionHandler` → `{ message, status, timestamp }`. 500 → `"Unexpected error occurred."` (iyi). 400/403 çoğunlukla servis katmanındaki ham string. |
| **Dil** | Backend **TR + EN karışık**. UI çoğunlukla **EN** (i18n). |
| **Frontend — iyi örnek** | `agentCapacityMessages.js` + `formatApiErrorWithCapacityHint` → kapasite hatasını kullanıcı dostu metne çeviriyor (agent assign/transfer/manager apply). |
| **Frontend — zayıf** | `getApiErrorMessage` / `getDestrovaApiErrorMessage` backend `message`'ı **olduğu gibi** banner'a basıyor. |
| **Frontend — sessiz** | Customer yeni ticket: API hata detayı yutuluyor → sadece `"Ticket could not be created."` |

**Sonuç:** Altyapı var; tutarlı bir **error code → i18n** katmanı yok.

---

## 2. Hedef mimari (uygulama sırasında)

```
Backend exception
  → errorCode (CAPACITY_EXCEEDED, TRANSFER_PENDING, …)   [opsiyonel faz 2]
  → message (geçiş sürecinde fallback, log için)

Frontend resolveApiUserMessage(error, context)
  → bilinen code / pattern → i18n (en/tr)
  → bilinmeyen → generic fallback (asla stack / status gösterme)
```

Kullanıcı **asla** görmemeli: HTTP kodu, `26/26`, `IllegalStateException`, karışık TR backend cümleleri.  
Geliştirici / log / E2E: `status`, `message`, `errorCode` kullanmaya devam eder.

---

## 3. Backend mesaj envanteri (kullanıcıya gidebilir)

### 3.1 Kapasite & transfer (P0 — sık görülür)

| Backend mesaj (örnek) | HTTP | Tetikleyen aksiyon |
|----------------------|------|-------------------|
| `Agent bilet limitine ulasti! Mevcut: X/Y` | 400 | assign, transfer approve, transfer-all |
| `Kaynak ve hedef agent ayni olamaz.` | 400 | transfer-all |
| `Bekleyen devir talebi yok.` | 400 | transfer approve/reject |
| `Bu ticket için zaten bekleyen bir devir talebi var.` | 400 | ikinci transfer |
| `Sadece hedef agent devir talebini onaylayabilir.` | 403 | yanlış agent approve |
| `Ticket zaten bu agent'a atanmış.` | 400 | transfer aynı agent |
| `toAgentId zorunludur.` / `transferReason zorunludur.` | 400 | transfer form |

### 3.2 Yetki & sahiplik (P0)

| Backend mesaj | HTTP | Rol |
|--------------|------|-----|
| `Bu talebe erisim yetkiniz yok.` | 403 | ticket GET |
| `Bu talebi guncelleme yetkiniz yok.` | 403 | customer PUT |
| `Bu talep size ait degil.` / `This request does not belong to you.` | 403 | customer-close, approve |
| `Agent sadece kendine atama yapabilir.` | 403 | assign-to-me kuralı |
| `Baska agente atanmis ticket kendinize atanamaz.` | 403 | assign-to-me |
| `Sadece uzerinize atanmis ticket icin worklog ekleyebilirsiniz.` | 403 | worklog |
| `Agents cannot close tickets…` | 403 | agent close |
| `Only the customer can change a resolved ticket…` | 403 | agent müdahale |
| `Bu işlem için yetkiniz bulunmamaktadır.` | 403 | genel AccessDenied fallback |

### 3.3 Validasyon & form (P1)

| Backend mesaj | HTTP | Ekran |
|--------------|------|-------|
| `Title must be at most 200 characters.` | 400 | yeni ticket |
| `Title is required.` / `Description is required.` | 400 | yeni ticket |
| `Resolution note must be at least …` | 400 | agent resolve |
| `Reason is required.` | 400 | close / reject |
| `Yorum mesaji zorunludur.` | 400 | comment |
| `Efor suresi sifirdan buyuk olmalidir.` | 400 | worklog |
| `Agent ticket limiti en az 1 olmalidir.` | 400 | manager limit |
| `File size cannot exceed 10 MB.` | 400 | attachment |
| `This file type is not allowed…` | 400 | attachment |
| `Invalid or conflicting data.` | 400 | genel DB |

### 3.4 İş akışı / jBPM (P1)

| Backend mesaj | HTTP | Not |
|--------------|------|-----|
| `jBPM is unreachable` / `jBPM returned HTTP …` | 503 | workflow aksiyonları |
| `Invalid workflow transition.` | 409 | TicketActionConflict |
| `Ticket is already closed.` | 409 | geç aksiyon |
| `Ticket is not awaiting approval.` | 409 | approve/reject timing |
| `Cannot resolve a closed ticket.` | 400 | resolve |

### 3.5 Oturum & admin (P2)

| Backend mesaj | HTTP |
|--------------|------|
| `Oturum bulunamadi` | 401 |
| `E-posta adresi zorunludur.` | 400 |
| `A user with this email address already exists: …` | 400 |

### 3.6 Zaten iyi maskelenen

| Durum | Kullanıcıya giden |
|-------|-------------------|
| Beklenmeyen 500 | `Unexpected error occurred.` |
| Max upload (Spring) | `File size cannot exceed 10 MB.` |

---

## 4. Frontend ekran envanteri

### 4.1 İyi — kapasite mapping var

| Ekran | Dosya | Aksiyon |
|-------|-------|---------|
| Agent inbox — assign to me | `AgentWorkspaceSplit.jsx` | `formatApiErrorWithCapacityHint` · context `self` |
| Agent — transfer gönder | `AgentWorkspaceSplit.jsx` | context `transfer` |
| Agent — transfer onayla | `AgentWorkspaceSplit.jsx` | context `self` (limit doluysa doğru mesaj) |
| Manager ticket detail — Apply | `ManagerTicketDetailView.jsx` | context `manager` |
| Agent — dropdown uyarı | `RightRail.jsx` | `peerWarning` (proaktif, submit öncesi) |

**Eksik:** Transfer **reddet** → `getDestrovaApiErrorMessage` ham (AgentWorkspaceSplit ~535).

### 4.2 Ham backend mesajı gösteriliyor (düzeltilecek)

| Ekran | Dosya | Mekanizma | Örnek risk |
|-------|-------|-----------|------------|
| Customer ticket detail — yükleme | `CustomerPreviewPage.jsx` | `getApiErrorMessage` | `Bu talebe erisim yetkiniz yok.` |
| Customer — yanıt gönder | `CustomerPreviewPage.jsx` | `getApiErrorMessage` | TR/EN karışık |
| Customer — close / reject | `CustomerPreviewPage.jsx` | `getDestrovaApiErrorMessage` | ham backend |
| Customer — yeni ticket | `CustomerPreviewPage.jsx` | **generic only** | validasyon detayı kayboluyor |
| Agent — ticket yükle | `AgentWorkspaceSplit.jsx` | `getApiErrorMessage` | ham |
| Agent — force close | `AgentWorkspaceSplit.jsx` | `getDestrovaApiErrorMessage` | ham (kapasite dışı) |
| Agent — meta güncelle | `AgentWorkspaceSplit.jsx` | `getDestrovaApiErrorMessage` | ham |
| Agent — peer list load | `RightRail.jsx` | `getApiErrorMessage` | düşük risk |
| Manager — bulk transfer | `ManagerTeamWorkloadView.jsx` | `e.response.data.message` **direkt** | `Agent bilet limitine ulasti! 26/26` |
| Manager — limit güncelle | `ManagerTeamWorkloadView.jsx` | `e.response.data.message` direkt | `Agent ticket limiti en az 1…` |
| Manager — comment | `ManagerTicketDetailView.jsx` | `e.response.data.message` direkt | TR yorum mesajı |
| Manager — teams | `ManagerTeamsView.jsx` | `getApiErrorMessage` | ham |
| Admin — users/products | `AdminUsersRolesView.jsx`, `AdminProductsCatalogView.jsx` | `getApiErrorMessage` | ham / TR |
| Tüm load failure panelleri | `DataLoadErrorPanel.jsx` | `getApiErrorMessage` detail satırı | teknik mesaj ikinci satırda |
| Legacy hook | `useTickets.js` | `response.data.message` | `Ticket listesi yuklenemedi` fallback iyi, detail ham |

### 4.3 Eksik global parçalar

| Parça | Durum |
|-------|--------|
| React Error Boundary | Yok |
| Merkezi `resolveApiUserMessage()` | Yok (sadece capacity helper) |
| i18n error namespace (`errors.json`) | Yok — capacity `agent.json` içinde |
| `errorCode` API alanı | Yok |

---

## 5. Öncelik matrisi

| Öncelik | Kapsam | Gerekçe |
|---------|--------|---------|
| **P0** | Kapasite + transfer + manager bulk transfer | Demo'da en sık, en kötü görünen (`26/26`) |
| **P1** | Yetki (403) + validasyon (400) | Customer/agent günlük kullanım |
| **P1** | jBPM 503 / workflow 409 | Aksiyon butonları |
| **P2** | Admin, teams, load panels | Daha az sık |
| **P3** | Error Boundary, errorCode backend | Sağlamlaştırma |

---

## 6. Uygulama planı (adım adım)

> Her adım **yalnızca frontend** ile başlar (backend contract değişmez). Sistem davranışı aynı kalır.

### Adım 1 — Merkezi resolver (P0 temeli)

**Dosya:** `frontend/src/components/destrova/shared/utils/apiErrorMessages.js`

- `resolveApiUserMessage(error, { context, fallback, t })`
- Pattern eşleme:
  - kapasite → mevcut `agentCapacityMessages` (i18n'e bağla)
  - transfer pending / duplicate / wrong agent
  - generic 403 / 401 / 503 / 409
- `getDestrovaApiErrorMessage` ve kritik ekranlar bunu kullanır.

**Test:** Manuel — limit dolu agent'a assign; bulk transfer fail; mesajda `26/26` yok.

---

### Adım 2 — Manager Team Workload (P0)

**Dosya:** `ManagerTeamWorkloadView.jsx`

- `bulkError` ve `limitError` → `resolveApiUserMessage` (context: `manager` / `transfer`)

**Test:** E2E değil; manuel bulk transfer kapasite aşımı.

---

### Adım 3 — Agent transfer reddet + force close (P0 tamamlama)

**Dosya:** `AgentWorkspaceSplit.jsx`

- `handleRejectTransfer`, `handleForceClose`, ticket load → resolver

**Test:** Mevcut E2E transfer/notifications etkilenmez (status assert aynı).

---

### Adım 4 — Customer yüzeyi (P1)

**Dosyalar:** `CustomerPreviewPage.jsx`

- Load / reply / close / reject → resolver
- Yeni ticket: validasyon hatalarında backend mesajını **map'le** (title 200 char → friendly EN)

**Test:** `validation.spec.ts` (API 400), manuel UI mesajı.

---

### Adım 5 — Manager ticket detail comment + DataLoadErrorPanel (P1)

**Dosyalar:** `ManagerTicketDetailView.jsx`, `DataLoadErrorPanel.jsx`

- Comment save → resolver
- Load panel: generic başlık + **detail'de ham mesaj gösterme** (opsiyonel dev-only)

---

### Adım 6 — i18n tamamlama (P1)

**Dosyalar:** `public/locales/en/errors.json`, `tr/errors.json`

- `agentCapacityMessages` hardcoded EN → `t('errors.capacity.self')` vb.
- Manager/customer/admin error key'leri

---

### Adım 7 — Backend errorCode (P2, opsiyonel)

**Dosya:** `GlobalExceptionHandler.buildErrorResponse`

- `errorCode` alanı ekle (ör. `CAPACITY_EXCEEDED`)
- Frontend önce code'a bakar, message fallback

**Test:** E2E aynı `status` assert; opsiyonel `errorCode` assert eklenir.

---

### Adım 8 — Error Boundary (P3)

**Dosya:** `frontend/src/components/shared/AppErrorBoundary.jsx`

- Beklenmeyen React crash → “Something went wrong” + reload

---

## 7. Adım 1 sonrası doğrulama checklist

- [ ] Agent self-assign limit dolu → EN mesaj, TR/`X/Y` yok
- [ ] Agent transfer approve limit dolu → anlaşılır mesaj
- [ ] Manager bulk transfer limit → anlaşılır mesaj
- [ ] Customer 403 ticket → “You don't have access…” (TR backend yok)
- [ ] `npm run test:e2e:p1` + transfer + security — **status kodları değişmedi**
- [ ] Backend log'da orijinal mesaj hâlâ görünüyor

---

## 8. Bilinçli olarak yapılmayacaklar (bu faz)

- Full-page 500 ekranı (her API hatası için)
- Backend iş kurallarını değiştirme
- HTTP status kodlarını kullanıcıya gösterme
- E2E testlerin UI metin assert'e çevrilmesi (opsiyonel, sonra)

---

## 9. Sonraki oturum

**Tamamlandı (Adım 1 kısmi):**
- `apiErrorMessages.js` — `resolveApiUserMessage`
- `locales/{en,tr}/errors.json` + `i18n.js` namespace
- `ManagerTeamWorkloadView.jsx` — bulk transfer + limit modal

**Tamamlandı (Adım 2 — Agent workspace):**
- `AgentWorkspaceSplit.jsx` — assign, transfer, approve/decline, close, meta, composer
- `RightRail.jsx` — peer agent list load
- `agent.json` — `workspace.errors.*` (en/tr)
- `ManagerTicketDetailView.jsx` — apply + comment (bonus; full mapping + `tv` fix)

**Tamamlandı (Adım 3 — Customer):**
- `CustomerPreviewPage.jsx` — new ticket, detail load, reply, approve/reject, download
- `useTickets.js` — liste yükleme hatası
- `customer.json` — `workspace.errors.*` (en/tr)

**Tamamlandı (Adım 4–5):**
- `DataLoadErrorPanel.jsx` — mapped detail, ham backend yok
- Admin: Overview, Products, Users, Modals
- `ManagerTeamsView.jsx` — tüm CRUD hataları

**Opsiyonel (P3):** Error Boundary, backend `errorCode` alanı
