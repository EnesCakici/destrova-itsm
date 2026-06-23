/**
 * Sunum genişletme: 2. agent, atanmamış ticketlar, kurumsal agent yanıtları.
 * node scripts/extend-presentation-data.mjs
 */
import { execSync } from 'child_process';

const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? 'http://127.0.0.1:8081';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM ?? 'ticket-realm';
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID ?? 'ticket-frontend';
const API_BASE = process.env.API_BASE_URL ?? 'http://127.0.0.1:8080/api';
const PG_CONTAINER = process.env.PG_CONTAINER ?? 'ticket_postgres';
const PASSWORD = '123456';

const AGENT2 = {
  name: 'Deniz Yanıt',
  username: 'deniz.yanit',
  email: 'deniz.yanit@destrova.com',
  role: 'AGENT',
  first: 'Deniz',
  last: 'Yanıt',
};

const NEW_UNASSIGNED = [
  {
    title: 'Toplu e-posta gönderimi başarısız oluyor',
    description:
      'Marketing ekibi olarak 120 kişilik dağıtım listesine mail gönderemiyoruz. "Gönderim tamamlanamadı" hatası alıyoruz.',
    priority: 'MEDIUM',
    productId: 34,
  },
  {
    title: 'Uzaktan erişimde yavaş bağlantı',
    description:
      'VPN bağlantısı kuruluyor ancak internal uygulamalara erişim çok yavaş. Ping değerleri normal görünüyor.',
    priority: 'MEDIUM',
    productId: 35,
  },
  {
    title: 'Finans klasöründe dosya silme yetkisi',
    description:
      'Finans ekibinin ortak klasöründe eski dosyaları arşivlemem gerekiyor. Silme iznim bulunmuyor, talep ediyorum.',
    priority: 'LOW',
    productId: 37,
  },
  {
    title: 'Bordro PDF indirilemiyor',
    description:
      'İK self servis portalında Mayıs bordromu PDF olarak indirmek istediğimde sayfa boş geliyor.',
    priority: 'MEDIUM',
    productId: 38,
  },
];

/** comment id → kurumsal metin */
const CORPORATE_COMMENTS = {
  2098: 'Merhaba, talebiniz için teşekkür ederiz. Outlook profiliniz üzerinde inceleme başlatılmıştır. Son güncelleme veya cihaz değişikliği olup olmadığını paylaşmanızı rica ederiz.',
  2100: 'Bilgilendirme için teşekkür ederiz. Outlook önbelleği temizlenecek ve profil yeniden yapılandırılacaktır. İşlem tamamlandığında tarafınıza dönüş yapılacaktır.',
  2103: 'Merhaba, VPN bağlantı kopmaları ile ilgili istemci günlük kayıtları incelenmektedir.',
  2104: 'Devam edebilmemiz için lütfen kullandığınız VPN istemci sürümünü ve internet servis sağlayıcınızı paylaşır mısınız?',
  2108: 'Merhaba, MFA kaydınız kontrol edilmiştir. SMS bildirim kanalında gecikme tespit edilmiştir.',
  2110: 'Authenticator uygulamasına geçiş mümkündür. Kurulum adımları kısa süre içinde tarafınıza iletilecektir.',
  2113: 'Merhaba, satış klasörü erişim izinleriniz incelenmiştir. Grubunuzda yazma yetkisinin tanımlı olmadığı görülmektedir.',
  2114: 'Yönetici onayı için talep ilgili birime iletilmiştir. Onay sonrası bilgilendirme yapılacaktır.',
  2117: 'Merhaba, İK portalındaki kayıt arka planda askıda kalmıştır. Kayıt yeniden tetiklenmiştir.',
  2118: 'İzin talebiniz İK sisteminde yeniden oluşturulmuştur. Onay süreci başlatılmış olup portalda görünür hale gelmelidir.',
  2122: 'Merhaba, mailbox kotanızın dolduğu tespit edilmiştir. 90 günden eski e-postalar arşiv klasörüne taşınmıştır.',
  2124: 'Mailbox kotası genişletilmiş ve eski kayıtlar arşivlenmiştir. Outlook senkronizasyonunun normale dönmesi beklenmektedir.',
  2126: 'Çözüm uygulanmıştır: mailbox kotası genişletildi ve arşivleme tamamlandı. Outlook senkronizasyonu kontrol edilebilir.',
  2131: 'Merhaba, SAP erişim sorununun VPN split tunnel yapılandırmasından kaynaklandığı tespit edilmiştir.',
  2133: 'VPN split tunnel kuralı güncellenmiş ve SAP sunucusuna erişim doğrulanmıştır.',
  2138: 'Merhaba, Exchange tarafında saat dilimi UTC+3 olarak düzeltilmiştir.',
  2139: 'Takvim saat dilimi sunucuda güncellenmiştir. Outlook uygulamasını yeniden başlattığınızda davetlerin doğru görünmesi beklenir.',
};

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
  const headers = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
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
    if (create.status !== 201) throw new Error(`KC create ${user.email}: ${create.status}`);
    kc = await findKcUser(adminToken, user.email);
  }
  await fetch(`${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${kc.id}/reset-password`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ type: 'password', value: PASSWORD, temporary: false }),
  });
  const role = await (
    await fetch(`${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/roles/${user.role}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
  ).json();
  await fetch(`${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${kc.id}/role-mappings/realm`, {
    method: 'POST',
    headers,
    body: JSON.stringify([role]),
  });
  return kc.id;
}

async function getToken(email) {
  const res = await fetch(`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: KEYCLOAK_CLIENT_ID,
      username: email,
      password: PASSWORD,
    }),
  });
  if (!res.ok) throw new Error(`Token ${email}: ${res.status}`);
  return (await res.json()).access_token;
}

