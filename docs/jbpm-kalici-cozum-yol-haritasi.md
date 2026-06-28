# jBPM Kalıcı Çözüm — Yol Haritası

> **Amaç:** `destrova-ticket-process_1.0.0-SNAPSHOT not found` hatasının tekrar etmemesi; restart/recreate sonrası workflow'un otomatik ve doğrulanabilir şekilde ayağa kalkması.

**Oluşturulma:** 2026-06-27  
**Durum:** Faz 1–5 tamamlandı; T1–T5 kabul testleri geçti (2026-06-27)

---

## 1. Sorunun özeti

| Belirti | Anlam |
|---------|--------|
| `Container 'destrova-ticket-process_1.0.0-SNAPSHOT' is not instantiated` | KIE Server ayakta ama BPMN deployment container yüklü değil |
| Business Central'da instance görüntüleme 500 | Aynı neden — runtime'da deployment yok |
| `No scheduler found for ...-timerServiceId` | PostgreSQL'de eski timer kayıtları var, motor deployment'ı bulamıyor |
| Ticket oluşuyor (201) ama süreç başlamıyor | Backend sessizce devam ediyor; healthcheck deployment'ı kontrol etmiyor |

**Kök neden:** BPMN deploy'u manuel (Business Central), ephemeral (volume yok), healthcheck yetersiz. jBPM restart/recreate sonrası otomatik deploy ya gecikiyor ya **FAILED** oluyor; sistem yine de "healthy" görünüyor.

---

## 2. Mevcut mimari (referans)

| Bileşen | Değer |
|---------|-------|
| BPMN dosyası | `TicketLifecycleProcess.bpmn` (proje kökü) |
| Container ID | `destrova-ticket-process_1.0.0-SNAPSHOT` |
| Process ID | `destrova-ticket-process.TicketLifecycleProcess` |
| Maven GAV (BC deploy) | `com.myspace:destrova-ticket-process:1.0.0-SNAPSHOT` |
| KIE REST kullanıcı | `kieserver` / `kieserver1!` |
| Docker servis | `jbpm-server` → port `8180` |
| Backend config | `destrova.jbpm.base-url` (`application-docker.yaml`) |

**Backend sabitleri:** `JbpmService.CONTAINER_ID`, `PROCESS_ID`

---

## 3. Hedef mimari

```
docker compose up
    │
    ├─ postgres-db (healthy)
    │
    ├─ jbpm-server (WildFly başlar, KIE REST ayakta)
    │     └─ volume: jbpm_m2 (Maven repo — kjar kalıcı)
    │
    ├─ jbpm-kjar-build (mvn package → jbpm_m2'ye install)  [one-shot]
    │
    ├─ jbpm-init (KIE REST ile container PUT + STARTED doğrula)  [one-shot, on-failure retry]
    │
    ├─ jbpm-reconciler (init fail / restart sonrası redeploy)  [daemon, 90s init grace]
    │
    └─ jbpm-server healthcheck: container status=STARTED  ← izleme
           │
           └─ backend (depends_on: jbpm-reconciler started; readiness jbpm hariç)
                  └─ frontend (backend readiness UP)
```

**Prensipler:**

1. Business Central **geliştirme/diagram** için kalabilir; runtime deploy **repodan otomatik**.
2. "KIE Server UP" ≠ "Workflow hazır" — tam durum `/actuator/health` ve jbpm-server healthcheck ile izlenir.
3. `jbpm-init` fail olsa bile stack **kilitlenmez** — reconciler deploy eder; ticket oluşturma deploy bitene kadar 503 döner.
4. Mevcut PostgreSQL process instance'ları korunur; yeni deploy aynı container ID ile uyumlu kalır.

---

## 4. Uygulama fazları

### Faz 1 — Healthcheck düzeltmesi ⚡ (hızlı koruma)

**Süre:** ~30–45 dk  
**Risk:** Düşük  
**Bağımlılık:** Yok

| # | Görev | Dosya |
|---|--------|-------|
| 1.1 | jbpm healthcheck: `/containers/destrova-ticket-process_1.0.0-SNAPSHOT` + `STARTED` | `docker-compose.yml` |
| 1.2 | Geçici not: deploy yokken jbpm **unhealthy** kalır (beklenen) | bu dosya |

**Doğrulama:**

```powershell
# Deploy varken:
curl.exe -sS -u "kieserver:kieserver1!" http://localhost:8180/kie-server/services/rest/server/containers/destrova-ticket-process_1.0.0-SNAPSHOT

# docker compose ps → jbpm-server healthy (deploy sonrası)
```

**Not:** Faz 1 tek başına deploy otomatikleştirmez; sadece "workflow hazır değil" durumunu görünür kılar. Faz 3 tamamlanana kadar manuel BC deploy gerekebilir.

---

### Faz 2 — Maven kjar modülü

**Süre:** ~1–2 saat  
**Risk:** Orta (GAV / process id uyumu)  
**Bağımlılık:** Yok (Faz 1 ile paralel olabilir)

