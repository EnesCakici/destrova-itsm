/**
 * Sunum verisi: 4 kullanıcı, 5 ürün, 10 Türkçe ticket.
 * Kullanım: node scripts/seed-presentation-data.mjs
 */
import { execSync } from 'child_process';

const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? 'http://127.0.0.1:8081';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM ?? 'ticket-realm';
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID ?? 'ticket-frontend';
const API_BASE = process.env.API_BASE_URL ?? 'http://127.0.0.1:8080/api';
const PG_CONTAINER = process.env.PG_CONTAINER ?? 'ticket_postgres';
const PASSWORD = '123456';

const USERS = [
  { name: 'Ayşe Kuş', username: 'ayse.kus', email: 'ayse.kus@destrova.com', role: 'CUSTOMER', first: 'Ayşe', last: 'Kuş' },
  { name: 'Can Destek', username: 'can.destek', email: 'can.destek@destrova.com', role: 'AGENT', first: 'Can', last: 'Destek' },
  { name: 'Zeynep Ekip', username: 'zeynep.ekip', email: 'zeynep.ekip@destrova.com', role: 'MANAGER', first: 'Zeynep', last: 'Ekip' },
  { name: 'Emre Sistem', username: 'emre.sistem', email: 'emre.sistem@destrova.com', role: 'ADMIN', first: 'Emre', last: 'Sistem' },
];

const PRODUCTS = [
  {
    name: 'Kurumsal E-posta',
    category: 'Productivity & Communication',
    description: 'Outlook, mailbox, takvim ve kurumsal iletişim hizmetleri.',
    version: 'v6.0',
  },
  {
    name: 'VPN ve Uzaktan Erişim',
    category: 'Security',
    description: 'Evden ve sahadan güvenli bağlantı, VPN istemcisi ve erişim politikaları.',
    version: 'v3.2',
  },
  {
    name: 'Hesap ve Parola İşlemleri',
    category: 'Identity',
    description: 'SSO, MFA, yeni kullanıcı hesabı ve parola sıfırlama işlemleri.',
    version: 'v2.5',
  },
  {
    name: 'Paylaşımlı Dosya ve Yetkiler',
    category: 'Productivity & Communication',
    description: 'Ortak klasörler, dosya paylaşımı ve erişim izni talepleri.',
    version: 'v4.1',
  },
  {
    name: 'İK Self Servis Portalı',
    category: 'Other',
    description: 'İzin talepleri, bordro görüntüleme ve profil güncelleme.',
    version: 'v1.8',
  },
];