async function api(path, token, options = {}) {
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

function syncAppUser(kcSub, name, email, role, maxLimit = 12) {
  const safeName = name.replace(/'/g, "''");
  const safeEmail = email.replace(/'/g, "''");
  const safeSub = kcSub.replace(/'/g, "''");
  const existing = execSql(`SELECT id FROM app_users WHERE email = '${safeEmail}' LIMIT 1`);
  if (existing) {
    execSql(
      `UPDATE app_users SET name='${safeName}', role='${role}', keycloak_sub='${safeSub}', max_ticket_limit=${maxLimit}, status='Active' WHERE id=${existing}`,
    );
    return Number(existing);
  }
  const id = execSql(
    `INSERT INTO app_users (name, email, role, keycloak_sub, max_ticket_limit, status) VALUES ('${safeName}','${safeEmail}','${role}','${safeSub}',${maxLimit},'Active') RETURNING id`,
  );
  return Number(id);
}

function polishComments() {
  let n = 0;
  for (const [id, message] of Object.entries(CORPORATE_COMMENTS)) {
    const safe = message.replace(/'/g, "''");
    execSql(`UPDATE comments SET message = '${safe}' WHERE id = ${id}`);
    n += 1;
  }
  console.log(`  ${n} agent yorumu kurumsal tona güncellendi.`);
}

async function main() {
  console.log('=== 1) Deniz Yanıt (2. agent) ===');
  const kcSub = await ensureKcUser(await kcAdminToken(), AGENT2);
  await getToken(AGENT2.email);
  const agent2Id = syncAppUser(kcSub, AGENT2.name, AGENT2.email, 'AGENT', 12);
  console.log(`  ${AGENT2.name} → app_users.id=${agent2Id}`);

  console.log('=== 2) Atanmamış yeni ticketlar ===');
  const customerToken = await getToken('ayse.kus@destrova.com');
  const ayseId = execSql("SELECT id FROM app_users WHERE email = 'ayse.kus@destrova.com'");
  for (const spec of NEW_UNASSIGNED) {
    const exists = execSql(
      `SELECT id FROM tickets WHERE creator_id=${ayseId} AND title='${spec.title.replace(/'/g, "''")}' LIMIT 1`,
    );
    if (exists) {
      console.log(`  atlandı (zaten var): ${spec.title}`);
      continue;
    }
    const res = await api('/tickets', customerToken, {
      method: 'POST',
      body: JSON.stringify({
        title: spec.title,
        description: spec.description,
        priority: spec.priority,
        product: { id: spec.productId },
      }),
    });
    if (res.status !== 201) throw new Error(`${spec.title}: ${res.status} ${await res.text()}`);
    const t = await res.json();
    console.log(`  #${t.id} ${spec.title} (NEW, atanmamış)`);
  }

  console.log('=== 3) Agent yorumları kurumsal ton ===');
  polishComments();

  console.log('\n=== Team önerisi (Zeynep Ekip — Manager → Teams) ===');
  const rows = execSql(
    "SELECT p.name || '|' || COUNT(*) FROM tickets t JOIN products p ON p.id=t.product_id JOIN app_users u ON u.id=t.creator_id WHERE u.email='ayse.kus@destrova.com' AND t.status <> 'CLOSED' GROUP BY p.name ORDER BY COUNT(*) DESC",
  );
  console.log('Açık talep dağılımı (Ayşe Kuş):');
  for (const line of rows.split('\n').filter(Boolean)) {
    const [name, count] = line.split('|');
    console.log(`  • ${name}: ${count}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
