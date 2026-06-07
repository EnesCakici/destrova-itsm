/**
 * Design-report screenshot generator (isolated from lifecycle/security E2E tests).
 *
 * Run only this file:
 *   npx playwright test e2e/report-screenshots.spec.ts --headed
 *
 * Credentials: .env.test via process.env — never hardcoded.
 * Does NOT modify helpers in e2e/helpers/ — imports only.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { test, type Page } from '@playwright/test';
import { loginAs, logout } from './helpers/auth';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const API_URL = process.env.API_URL ?? process.env.API_BASE_URL ?? 'http://localhost:8080';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../screenshots');
const DEMO_FILTER = '[DEMO]';
const DESCRIPTION_EDITOR_TEST_ID = 'ticket-description-editor';
const COMMENT_EDITOR_TEST_ID = 'ticket-comment-editor';

const SCREENSHOT_FILES = [
  '01-login.png',
  '02-customer-ticket-list.png',
  '03-customer-new-ticket.png',
  '04-customer-ticket-detail.png',
  '05-agent-inbox.png',
  '06-agent-ticket-detail.png',
  '07-manager-dashboard.png',
  '08-manager-reports.png',
  '09-admin-users.png',
  '10-admin-products-teams.png',
  '11-notification-center.png',
] as const;

type Role = 'customer' | 'agent' | 'manager' | 'admin';

interface DemoTicketTemplate {
  baseTitle: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface CreatedDemoTicket {
  baseTitle: string;
  fullTitle: string;
  id?: number;
}

const DEMO_TICKET_TEMPLATES: DemoTicketTemplate[] = [
  {
    baseTitle: '[DEMO] VPN bağlantı sorunu',
    description:
      'Kullanıcı VPN bağlantısı sırasında bağlantının sık sık koptuğunu ve şirket içi sistemlere erişemediğini bildirmiştir.',
    priority: 'HIGH',
  },
  {
    baseTitle: '[DEMO] E-posta senkronizasyon problemi',
    description:
      'Kurumsal e-posta hesabında gelen kutusu ile mobil cihaz arasında senkronizasyon gecikmesi yaşanmaktadır.',
    priority: 'MEDIUM',
  },
  {
    baseTitle: '[DEMO] Yazıcı bağlantı hatası',
    description:
      'Ağ yazıcısına bağlanılamıyor; yazdırma kuyruğu sürekli beklemede kalıyor.',
    priority: 'LOW',
  },
  {
    baseTitle: '[DEMO] ERP erişim talebi',
    description:
      'Yeni başlayan çalışan için ERP modülüne okuma yetkisi tanımlanması talep edilmektedir.',
    priority: 'MEDIUM',
  },
  {
    baseTitle: '[DEMO] Şifre sıfırlama isteği',
    description:
      'Kullanıcı hesabına erişemiyor; self-service şifre sıfırlama bağlantısı çalışmıyor.',
    priority: 'LOW',
  },
  {
    baseTitle: '[DEMO] Laptop performans sorunu',
    description:
      'Kurumsal laptop açılış ve uygulama başlatma sürelerinde belirgin yavaşlama bildirilmiştir.',
    priority: 'HIGH',
  },
  {
    baseTitle: '[DEMO] Microsoft Teams toplantı bağlantı problemi',
    description:
      'Teams toplantılarında ses ve görüntü bağlantısı düzensiz kopmaktadır.',
    priority: 'MEDIUM',
  },
  {
    baseTitle: '[DEMO] Dosya paylaşım yetkisi talebi',
    description:
      'Proje klasörüne yazma yetkisi gerekmektedir; mevcut hesap yalnızca okuma iznine sahiptir.',
    priority: 'LOW',
  },
  {
    baseTitle: '[DEMO] Kurumsal uygulama erişim problemi',
    description:
      'Destek portalı dışındaki kurumsal uygulamaya SSO ile giriş yapılamamaktadır.',
    priority: 'MEDIUM',
  },
  {
    baseTitle: '[DEMO] Ağ bağlantısı yavaşlığı',
    description:
      'Ofis ağında belirli saatlerde bağlantı hızında ciddi düşüş gözlemlenmektedir.',
    priority: 'HIGH',
  },
];

function timestampSuffix(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}${mm}`;
}

function warn(message: string) {
  console.warn(`[report-screenshots] ${message}`);
}

function getCredentials(role: Role): { email: string; password: string } | null {
  const map: Record<Role, [string | undefined, string | undefined]> = {
    customer: [process.env.CUSTOMER_EMAIL, process.env.CUSTOMER_PASSWORD],
    agent: [process.env.AGENT_EMAIL, process.env.AGENT_PASSWORD],
    manager: [process.env.MANAGER_EMAIL, process.env.MANAGER_PASSWORD],
    admin: [process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD],
  };
  const [email, password] = map[role];
  if (!email || !password) return null;
  return { email, password };
}

function ticketApiPath(ticketId: number, suffix: string) {
  return `/api/tickets/${ticketId}${suffix}`;
}

function waitForTicketAction(page: Page, ticketId: number, action: string) {
  return page.waitForResponse(
    (res) => res.url().includes(ticketApiPath(ticketId, `/actions/${action}`)) && res.status() === 202,
    { timeout: 45_000 },
  );
}

async function fillRichText(page: Page, testId: string, text: string): Promise<boolean> {
  try {
    const editor = page.getByTestId(testId);
    await editor.waitFor({ state: 'visible', timeout: 20_000 });
    await editor.click();
    await editor.fill(text);
    return true;
  } catch (err) {
    warn(`Rich text editor "${testId}" not fillable: ${String(err)}`);
    return false;
  }
}

async function fillTiptapEditor(page: Page, text: string): Promise<boolean> {
  try {
    const editor = page.locator('.tiptap').last();
    await editor.waitFor({ state: 'visible', timeout: 12_000 });
    await editor.click();
    await editor.fill(text);
    return true;
  } catch (err) {
    warn(`Tiptap editor not fillable: ${String(err)}`);
    return false;
  }
}

async function dismissTransientUi(page: Page) {
  await page.keyboard.press('Escape').catch(() => {});
  const closeButtons = page.getByRole('button', { name: /close|dismiss|got it/i });
  if (await closeButtons.count()) {
    await closeButtons.first().click().catch(() => {});
  }
}

async function takeReportScreenshot(page: Page, filename: string) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  await dismissTransientUi(page);
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(600);
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`[report-screenshots] Saved ${filepath}`);
}

async function safeScreenshot(page: Page, filename: string, setup: () => Promise<void>) {
  try {
    await setup();
    await takeReportScreenshot(page, filename);
  } catch (err) {
    warn(`Screenshot "${filename}" failed: ${String(err)}`);
    try {
      await takeReportScreenshot(page, filename);
      warn(`Captured fallback frame for "${filename}" after setup error.`);
    } catch (fallbackErr) {
      warn(`Fallback capture for "${filename}" also failed: ${String(fallbackErr)}`);
    }
  }
}

async function safeLogout(page: Page) {
  try {
    await logout(page);
  } catch (err) {
    warn(`Logout failed (non-blocking): ${String(err)}`);
    await page.goto('/login').catch(() => {});
  }
}

async function loginAsRole(page: Page, role: Role): Promise<boolean> {
  const creds = getCredentials(role);
  if (!creds) {
    warn(`Missing credentials for role "${role}" — step skipped.`);
    return false;
  }
  try {
    await loginAs(page, creds.email, creds.password);
    return true;
  } catch (err) {
    warn(`Login failed for role "${role}": ${String(err)}`);
    return false;
  }
}

async function searchDemoTickets(page: Page, context: 'customer' | 'agent') {
  if (context === 'customer') {
    const search = page.locator('#customer-ticket-search');
    if (await search.count()) {
      await search.fill(DEMO_FILTER);
      await page.waitForTimeout(400);
      return;
    }
    warn('Customer search input not found; list may include non-demo tickets.');
    return;
  }

  const inboxSearch = page.getByRole('searchbox', { name: 'Search inbox tickets' });
  if (await inboxSearch.count()) {
    await inboxSearch.fill(DEMO_FILTER);
    await page.waitForTimeout(400);
    return;
  }
  warn('Agent inbox search not found; list may include non-demo tickets.');
}

async function createDemoTicket(
  page: Page,
  template: DemoTicketTemplate,
  suffix: string,
): Promise<CreatedDemoTicket | null> {
  const fullTitle = `${template.baseTitle} - ${suffix}`;

  try {
    await page.goto('/customer/new');
    await page.getByRole('heading', { name: /Open a support request/i }).waitFor({ timeout: 25_000 });

    await page.getByPlaceholder('e.g. Unable to access the billing portal').fill(fullTitle);
    await fillRichText(page, DESCRIPTION_EDITOR_TEST_ID, template.description);

    const priorityLabel =
      template.priority === 'HIGH' ? 'High' : template.priority === 'MEDIUM' ? 'Medium' : 'Low';
    await page.getByRole('radio', { name: priorityLabel }).click();

    const productSelect = page.locator('select[name="productId"]');
    if (await productSelect.count()) {
      const options = productSelect.locator('option');
      const optionCount = await options.count();
      for (let i = 0; i < optionCount; i += 1) {
        const value = await options.nth(i).getAttribute('value');
        if (value && value.trim() !== '') {
          await productSelect.selectOption(value);
          break;
        }
      }
    }

    const createResponsePromise = page.waitForResponse(
      (res) => res.request().method() === 'POST' && /\/api\/tickets\/?$/.test(res.url()) && res.status() === 201,
      { timeout: 45_000 },
    );
    await page.getByRole('button', { name: 'Submit request' }).click();
    const createResponse = await createResponsePromise;
    const created = (await createResponse.json()) as { id: number };

    await page.waitForURL(/\/customer\/tickets/, { timeout: 25_000 }).catch(() => {
      warn(`Ticket "${fullTitle}" created (id=${created.id}) but list redirect did not occur.`);
    });

    return { baseTitle: template.baseTitle, fullTitle, id: created.id };
  } catch (err) {
    warn(`Failed to create ticket "${template.baseTitle}": ${String(err)}`);
    return null;
  }
}

async function waitForDemoTicketsInAgentInbox(page: Page, minCount = 1, maxAttempts = 10): Promise<number> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await page.goto('/agent/inbox');
      await page.waitForLoadState('domcontentloaded');
      await page.getByRole('button', { name: 'Unassigned', exact: true }).click().catch(() => {});
      await searchDemoTickets(page, 'agent');
      const count = await page.getByTestId('ticket-list-item').filter({ hasText: DEMO_FILTER }).count();
      if (count >= minCount) {
        return count;
      }
      warn(
        `[DEMO] tickets in agent inbox: ${count}/${minCount} — waiting for projection (attempt ${attempt}/${maxAttempts}).`,
      );
    } catch (err) {
      warn(`Agent inbox poll failed (attempt ${attempt}/${maxAttempts}): ${String(err)}`);
    }
    await page.waitForTimeout(3_000);
  }
  return 0;
}

async function openAgentTicketByTitle(
  page: Page,
  title: string,
  queue: 'unassigned' | 'assigned',
): Promise<boolean> {
  try {
    await page.goto('/agent/inbox');
    await page.waitForLoadState('domcontentloaded');

    if (queue === 'assigned') {
      await page.getByRole('button', { name: 'Assigned to me', exact: true }).click();
    } else if (queue === 'unassigned') {
      await page.getByRole('button', { name: 'Unassigned', exact: true }).click();
    }

    await searchDemoTickets(page, 'agent');

    let ticketRow = page.getByTestId('ticket-list-item').filter({ hasText: title });
    if (!(await ticketRow.count())) {
      ticketRow = page.getByTestId('ticket-list-item').filter({ hasText: DEMO_FILTER });
    }

    if (!(await ticketRow.count())) {
      warn(`Agent ticket row not found for "${title}".`);
      return false;
    }

    await ticketRow.first().click();
    await page.waitForTimeout(500);
    return true;
  } catch (err) {
    warn(`openAgentTicketByTitle failed for "${title}": ${String(err)}`);
    return false;
  }
}

async function openCustomerTicketByTitle(page: Page, title: string): Promise<boolean> {
  try {
    await page.goto('/customer/tickets');
    await searchDemoTickets(page, 'customer');

    let card = page.locator('article').filter({ hasText: title });
    if (!(await card.count())) {
      card = page.locator('article').filter({ hasText: DEMO_FILTER });
    }

    if (!(await card.count())) {
      warn(`Customer ticket card not found for "${title}".`);
      return false;
    }

    await card.first().click();
    await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 20_000 });
    return true;
  } catch (err) {
    warn(`openCustomerTicketByTitle failed for "${title}": ${String(err)}`);
    return false;
  }
}

async function assignTicketToMe(page: Page, ticketId?: number): Promise<boolean> {
  try {
    const assignBtn = page.getByTestId('assign-to-me');
    if (!(await assignBtn.count())) {
      warn('Assign to me button not visible — ticket may already be assigned.');
      return false;
    }
    const responsePromise = ticketId ? waitForTicketAction(page, ticketId, 'assign') : null;
    await assignBtn.click();
    if (responsePromise) {
      await responsePromise.catch(() => warn(`assign action did not return 202 for ticket #${ticketId}`));
    } else {
      await page.waitForTimeout(1500);
    }
    await page.waitForTimeout(800);
    return true;
  } catch (err) {
    warn(`assignTicketToMe failed: ${String(err)}`);
    return false;
  }
}

async function changeAgentStatus(
  page: Page,
  ticketId: number,
  statusLabel: string,
  options?: { resolutionNote?: string; action?: string },
): Promise<boolean> {
  try {
    const statusSelect = page.getByLabel('Change ticket status');
    if (!(await statusSelect.count())) {
      warn(`Status select not available for ticket #${ticketId} — assign ticket first.`);
      return false;
    }

    const responsePromise = options?.action
      ? waitForTicketAction(page, ticketId, options.action)
      : null;

    await statusSelect.selectOption({ label: statusLabel });

    if (options?.resolutionNote) {
      const noteField = page.getByLabel(/Solution summary/i);
      if (await noteField.count()) {
        await noteField.fill(options.resolutionNote);
      }
    }

    const confirmButton = page.getByRole('button', { name: 'Confirm changes' });
    if (!(await confirmButton.isEnabled())) {
      warn(`Confirm changes disabled for ticket #${ticketId} (${statusLabel}).`);
      return false;
    }
    await confirmButton.click();

    if (responsePromise) {
      await responsePromise.catch(() =>
        warn(`Action "${options?.action}" did not return 202 for ticket #${ticketId}`),
      );
    }
    await page.waitForTimeout(1200);
    return true;
  } catch (err) {
    warn(`changeAgentStatus failed for ticket #${ticketId}: ${String(err)}`);
    return false;
  }
}

async function waitForCustomerOnTicket(page: Page, ticketId: number) {
  return changeAgentStatus(page, ticketId, 'Waiting for Customer', { action: 'wait-for-customer' });
}

async function resolveTicket(page: Page, ticketId: number, note: string) {
  return changeAgentStatus(page, ticketId, 'Resolved', {
    resolutionNote: note,
    action: 'resolve',
  });
}

async function addWorklog(page: Page, minutes: number, description: string) {
  try {
    const worklogTab = page.getByRole('button', { name: 'Worklog', exact: true });
    if (!(await worklogTab.count())) {
      warn('Worklog tab not found on agent ticket detail.');
      return;
    }
    await worklogTab.click();
    await page.getByPlaceholder('e.g. 45').fill(String(minutes));
    const descArea = page.getByPlaceholder('Summarize work completed, key actions, and outcome.');
    if (await descArea.count()) {
      await descArea.fill(description);
    } else {
      warn('Worklog description field not found.');
      return;
    }
    const logBtn = page.getByRole('button', { name: 'Log work' });
    if (await logBtn.count()) {
      await logBtn.click();
      await page.waitForTimeout(1000);
    } else {
      warn('Log work button not found.');
    }
  } catch (err) {
    warn(`addWorklog failed: ${String(err)}`);
  }
}

async function addInternalNote(page: Page, note: string) {
  try {
    const noteTab = page.getByRole('button', { name: 'Note', exact: true });
    if (!(await noteTab.count())) {
      warn('Internal Note tab not found.');
      return;
    }
    await noteTab.click();
    await fillTiptapEditor(page, note);
    const addBtn = page.getByRole('button', { name: 'Add internal note' });
    if (await addBtn.count()) {
      await addBtn.click();
      await page.waitForTimeout(1000);
    } else {
      warn('Add internal note button not found.');
    }
  } catch (err) {
    warn(`addInternalNote failed: ${String(err)}`);
  }
}

async function openNotificationCenter(page: Page): Promise<boolean> {
  try {
    const bell = page.getByRole('button', { name: /Notifications/i });
    if (await bell.count()) {
      await bell.click();
      await page.waitForTimeout(500);
      return true;
    }
    const titledBell = page.locator('button[title="Notifications"]');
    if (await titledBell.count()) {
      await titledBell.click();
      await page.waitForTimeout(500);
      return true;
    }
    warn('Notification bell button not found.');
    return false;
  } catch (err) {
    warn(`openNotificationCenter failed: ${String(err)}`);
    return false;
  }
}

async function prepareAgentInboxForScreenshot(page: Page, options?: { selectFirstTicket?: boolean }) {
  const selectFirstTicket = options?.selectFirstTicket ?? false;

  await page.goto('/agent/inbox');
  await page.waitForLoadState('domcontentloaded');

  const queues = ['Unassigned', 'Assigned to me'] as const;
  for (const label of queues) {
    const tab = page.getByRole('button', { name: label, exact: true });
    if (await tab.count()) {
      await tab.click().catch(() => {});
      await searchDemoTickets(page, 'agent');
      const demoRows = page.getByTestId('ticket-list-item').filter({ hasText: DEMO_FILTER });
      const count = await demoRows.count();
      if (count > 0) {
        if (selectFirstTicket) {
          await demoRows.first().click();
          await page.waitForTimeout(600);
        }
        return;
      }
    }
  }
  warn('No [DEMO] ticket found in any agent queue — inbox screenshot may look empty.');
}

test.describe('Report screenshots (isolated)', () => {
  test.describe.configure({ mode: 'serial' });

  test.use({
    viewport: { width: 1440, height: 900 },
    baseURL: BASE_URL,
  });

  test('capture design-report screenshots', async ({ page }) => {
    test.setTimeout(600_000);

    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

    const suffix = timestampSuffix();
    const createdTickets: CreatedDemoTicket[] = [];

    // ── Phase 1: Customer creates [DEMO] tickets (best-effort, no cleanup) ──
    if (await loginAsRole(page, 'customer')) {
      for (const template of DEMO_TICKET_TEMPLATES) {
        const created = await createDemoTicket(page, template, suffix);
        if (created) {
          createdTickets.push(created);
          console.log(`[report-screenshots] Created ticket: ${created.fullTitle} (id=${created.id})`);
        }
      }
      await safeLogout(page);
    } else {
      warn('Customer login unavailable — skipping demo ticket creation.');
    }

    if (createdTickets.length === 0) {
      warn('No new demo tickets created; screenshots use existing [DEMO] data if present.');
    }

    const assignOnlyTitle = createdTickets[0]?.fullTitle ?? '';
    const waitCustomerTitle = createdTickets[1]?.fullTitle ?? '';
    const resolvedTitle = createdTickets[2]?.fullTitle ?? '';
    const worklogTitle = createdTickets[3]?.fullTitle ?? '';

    // ── Phase 2: Agent workflow (jBPM actions — failures are non-blocking) ───
    if (getCredentials('agent')) {
      if (await loginAsRole(page, 'agent')) {
        await waitForDemoTicketsInAgentInbox(page, Math.min(createdTickets.length, 3) || 1);

        const t0 = createdTickets[0];
        const t1 = createdTickets[1];
        const t2 = createdTickets[2];
        const t3 = createdTickets[3];

        if (t0?.fullTitle) {
          if (await openAgentTicketByTitle(page, t0.fullTitle, 'unassigned')) {
            await assignTicketToMe(page, t0.id);
          }
        }

        if (t1?.fullTitle && t1.id) {
          if (await openAgentTicketByTitle(page, t1.fullTitle, 'unassigned')) {
            await assignTicketToMe(page, t1.id);
            await waitForCustomerOnTicket(page, t1.id);
          }
        }

        if (t2?.fullTitle && t2.id) {
          if (await openAgentTicketByTitle(page, t2.fullTitle, 'unassigned')) {
            await assignTicketToMe(page, t2.id);
            await resolveTicket(page, t2.id, 'VPN profili güncellendi ve bağlantı test edilerek doğrulandı.');
          }
        }

        if (t3?.fullTitle && t3.id) {
          if (await openAgentTicketByTitle(page, t3.fullTitle, 'unassigned')) {
            await assignTicketToMe(page, t3.id);
            await addWorklog(page, 45, 'Yazıcı sürücüsü yeniden yüklendi ve test çıktısı alındı.');
            await addInternalNote(page, 'Ağ yazıcısı IP adresi doğrulandı; sorun sürücü kaynaklıydı.');
          }
        }

        await safeLogout(page);
      }
    } else {
      warn('Agent credentials missing — skipping agent workflow and agent screenshots.');
    }

    // ── Phase 3: Customer follow-up (optional, non-blocking) ───────────────
    if (getCredentials('customer') && waitCustomerTitle) {
      if (await loginAsRole(page, 'customer')) {
        if (await openCustomerTicketByTitle(page, waitCustomerTitle)) {
          const comment = 'Gerekli ek bilgileri paylaşıyorum. Sorun hâlâ devam etmektedir.';
          await fillRichText(page, COMMENT_EDITOR_TEST_ID, comment);
          const sendBtn = page.getByRole('button', { name: /Send reply/i });
          if (await sendBtn.count()) {
            await sendBtn.click().catch((err) => warn(`Send reply failed: ${String(err)}`));
            await page.waitForTimeout(1200);
          }
        }
        await safeLogout(page);
      }
    }

    // ── Phase 4: Screenshots (each step isolated — never abort the run) ──────

    await safeScreenshot(page, '01-login.png', async () => {
      await page.goto('/login');
      await page.getByRole('button', { name: 'Continue to Destrova' }).waitFor({ timeout: 20_000 });
    });

    await safeScreenshot(page, '02-customer-ticket-list.png', async () => {
      if (!(await loginAsRole(page, 'customer'))) {
        throw new Error('customer login required');
      }
      await page.goto('/customer/tickets');
      await page.getByRole('heading', { name: 'Your support requests' }).waitFor({ timeout: 20_000 });
      await searchDemoTickets(page, 'customer');
      await safeLogout(page);
    });

    await safeScreenshot(page, '03-customer-new-ticket.png', async () => {
      if (!(await loginAsRole(page, 'customer'))) {
        throw new Error('customer login required');
      }
      await page.goto('/customer/new');
      await page.getByRole('heading', { name: /Open a support request/i }).waitFor({ timeout: 20_000 });
      await page
        .getByPlaceholder('e.g. Unable to access the billing portal')
        .fill(`[DEMO] VPN bağlantı sorunu - ${suffix}`);
      await fillRichText(
        page,
        DESCRIPTION_EDITOR_TEST_ID,
        'Kullanıcı VPN bağlantısı sırasında bağlantının sık sık koptuğunu bildirmiştir.',
      );
      await page.getByRole('radio', { name: 'High' }).click();
      const productSelect = page.locator('select[name="productId"]');
      if (await productSelect.count()) {
        const firstValue = await productSelect.locator('option').nth(1).getAttribute('value');
        if (firstValue) await productSelect.selectOption(firstValue);
      }
      await safeLogout(page);
    });

    await safeScreenshot(page, '04-customer-ticket-detail.png', async () => {
      if (!(await loginAsRole(page, 'customer'))) {
        throw new Error('customer login required');
      }
      const detailTitle = waitCustomerTitle || assignOnlyTitle;
      if (!detailTitle) {
        throw new Error('no demo ticket title for detail view');
      }
      if (!(await openCustomerTicketByTitle(page, detailTitle))) {
        throw new Error('could not open customer ticket detail');
      }
      await safeLogout(page);
    });

    await safeScreenshot(page, '05-agent-inbox.png', async () => {
      if (!(await loginAsRole(page, 'agent'))) {
        throw new Error('agent login required');
      }
      await prepareAgentInboxForScreenshot(page, { selectFirstTicket: false });
      await safeLogout(page);
    });

    await safeScreenshot(page, '06-agent-ticket-detail.png', async () => {
      if (!(await loginAsRole(page, 'agent'))) {
        throw new Error('agent login required');
      }
      const detailTitle = worklogTitle || resolvedTitle || assignOnlyTitle;
      if (detailTitle) {
        const opened = await openAgentTicketByTitle(page, detailTitle, 'assigned');
        if (!opened) {
          await openAgentTicketByTitle(page, detailTitle, 'unassigned');
        }
      } else {
        await prepareAgentInboxForScreenshot(page, { selectFirstTicket: true });
      }
      await safeLogout(page);
    });

    await safeScreenshot(page, '07-manager-dashboard.png', async () => {
      if (!(await loginAsRole(page, 'manager'))) {
        throw new Error('manager login required');
      }
      await page.goto('/manager/dashboard');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1200);
      await safeLogout(page);
    });

    await safeScreenshot(page, '08-manager-reports.png', async () => {
      if (!(await loginAsRole(page, 'manager'))) {
        throw new Error('manager login required');
      }
      await page.goto('/manager/reports');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1200);
      await safeLogout(page);
    });

    if (getCredentials('admin')) {
      await safeScreenshot(page, '09-admin-users.png', async () => {
        if (!(await loginAsRole(page, 'admin'))) {
          throw new Error('admin login required');
        }
        await page.goto('/admin/users');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1200);
        await safeLogout(page);
      });

      await safeScreenshot(page, '10-admin-products-teams.png', async () => {
        if (!(await loginAsRole(page, 'admin'))) {
          throw new Error('admin login required');
        }
        await page.goto('/admin/products');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1200);
        await safeLogout(page);
      });
    } else {
      warn('Admin credentials missing, skipping admin screenshots');
    }

    await safeScreenshot(page, '11-notification-center.png', async () => {
      const asAgent = await loginAsRole(page, 'agent');
      const loggedIn = asAgent || (await loginAsRole(page, 'customer'));
      if (!loggedIn) {
        throw new Error('agent or customer login required for notifications');
      }
      await page.goto(asAgent ? '/agent/inbox' : '/customer/tickets');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(800);
      const opened = await openNotificationCenter(page);
      if (!opened) {
        warn('Notification panel could not be opened — capturing bell area anyway.');
      }
      await safeLogout(page);
    });

    const saved = SCREENSHOT_FILES.filter((f) => fs.existsSync(path.join(SCREENSHOTS_DIR, f)));
    console.log(`[report-screenshots] Done. ${saved.length}/${SCREENSHOT_FILES.length} files in ${SCREENSHOTS_DIR}`);
    console.log(`[report-screenshots] API_URL=${API_URL} BASE_URL=${BASE_URL}`);
  });
});