| # | Görev | Dosya |
|---|--------|-------|
| 2.1 | `jbpm-process/` Maven modülü (`packaging=kjar`) | `jbpm-process/pom.xml` |
| 2.2 | BPMN + BC formatında SVG repoda commit edilir (BC Save veya yerel `generate-svg.mjs`) | `jbpm-process/.../TicketLifecycleProcess.bpmn`, `...-svg.svg` |
| 2.3 | `kmodule.xml` — process id aynı kalmalı | `jbpm-process/src/main/resources/META-INF/kmodule.xml` |
| 2.4 | GAV: `com.myspace:destrova-ticket-process:1.0.0-SNAPSHOT` (BC ile aynı) | `pom.xml` |
| 2.5 | Yerel build test: `mvn -f jbpm-process/pom.xml clean package` | — |

**Kritik uyumluluk:**

- Process id: `destrova-ticket-process.TicketLifecycleProcess` (değiştirme)
- Container id formülü: `{artifactId}_{version}` → `destrova-ticket-process_1.0.0-SNAPSHOT`

---

### Faz 3 — Otomatik deploy (jbpm-init)

**Süre:** ~1.5–2 saat  
**Risk:** Orta  
**Bağımlılık:** Faz 2

| # | Görev | Dosya |
|---|--------|-------|
| 3.1 | Paylaşımlı Maven volume | `docker-compose.yml` → `jbpm_m2` |
| 3.2 | jbpm-server'a volume mount (`/opt/jboss/.m2/repository`) | `docker-compose.yml` |
| 3.3 | `jbpm-kjar-build` servisi: Maven image, `mvn install` → volume | `docker-compose.yml`, `jbpm-process/Dockerfile` veya inline |
| 3.4 | `scripts/jbpm-deploy.sh`: bekle → PUT container → STARTED doğrula | `scripts/jbpm-deploy.sh` |
| 3.5 | `jbpm-init` servisi (curl image, `opensearch-init` pattern) | `docker-compose.yml` |
| 3.6 | backend `depends_on`: `jbpm-init: service_completed_successfully` | `docker-compose.yml` |
| 3.7 | Retry/backoff: KIE hazır olana kadar 60–120 sn | `scripts/jbpm-deploy.sh` |

**Deploy REST (özet):**

```http
PUT /kie-server/services/rest/server/containers/destrova-ticket-process_1.0.0-SNAPSHOT
Content-Type: application/json
Authorization: Basic a2llc2VydmVyOm tpZXNlcnZlcjEh

{
  "release-id": {
    "group-id": "com.myspace",
    "artifact-id": "destrova-ticket-process",
    "version": "1.0.0-SNAPSHOT"
  },
  "configuration": {
    "RUNTIME_STRATEGY": "SINGLETON"
  }
}
```

**Doğrulama:**

```powershell
docker compose up -d --build
docker compose logs jbpm-kjar-build jbpm-init
curl.exe -sS -u "kieserver:kieserver1!" http://localhost:8180/kie-server/services/rest/server/containers/destrova-ticket-process_1.0.0-SNAPSHOT
# → status STARTED

# Restart testi:
docker compose restart jbpm-server
# jbpm-init tekrar çalışmalı veya entrypoint re-deploy (Faz 3.8)
```

| 3.8 | jbpm restart sonrası otomatik redeploy | `jbpm-reconciler` servisi |

### jbpm-server restart sonrası

`jbpm-init` one-shot servistir; ilk `docker compose up` ile çalışır. **`jbpm-reconciler`** sürekli çalışır ve container STARTED değilse `jbpm-deploy.sh` ile yeniden deploy eder (~30 sn aralık).

Manuel müdahale (reconciler kapalıysa veya acil):

```bash
docker compose up jbpm-kjar-build jbpm-init
```

---

### Faz 4 — Backend readiness & operasyonel netlik

**Süre:** ~1 saat  
**Risk:** Düşük  
**Bağımlılık:** Faz 3

| # | Görev | Dosya |
|---|--------|-------|
| 4.1 | jBPM container yokken ticket create → anlamlı hata (503/409), sessiz orphan yok | `JbpmService.java`, ilgili controller |
| 4.2 | Actuator custom health: `jbpmContainer` | `JbpmContainerHealthIndicator.java` |
| 4.3 | Startup log: container durumu tek satır INFO | `JbpmDeploymentStartupLogger.java` |

---

### Faz 5 — Dokümantasyon & bakım

**Süre:** ~30–45 dk  
**Risk:** Yok  
**Bağımlılık:** Faz 3

| # | Görev | Dosya |
|---|--------|-------|
| 5.1 | README: manuel BC adımı → "otomatik; BC opsiyonel" | `README.md` |
| 5.2 | Orphan ticket script (process_instance_id IS NULL) | `scripts/list-orphan-jbpm-tickets.mjs` |
| 5.3 | E2E öncesi kontrol notu | `e2e/helpers/jbpm.ts` |
| 5.4 | jBPM image pin | `docker-compose.yml` → `7.61.0.Final` |
| 5.5 | Process diagram SVG (BC Diagram sekmesi) | BC Save → kjar'a kopyala; alternatif `generate-svg.mjs` |

---

## 5. Uygulama sırası (checklist)

