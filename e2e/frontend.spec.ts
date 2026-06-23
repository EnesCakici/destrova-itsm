import dotenv from 'dotenv';
import path from 'path';
import { expect, test, type Page } from '@playwright/test';
import { loginAs } from './helpers/auth';
import {
  assignToMe,
  createTicket,
  deleteTicketAsManager,
  getToken,
  getTicket,
  postTicketAction,
  resolveTicket,
  waitForTicketStatus,
} from './helpers/api';
import { postSlaUpdatedWebhook } from './helpers/webhook';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const customerEmail = process.env.CUSTOMER_EMAIL!;
const customerPassword = process.env.CUSTOMER_PASSWORD!;
const agentEmail = process.env.AGENT_EMAIL!;
const agentPassword = process.env.AGENT_PASSWORD!;
const managerEmail = process.env.MANAGER_EMAIL;
const managerPassword = process.env.MANAGER_PASSWORD;

const createdTicketIds: number[] = [];

test.beforeAll(() => {
  if (!customerEmail || !customerPassword || !agentEmail || !agentPassword) {
    throw new Error('Missing CUSTOMER_* or AGENT_* in .env.test');
  }
});

test.afterAll(async () => {
  if (!managerEmail || !managerPassword || createdTicketIds.length === 0) {
    return;
  }
  const managerToken = await getToken(managerEmail, managerPassword);
  for (const id of createdTicketIds) {
    await deleteTicketAsManager(managerToken, id);
  }
});

function track(id: number) {
  createdTicketIds.push(id);
}

test.describe.configure({ mode: 'serial' });

async function openAgentTicketByTitle(
  page: Page,
  title: string,
  options: { activityTab?: 'active' | 'involved' | 'closed' } = {},
) {
  await page.goto('/agent/inbox');
  if (options.activityTab && options.activityTab !== 'active') {
    const tabLabel = options.activityTab === 'closed' ? /^Closed/i : /^Involved/i;
    await page.getByRole('tab', { name: tabLabel }).click();
  }
  await page.getByRole('searchbox', { name: 'Search inbox tickets' }).fill(title);
  const row = page.getByTestId('ticket-list-item').filter({ hasText: title });
  await expect(row).toHaveCount(1, { timeout: 30_000 });
  await row.click();
}