function execSql(sql) {
  const escaped = sql.replace(/"/g, '\\"');
  return execSync(
    `docker exec ${PG_CONTAINER} psql -U ticket_user -d ticket_db -t -A -c "${escaped}"`,
    { encoding: 'utf8' },
  ).trim();
}

async function kcAdminToken() {
  const res = await fetch(`${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: 'admin',
      password: 'admin',
    }),
  });
  if (!res.ok) throw new Error(`Keycloak admin token failed: ${res.status}`);
  return (await res.json()).access_token;
}

async function findKcUser(token, email) {
  const res = await fetch(
    `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users?email=${encodeURIComponent(email)}&exact=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const users = await res.json();
  return users[0] ?? null;
}

async function ensureKcUser(adminToken, user) {
  let kc = await findKcUser(adminToken, user.email);
  const headers = {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  };

  if (!kc) {
    const create = await fetch(`${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        username: user.username,
        email: user.email,
        firstName: user.first,
        lastName: user.last,
        enabled: true,
        emailVerified: true,
      }),
    });
    if (create.status !== 201) {
      throw new Error(`Keycloak create ${user.email}: ${create.status} ${await create.text()}`);
    }
    kc = await findKcUser(adminToken, user.email);
  }

  await fetch(`${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${kc.id}/reset-password`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ type: 'password', value: PASSWORD, temporary: false }),
  });

  const roleRes = await fetch(
    `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/roles/${user.role}`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
  );
  const role = await roleRes.json();
  await fetch(`${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${kc.id}/role-mappings/realm`, {
    method: 'POST',
    headers,
    body: JSON.stringify([role]),
  });

  return kc.id;
}

async function getToken(usernameOrEmail) {
  const res = await fetch(`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: KEYCLOAK_CLIENT_ID,
      username: usernameOrEmail,
      password: PASSWORD,
    }),
  });
  if (!res.ok) throw new Error(`Token failed for ${usernameOrEmail}: ${res.status}`);
  return (await res.json()).access_token;
}

async function api(path, token, options = {}) {
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  return res;
}

async function getMe(token) {
  const res = await api('/users/me', token);
  if (!res.ok) throw new Error(`GET /users/me failed: ${res.status}`);
  return res.json();
}

async function waitStatus(token, ticketId, status, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await api(`/tickets/${ticketId}`, token);
    const t = await res.json();
    if (t.status === status) return t;
    await sleep(600);
  }
  throw new Error(`Ticket #${ticketId} did not reach ${status}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function createTicket(token, { title, description, priority, productId }) {
  const res = await api('/tickets', token, {
    method: 'POST',
    body: JSON.stringify({
      title,
      description,
      priority,
      product: { id: productId },
    }),
  });
  if (res.status !== 201) throw new Error(`Create ticket failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function assignToMe(agentToken, ticketId) {
  const res = await api(`/tickets/${ticketId}/actions/assign-to-me`, agentToken, { method: 'POST' });
  if (res.status !== 202) throw new Error(`assign-to-me #${ticketId}: ${res.status}`);
  await waitStatus(agentToken, ticketId, 'IN_PROGRESS');
}

async function assignAgent(managerToken, ticketId, assigneeId) {
  const res = await api(`/tickets/${ticketId}/actions/assign`, managerToken, {
    method: 'POST',
    body: JSON.stringify({ assigneeId }),
  });
  if (res.status !== 202) throw new Error(`assign #${ticketId}: ${res.status}`);
  await waitStatus(managerToken, ticketId, 'IN_PROGRESS');
}

async function postComment(token, ticketId, message, isInternal = false) {
  const res = await api(`/tickets/${ticketId}/comments`, token, {
    method: 'POST',
    body: JSON.stringify({ message, isInternal }),
  });
  if (res.status !== 201) throw new Error(`comment #${ticketId}: ${res.status}`);
}

async function waitForCustomer(agentToken, ticketId) {
  const res = await api(`/tickets/${ticketId}/actions/wait-for-customer`, agentToken, { method: 'POST' });
  if (res.status !== 202) throw new Error(`wait-for-customer #${ticketId}: ${res.status}`);
  await waitStatus(agentToken, ticketId, 'WAITING_FOR_CUSTOMER');
}

async function resolveTicket(agentToken, ticketId, resolutionNote) {
  const res = await api(`/tickets/${ticketId}/actions/resolve`, agentToken, {
    method: 'POST',
    body: JSON.stringify({ resolutionNote }),
  });
  if (res.status !== 202) throw new Error(`resolve #${ticketId}: ${res.status}`);
  await waitStatus(agentToken, ticketId, 'RESOLVED');
}

async function customerApprove(customerToken, ticketId) {
  const res = await api(`/tickets/${ticketId}/actions/approve`, customerToken, { method: 'POST' });
  if (res.status !== 202) throw new Error(`approve #${ticketId}: ${res.status} ${await res.text()}`);
  await waitStatus(customerToken, ticketId, 'CLOSED');
}

function seedProducts() {
  execSql('UPDATE products SET is_active = false');
  const ids = {};
  for (const p of PRODUCTS) {
    const name = p.name.replace(/'/g, "''");
    const desc = p.description.replace(/'/g, "''");
    const cat = p.category.replace(/'/g, "''");
    const existing = execSql(`SELECT id FROM products WHERE name = '${name}' ORDER BY id DESC LIMIT 1`);
    if (existing) {
      execSql(
        `UPDATE products SET description = '${desc}', category = '${cat}', latest_version = '${p.version}', is_active = true WHERE id = ${existing}`,
      );
      ids[p.name] = Number(existing);
    } else {
      execSql(
        `INSERT INTO products (name, description, category, latest_version, is_active) VALUES ('${name}', '${desc}', '${cat}', '${p.version}', true)`,
      );
      const id = execSql(`SELECT id FROM products WHERE name = '${name}' ORDER BY id DESC LIMIT 1`);
      ids[p.name] = Number(id);
    }
  }
  return ids;
}

function closeOpenTickets() {
  const open = execSql("SELECT COUNT(*) FROM tickets WHERE status <> 'CLOSED'");
  if (Number(open) > 0) {
    execSql(
      "UPDATE tickets SET status = 'CLOSED', closed_at = NOW(), closure_reason = 'SOLVED' WHERE status <> 'CLOSED'",
    );
    console.log(`Kapatılan açık ticket sayısı: ${open}`);
  } else {
    console.log('Açık ticket yok — hepsi zaten CLOSED.');
  }
}

function hasPresentationTickets() {
  const count = execSql(
    "SELECT COUNT(*) FROM tickets t JOIN app_users u ON u.id = t.creator_id WHERE u.email = 'ayse.kus@destrova.com'",
  );
  return Number(count) >= 10;
}

function syncAppUser(kcSub, name, email, role, maxLimit = 5) {
  const safeName = name.replace(/'/g, "''");
  const safeEmail = email.replace(/'/g, "''");
  const safeSub = kcSub.replace(/'/g, "''");
  const existing = execSql(`SELECT id FROM app_users WHERE email = '${safeEmail}' OR keycloak_sub = '${safeSub}' LIMIT 1`);
  if (existing) {
    execSql(
      `UPDATE app_users SET name = '${safeName}', email = '${safeEmail}', role = '${role}', keycloak_sub = '${safeSub}', max_ticket_limit = ${maxLimit}, status = 'Active' WHERE id = ${existing}`,
    );
    return Number(existing);
  }
  const id = execSql(
    `INSERT INTO app_users (name, email, role, keycloak_sub, max_ticket_limit, status) VALUES ('${safeName}', '${safeEmail}', '${role}', '${safeSub}', ${maxLimit}, 'Active') RETURNING id`,
  );
  return Number(id);
}

async function main() {
  console.log('=== 1) Açık ticketları kapat ===');
  closeOpenTickets();

  console.log('=== 2) Ürün kataloğu ===');
  const productIds = seedProducts();
  console.log('Aktif ürünler:', productIds);

  console.log('=== 3) Keycloak kullanıcıları ===');
  const adminToken = await kcAdminToken();
  const kcIds = {};
  for (const u of USERS) {
    kcIds[u.email] = await ensureKcUser(adminToken, u);
    console.log(`  OK ${u.email}`);
  }

  console.log('=== 4) app_users senkron ===');
  const userIds = {};
  for (const u of USERS) {
    await getToken(u.email);
    const me = await getMe(await getToken(u.email));
    const maxLimit = u.role === 'AGENT' ? 12 : 5;
    const id = syncAppUser(kcIds[u.email], u.name, u.email, u.role, maxLimit);
    userIds[u.email] = id;
    console.log(`  ${u.name} → app_users.id=${id} (JWT id=${me.id})`);
  }

  const agentId = userIds['can.destek@destrova.com'];
  const existingTeam = execSql(`SELECT 1 FROM team_members WHERE team_id = 1 AND user_id = ${agentId} LIMIT 1`);
  if (!existingTeam) {
    execSql(`INSERT INTO team_members (team_id, user_id) VALUES (1, ${agentId})`);
  }

  const customerToken = await getToken('ayse.kus@destrova.com');
  const agentToken = await getToken('can.destek@destrova.com');
  const managerToken = await getToken('zeynep.ekip@destrova.com');

  const P = productIds;
  const tickets = [];

  console.log('=== 5) Ticket oluştur ===');
  if (hasPresentationTickets()) {
    console.log('  Ayşe Kuş ticketları zaten mevcut — adım atlandı.');
    return;
  }
  const specs = [
    {
      title: 'Outlook\'ta e-postalar gelmiyor',
      description:
        'Son iki saattir Outlook masaüstü uygulamasında gelen kutusu boş görünüyor. Web mail üzerinden mesajlar görünüyor ancak istemci senkron olmuyor.',
      priority: 'HIGH',
      productId: P['Kurumsal E-posta'],
    },
    {
      title: 'VPN bağlantısı sürekli kopuyor',
      description:
        'Evden çalışırken VPN her 5-10 dakikada bir düşüyor. Yeniden bağlandığımda kısa süre çalışıp tekrar kopuyor.',
      priority: 'HIGH',
      productId: P['VPN ve Uzaktan Erişim'],
    },
    {
      title: 'MFA doğrulama kodu telefona ulaşmıyor',
      description:
        'Sisteme girişte MFA adımında SMS kodu gelmiyor. Numaramın doğru olduğundan eminim, dün akşama kadar çalışıyordu.',
      priority: 'HIGH',
      productId: P['Hesap ve Parola İşlemleri'],
    },
    {
      title: 'Yeni stajyer için hesap açılması',
      description:
        '15 Temmuzda başlayacak stajyer Elif Yılmaz için kurumsal e-posta ve VPN erişimi gerekiyor. Yönetici onayı ektedir.',
      priority: 'MEDIUM',
      productId: P['Hesap ve Parola İşlemleri'],
    },
    {
      title: 'Satış klasörüne yazma izni gerekiyor',
      description:
        '\\\\fileserver\\satis\\2026 klasörüne dosya yükleyemiyorum. Okuma iznim var, yazma için destek rica ediyorum.',
      priority: 'MEDIUM',
      productId: P['Paylaşımlı Dosya ve Yetkiler'],
    },
    {
      title: 'İK portalında izin talebi görünmüyor',
      description:
        'Geçen hafta girdiğim yıllık izin talebi İK self servis ekranında görünmüyor. Onay süreci de başlamamış görünüyor.',
      priority: 'LOW',
      productId: P['İK Self Servis Portalı'],
    },
    {
      title: 'Kurumsal mail kutusu dolu uyarısı',
      description:
        'Outlook sürekli mailbox dolu uyarısı veriyor. Arşivleme yapamıyorum, acil destek gerekiyor.',
      priority: 'MEDIUM',
      productId: P['Kurumsal E-posta'],
    },
    {
      title: 'VPN ile SAP\'ye erişilemiyor',
      description:
        'VPN bağlantısı başarılı görünse de SAP GUI üzerinden sunucuya ulaşamıyorum. Timeout hatası alıyorum.',
      priority: 'HIGH',
      productId: P['VPN ve Uzaktan Erişim'],
    },
    {
      title: 'Şifrem süresi doldu, sıfırlayamıyorum',
      description:
        'Parola süresi doldu uyarısı alıyorum. Self servis sıfırlama linki hata veriyor: "işlem tamamlanamadı".',
      priority: 'MEDIUM',
      productId: P['Hesap ve Parola İşlemleri'],
    },
    {
      title: 'Takvim davetleri yanlış saat diliminde',
      description:
        'Outlook takviminde toplantı davetleri 3 saat kayık görünüyor. Bilgisayar saat dilimi İstanbul olarak ayarlı.',
      priority: 'LOW',
      productId: P['Kurumsal E-posta'],
    },
  ];

  for (const spec of specs) {
    const t = await createTicket(customerToken, spec);
    tickets.push(t);
    console.log(`  #${t.id} ${spec.title}`);
    await sleep(400);
  }

  console.log('=== 6) Atama ve konuşmalar ===');
  const [t1, t2, t3, t4, t5, t6, t7, t8, t9, t10] = tickets;

  // #1 IN_PROGRESS + konuşma
  await assignToMe(agentToken, t1.id);
  await postComment(agentToken, t1.id, 'Merhaba, talebiniz için teşekkür ederiz. Outlook profiliniz üzerinde inceleme başlatılmıştır. Son güncelleme veya cihaz değişikliği olup olmadığını paylaşmanızı rica ederiz.');
  await postComment(customerToken, t1.id, 'Dün akşam Windows güncellemesi yapıldı. Başka bir değişiklik yok.');
  await postComment(agentToken, t1.id, 'Bilgilendirme için teşekkür ederiz. Outlook önbelleği temizlenecek ve profil yeniden yapılandırılacaktır. İşlem tamamlandığında tarafınıza dönüş yapılacaktır.');

  // #2 WAITING_FOR_CUSTOMER
  await assignToMe(agentToken, t2.id);
  await postComment(agentToken, t2.id, 'Merhaba, VPN bağlantı kopmaları ile ilgili istemci günlük kayıtları incelenmektedir.');
  await postComment(agentToken, t2.id, 'Devam edebilmemiz için lütfen kullandığınız VPN istemci sürümünü ve internet servis sağlayıcınızı paylaşır mısınız?');
  await waitForCustomer(agentToken, t2.id);

  // #3 IN_PROGRESS
  await assignToMe(agentToken, t3.id);
  await postComment(agentToken, t3.id, 'Merhaba, MFA kaydınız kontrol edilmiştir. SMS bildirim kanalında gecikme tespit edilmiştir.');
  await postComment(customerToken, t3.id, 'Alternatif olarak authenticator uygulamasına geçebilir miyim?');
  await postComment(agentToken, t3.id, 'Authenticator uygulamasına geçiş mümkündür. Kurulum adımları kısa süre içinde tarafınıza iletilecektir.');

  // #4 #9 NEW — atanmamış (skip)

  // #5 IN_PROGRESS
  await assignToMe(agentToken, t5.id);
  await postComment(agentToken, t5.id, 'Merhaba, satış klasörü erişim izinleriniz incelenmiştir. Grubunuzda yazma yetkisinin tanımlı olmadığı görülmektedir.');
  await postComment(agentToken, t5.id, 'Yönetici onayı için talep ilgili birime iletilmiştir. Onay sonrası bilgilendirme yapılacaktır.');

  // #6 RESOLVED
  await assignToMe(agentToken, t6.id);
  await postComment(agentToken, t6.id, 'İK portalındaki kayıt arka planda askıda kalmış, yeniden tetikledim.');
  await resolveTicket(agentToken, t6.id, 'İzin talebiniz İK sisteminde yeniden oluşturuldu. Onay süreci başlatıldı, portalda görünür olmalı.');

  // #7 CLOSED (çöz → müşteri onay)
  await assignToMe(agentToken, t7.id);
  await postComment(agentToken, t7.id, 'Mailbox kotanız dolmuş. 90 günden eski mailler arşiv klasörüne taşındı.');
  await postComment(customerToken, t7.id, 'Teşekkürler, Outlook şimdi normal çalışıyor.');
  await resolveTicket(agentToken, t7.id, 'Mailbox kotası genişletildi ve eski mailler arşivlendi. Outlook senkronizasyonu normale döndü.');
  await customerApprove(customerToken, t7.id);

  // #8 CLOSED
  await assignToMe(agentToken, t8.id);
  await postComment(agentToken, t8.id, 'SAP erişim sorunu VPN split tunnel ayarından kaynaklanıyordu.');
  await postComment(customerToken, t8.id, 'SAP bağlantısı şu an çalışıyor, teşekkürler.');
  await resolveTicket(agentToken, t8.id, 'VPN split tunnel kuralı güncellendi. SAP sunucusuna erişim doğrulandı.');
  await customerApprove(customerToken, t8.id);

  // #10 RESOLVED
  await assignToMe(agentToken, t10.id);
  await postComment(agentToken, t10.id, 'Exchange tarafında saat dilimi UTC+3 olarak düzeltildi.');
  await resolveTicket(agentToken, t10.id, 'Takvim saat dilimi sunucuda düzeltildi. Outlook\'u yeniden başlattığınızda davetler doğru görünmelidir.');

  console.log('\n=== Tamamlandı ===');
  console.log('Giriş bilgileri (şifre: 123456):');
  for (const u of USERS) {
    console.log(`  ${u.role.padEnd(8)} ${u.name.padEnd(14)} ${u.email}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