```
[x] Faz 1 — Healthcheck
[x] Faz 2 — jbpm-process Maven modülü + SVG
[x] Faz 3 — Volume + jbpm-kjar-build + jbpm-init + jbpm-reconciler
[x] Faz 4 — Backend readiness (503, health, startup log)
[x] Faz 5 — README, orphan script, image pin, SVG pipeline
[x] Entegrasyon testi: compose down → up → yeni ticket → süreç ID (2026-06-27: ticket #819 → process #716)
[x] Restart testi: jbpm-server restart → reconciler → ticket (2026-06-27: STARTED ~48s, ticket #820 → process #717)
```

---

## 6. Test senaryoları (kabul kriterleri)

| # | Senaryo | Beklenen | Sonuç |
|---|---------|----------|-------|
| T1 | Temiz `docker compose up -d --build` | jbpm-init success, container STARTED, ticket süreci başlar | ✅ ticket #819 → process #716 |
| T2 | `docker compose restart jbpm-server` | Container tekrar STARTED (init veya auto-redeploy) | ✅ ~48s, ticket #820 → #717 |
| T3 | Deploy yokken ticket oluştur | Backend açık hata veya jbpm unhealthy | ✅ health DOWN + HTTP 503 |
| T4 | Process instance görüntüleme | 500 yok (deploy varken) | ✅ instance #719 HTTP 200 + variables |
| T5 | E2E `e2e/jbpm.spec.ts` | Geçer | ✅ 9/9 passed |

---

## 7. Riskler ve azaltma

| Risk | Olasılık | Etki | Azaltma |
|------|----------|------|---------|
| kjar GAV / process id uyumsuzluğu | Orta | Deploy fail | Faz 2'de curl ile doğrula; BC GAV ile aynı tut |
| jbpm-init race (KIE henüz hazır / RuntimeManager stale) | Orta | Init fail, stack kilitlenmesi | `jbpm-deploy.sh` retry + dispose bekleme; init `on-failure:5`; reconciler yedek deploy |
| PC reboot / Docker Desktop Stop-Start | Orta | Deploy 400, frontend yok | Backend readiness jbpm hariç; reconciler grace 90s; mümkünse Stop sonrası 10 sn bekle |
| Maven path jbpm image'da farklı | Düşük | kjar bulunamaz | İlk deploy'da log kontrol; gerekirse path düzelt |
| Eski orphan ticket'lar | Yüksek (mevcut veri) | Atama/SLA çalışmaz | Script ile listele; manuel yeniden oluştur |
| `latest` image drift | Düşük | Gelecek kırılma | Faz 5.4 image pin |
| İlk up süresi uzaması | Kesin | +2–3 dk | README'de belirt |

---

## 8. Geri alma (rollback)

1. `docker-compose.yml` değişikliklerini geri al (git checkout).
2. Manuel BC deploy ile container'ı tekrar yükle.
3. Volume `jbpm_m2` silmek gerekmez; sorun çıkarsa: `docker compose down -v` **sadece jbpm_m2** (postgres'e dokunma).

---

## 9. Bilinçli olarak yapılmayanlar

- jBPM'i kaldırıp tamamen backend workflow'a geçmek (büyük mimari değişiklik).
- PostgreSQL jBPM tablolarını otomatik temizlemek (veri kaybı riski).
- Business Central'ı tamamen kaldırmak (geliştirme kolaylığı için kalır).

---

## 10. Zaman & fayda özeti

| | |
|--|--|
| **Toplam geliştirme** | ~4–6 saat |
| **Bakım kazancı** | Her restart/recreate'de 15–30 dk manuel BC deploy + debug ortadan kalkar |
| **En büyük kazanç** | Sessiz workflow kopması biter; demo/E2E güvenilir olur |

---

## 11. İlerleme günlüğü

| Tarih | Faz | Not |
|-------|-----|-----|
| 2026-06-27 | — | Yol haritası oluşturuldu |
| 2026-06-27 | Faz 1 | `docker-compose.yml` jbpm healthcheck → container STARTED doğrulaması |
| 2026-06-27 | Faz 2 | `jbpm-process/` kjar modülü (KIE 7.61.0.Final, BC ile aynı GAV) |
| 2026-06-27 | Faz 3 | `jbpm-kjar-build`, `jbpm-init`, `scripts/jbpm-deploy.sh`, `jbpm_m2` volume |
| 2026-06-27 | Faz 3.8 | `jbpm-reconciler` — restart sonrası otomatik redeploy |
| 2026-06-27 | Faz 5.5 | BPMN→SVG build pipeline (`bpmn-to-image`), BC Diagram desteği |
| 2026-06-27 | Faz 4 | `JbpmContainerHealthIndicator`, `JbpmDeploymentStartupLogger` |
| 2026-06-27 | Faz 5 | Orphan script, jBPM image pin 7.61.0.Final, BC SVG |
| 2026-06-27 | T2 | Restart testi: reconciler redeploy ~41s; ticket #818 → process #715 |
| 2026-06-27 | T1–T5 | Tam kabul testi: clean up, restart, 503 guard, instance API, E2E 9/9 |