test.describe('P2 Frontend guards & routing', () => {
  test('TC-FE-001 · customer home redirect', async ({ page }) => {
    await loginAs(page, customerEmail, customerPassword);
    await page.goto('/');
    await expect(page).toHaveURL(/\/customer\/tickets/, { timeout: 30_000 });
  });

  test('TC-FE-002 · agent home redirect', async ({ page }) => {
    await loginAs(page, agentEmail, agentPassword);
    await page.goto('/');
    await expect(page).toHaveURL(/\/agent\/inbox/, { timeout: 30_000 });
  });

  test('TC-FE-003 · manager home redirect', async ({ page }) => {
    test.skip(!managerEmail || !managerPassword, 'MANAGER_* credentials required');
    await loginAs(page, managerEmail!, managerPassword!);
    await page.goto('/');
    await expect(page).toHaveURL(/\/manager\/dashboard/, { timeout: 30_000 });
  });

  test('TC-FE-004 · unknown route shows 404 page', async ({ page }) => {
    await page.goto('/yokboylesibir');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });

  test('TC-FE-005 · protected routes redirect unauthenticated users to login', async ({ page }) => {
    await page.context().clearCookies();
    for (const route of ['/customer/tickets', '/agent/inbox', '/manager/dashboard', '/admin/overview']) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
    }
  });

  test('TC-FE-006 · customer blocked from agent route', async ({ page }) => {
    await loginAs(page, customerEmail, customerPassword);
    await page.goto('/agent/inbox');
    await expect(page).toHaveURL(/\/unauthorized/);
  });

  test('TC-FE-007 · customer ticket list empty filter state', async ({ page }) => {
    await loginAs(page, customerEmail, customerPassword);
    await page.goto('/customer/tickets');
    await page.locator('#customer-ticket-search').fill(`__no-match-${Date.now()}__`);
    await expect(page.getByText('No requests match your filters')).toBeVisible({ timeout: 30_000 });
  });

  test('TC-FE-008 · closed ticket hides agent action controls', async ({ page }) => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const title = `FE-008 ${Date.now()}`;

    const ticket = await createTicket(customerToken, title);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');
    await resolveTicket(agentToken, ticket.id, 'Closed ticket UI guard verification.');
    await waitForTicketStatus(customerToken, ticket.id, 'RESOLVED');
    const approve = await postTicketAction(customerToken, ticket.id, 'approve');
    expect(approve.status).toBe(202);
    await waitForTicketStatus(agentToken, ticket.id, 'CLOSED');

    await loginAs(page, agentEmail, agentPassword);
    await openAgentTicketByTitle(page, title, { activityTab: 'closed' });

    await expect(page.getByRole('button', { name: 'Close request' })).toHaveCount(0);
    await expect(page.getByText('Transfer ticket')).toHaveCount(0);
    await expect(page.getByLabel('Change ticket status')).toHaveCount(0);
  });

  test('TC-FE-009 · SLA bar colors differ by slaState', async ({ page }) => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const stamp = Date.now();

    const safe = await createTicket(customerToken, `FE-SLA-SAFE ${stamp}`);
    track(safe.id);
    await assignToMe(agentToken, safe.id);
    await waitForTicketStatus(agentToken, safe.id, 'IN_PROGRESS');

    const atRisk = await createTicket(customerToken, `FE-SLA-RISK ${stamp}`, 'SLA UI', 'HIGH');
    track(atRisk.id);
    await assignToMe(agentToken, atRisk.id);
    await waitForTicketStatus(agentToken, atRisk.id, 'IN_PROGRESS');
    await postSlaUpdatedWebhook(atRisk.id, {
      slaDueDate: new Date(Date.now() + 90_000).toISOString(),
    });
    const atRiskDeadline = Date.now() + 120_000;
    let atRiskRow: Awaited<ReturnType<typeof getTicket>> | undefined;
    while (Date.now() < atRiskDeadline) {
      atRiskRow = await getTicket(agentToken, atRisk.id);
      if (atRiskRow.slaState === 'AT_RISK') break;
      await new Promise((r) => setTimeout(r, 2_000));
    }
    expect(atRiskRow?.slaState).toBe('AT_RISK');

    const breached = await createTicket(customerToken, `FE-SLA-BREACH ${stamp}`);
    track(breached.id);
    await assignToMe(agentToken, breached.id);
    await waitForTicketStatus(agentToken, breached.id, 'IN_PROGRESS');
    expect(
      (
        await postSlaUpdatedWebhook(breached.id, {
          slaDueDate: new Date(Date.now() - 60_000).toISOString(),
        })
      ).ok,
    ).toBe(true);
    const breachDeadline = Date.now() + 120_000;
    let breachedRow: Awaited<ReturnType<typeof getTicket>> | undefined;
    while (Date.now() < breachDeadline) {
      breachedRow = await getTicket(agentToken, breached.id);
      if (breachedRow.slaState === 'BREACHED') break;
      await new Promise((r) => setTimeout(r, 2_000));
    }
    expect(breachedRow?.slaState).toBe('BREACHED');

    const paused = await createTicket(customerToken, `FE-SLA-PAUSE ${stamp}`);
    track(paused.id);
    await assignToMe(agentToken, paused.id);
    await waitForTicketStatus(agentToken, paused.id, 'IN_PROGRESS');
    expect((await postTicketAction(agentToken, paused.id, 'wait-for-customer')).status).toBe(202);
    await waitForTicketStatus(agentToken, paused.id, 'WAITING_FOR_CUSTOMER');

    await loginAs(page, agentEmail, agentPassword);
    await page.goto('/agent/inbox');
    await page.getByRole('searchbox', { name: 'Search inbox tickets' }).fill(String(stamp));

    const safeRow = page.getByTestId('ticket-list-item').filter({ hasText: `FE-SLA-SAFE ${stamp}` });
    await expect(safeRow.locator('.bg-blue-500')).toBeVisible({ timeout: 30_000 });

    const riskRow = page.getByTestId('ticket-list-item').filter({ hasText: `FE-SLA-RISK ${stamp}` });
    await expect(riskRow.locator('.bg-amber-500')).toBeVisible({ timeout: 30_000 });

    const breachRow = page.getByTestId('ticket-list-item').filter({ hasText: `FE-SLA-BREACH ${stamp}` });
    await expect(breachRow.locator('.bg-red-500')).toBeVisible({ timeout: 30_000 });

    const pauseRow = page.getByTestId('ticket-list-item').filter({ hasText: `FE-SLA-PAUSE ${stamp}` });
    await expect(pauseRow.locator('.bg-slate-400')).toBeVisible({ timeout: 30_000 });
  });

  test('TC-FE-010 · action polling updates ticket status in UI', async ({ page }) => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const title = `FE-010 ${Date.now()}`;

    const ticket = await createTicket(customerToken, title);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    await loginAs(page, agentEmail, agentPassword);
    await openAgentTicketByTitle(page, title);

    const resolveResponsePromise = page.waitForResponse(
      (res) =>
        res.request().method() === 'POST' &&
        res.url().includes(`/api/tickets/${ticket.id}/actions/resolve`) &&
        res.status() === 202,
      { timeout: 30_000 },
    );

    await page.getByLabel('Change ticket status').selectOption({ label: 'Resolved' });
    await page.getByLabel(/Solution summary/i).fill('Polling path verified via Playwright FE-010.');
    await page.getByRole('button', { name: 'Confirm changes' }).click();

    const resolveResponse = await resolveResponsePromise;
    const accepted = (await resolveResponse.json()) as { commandId?: string };
    expect(accepted.commandId).toBeTruthy();

    await expect(page.getByTestId('agent-ticket-status')).toHaveText('Resolved', { timeout: 30_000 });
  });
});
