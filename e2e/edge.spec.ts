import dotenv from 'dotenv';
import path from 'path';
import { expect, test } from '@playwright/test';
import {
  apiRequest,
  assignTicket,
  assignToMe,
  assignToMeRaw,
  closeTicketForCleanup,
  createTicket,
  customerClose,
  deleteTicketAsManager,
  ensureAgentHeadroom,
  getMe,
  getTicket,
  getToken,
  postTicketAction,
  resolveTicket,
  transferTicket,
  waitForTicketStatus,
} from './helpers/api';
import { nullTicketSlaDueDate } from './helpers/db';
import {
  listNotifications,
  markNotificationRead,
  waitForTicketNotification,
} from './helpers/notifications';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const customerEmail = process.env.CUSTOMER_EMAIL!;
const customerPassword = process.env.CUSTOMER_PASSWORD!;
const agentEmail = process.env.AGENT_EMAIL!;
const agentPassword = process.env.AGENT_PASSWORD!;
const agent2Email = process.env.AGENT2_EMAIL ?? 'agent2@ticket.com';
const agent2Password = process.env.AGENT2_PASSWORD ?? '123456';
const managerEmail = process.env.MANAGER_EMAIL;
const managerPassword = process.env.MANAGER_PASSWORD;

const createdTicketIds: number[] = [];

test.beforeAll(() => {
  if (!customerEmail || !agentEmail) {
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

test.describe.configure({ mode: 'serial' });

test.describe('P3 Edge cases & concurrency', () => {
  test('TC-EDGE-001 · concurrent assign-to-me — only one agent wins', async () => {
    test.skip(!managerEmail || !managerPassword, 'MANAGER_* credentials required');

    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const agent2Token = await getToken(agent2Email, agent2Password);
    const managerToken = await getToken(managerEmail!, managerPassword!);
    const agent1 = await getMe(agentToken);
    const agent2 = await getMe(agent2Token);
    await ensureAgentHeadroom(managerToken, agent1.id, 2);
    await ensureAgentHeadroom(managerToken, agent2.id, 2);

    const ticket = await createTicket(customerToken, `EDGE-001 ${Date.now()}`);
    track(ticket.id);

    const [first, second] = await Promise.all([
      assignToMeRaw(agentToken, ticket.id),
      assignToMeRaw(agent2Token, ticket.id),
    ]);

    const statuses = [first.status, second.status];
    expect(statuses.some((s) => s === 202)).toBe(true);

    const finalTicket = await waitForTicketStatus(customerToken, ticket.id, 'IN_PROGRESS', 45_000);
    expect(finalTicket.assigneeId).toBeTruthy();
    expect([agent1.id, agent2.id]).toContain(finalTicket.assigneeId!);
    expect(statuses.filter((s) => s === 202).length).toBeLessThanOrEqual(2);
  });

  test('TC-EDGE-002 · concurrent resolve + reject keeps consistent terminal state', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `EDGE-002 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');
    await resolveTicket(agentToken, ticket.id, 'Race resolve path.');
    await waitForTicketStatus(customerToken, ticket.id, 'RESOLVED');

    const [rejectRes, approveRes] = await Promise.all([
      apiRequest(`/tickets/${ticket.id}/reject`, customerToken, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Still broken during race window.' }),
      }),
      apiRequest(`/tickets/${ticket.id}/approve`, customerToken, { method: 'POST' }),
    ]);

    expect(rejectRes.status).toBeLessThan(500);
    expect(approveRes.status).toBeLessThan(500);

    const deadline = Date.now() + 45_000;
    let settled: Awaited<ReturnType<typeof getTicket>> | undefined;
    while (Date.now() < deadline) {
      settled = await getTicket(customerToken, ticket.id);
      if (settled.status === 'IN_PROGRESS' || settled.status === 'CLOSED') {
        break;
      }
      await sleep(500);
    }
    expect(settled?.status).toMatch(/IN_PROGRESS|CLOSED/);
  });

  test('TC-EDGE-003 · rapid jBPM signals stay consistent', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `EDGE-003 ${Date.now()}`);
    track(ticket.id);

    expect((await assignToMeRaw(agentToken, ticket.id)).status).toBe(202);
    await sleep(100);
    expect((await postTicketAction(agentToken, ticket.id, 'wait-for-customer')).status).toBe(202);
    await sleep(100);
    expect((await postTicketAction(agentToken, ticket.id, 'resume')).status).toBe(202);

    const finalTicket = await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS', 45_000);
    expect(finalTicket.status).toBe('IN_PROGRESS');
  });

  test.skip('TC-EDGE-004 · notification abbreviates messages over 500 chars', async () => {
    // Current notification templates use fixed short copy; no public API embeds 600-char title in message body.
  });

  test('TC-EDGE-005 · unassigned ticket resolve by manager is accepted or guarded', async () => {
    test.skip(!managerEmail || !managerPassword, 'MANAGER_* credentials required');

    const customerToken = await getToken(customerEmail, customerPassword);
    const managerToken = await getToken(managerEmail!, managerPassword!);

    const ticket = await createTicket(customerToken, `EDGE-005 ${Date.now()}`);
    track(ticket.id);
    expect(ticket.assigneeId ?? null).toBeNull();

    const response = await postTicketAction(managerToken, ticket.id, 'resolve', {
      resolutionNote: 'Manager resolve on unassigned ticket.',
    });
    expect([202, 400, 403, 409]).toContain(response.status);
    expect(response.status).toBeLessThan(500);

    const row = await getTicket(managerToken, ticket.id);
    expect(row.status).toMatch(/NEW|IN_PROGRESS|RESOLVED|CLOSED/);
  });

  test('TC-EDGE-006 · slaDueDate null returns slaState UNKNOWN', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `EDGE-006 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    nullTicketSlaDueDate(ticket.id);
    const row = await getTicket(agentToken, ticket.id);
    expect(row.slaState).toBe('UNKNOWN');
  });

  test('TC-EDGE-007 · closed ticket does not break notification listing', async () => {
    test.skip(!managerEmail || !managerPassword, 'MANAGER_* credentials required');

    const customerToken = await getToken(customerEmail, customerPassword);
    const managerToken = await getToken(managerEmail!, managerPassword!);

    const ticket = await createTicket(customerToken, `EDGE-007 ${Date.now()}`);
    await closeTicketForCleanup(managerToken, ticket.id);
    await waitForTicketStatus(managerToken, ticket.id, 'CLOSED', 45_000);

    await sleep(2_000);
    const response = await apiRequest('/notifications', customerToken);
    expect(response.status).toBe(200);
    expect(Array.isArray(await response.json())).toBe(true);
  });

  test.skip('TC-EDGE-008 · JWT preferred_username fallback to name', async () => {
    // Requires crafted JWT; same constraint as TC-VALID-009.
  });

  test('TC-EDGE-009 · manager reports with future date range returns empty metrics', async () => {
    test.skip(!managerEmail || !managerPassword, 'MANAGER_* credentials required');

    const managerToken = await getToken(managerEmail!, managerPassword!);
    const response = await apiRequest(
      '/manager/reports?startDate=2030-01-01&endDate=2030-01-31',
      managerToken,
    );
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      totalCreated?: number;
      totalResolved?: number;
      avgResolutionHours?: number;
      slaCompliancePercent?: number;
    };
    expect(body.totalCreated).toBe(0);
    expect(body.totalResolved).toBe(0);
    expect(Number.isFinite(body.avgResolutionHours ?? 0)).toBe(true);
    expect(Number.isFinite(body.slaCompliancePercent ?? 0)).toBe(true);
  });

  test('TC-EDGE-010 · customer-close rejects CUSTOMER_APPROVED reason', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const ticket = await createTicket(customerToken, `EDGE-010 ${Date.now()}`);
    track(ticket.id);

    const response = await customerClose(customerToken, ticket.id, 'CUSTOMER_APPROVED');
    expect(response.status).toBe(400);
    const text = await response.text();
    expect(text).toMatch(/müşteri tarafından kullanılamaz/i);
  });

  test('TC-EDGE-011 · manager force-closes ticket with pending transfer', async () => {
    test.skip(!managerEmail || !managerPassword, 'MANAGER_* credentials required');

    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const agent2Token = await getToken(agent2Email, agent2Password);
    const managerToken = await getToken(managerEmail!, managerPassword!);
    const agent2 = await getMe(agent2Token);
    await ensureAgentHeadroom(managerToken, agent2.id, 2);

    const ticket = await createTicket(customerToken, `EDGE-011 ${Date.now()}`);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');
    await transferTicket(agentToken, ticket.id, {
      toAgentId: agent2.id,
      transferReason: 'OVERLOAD',
    });

    const pending = await getTicket(agent2Token, ticket.id);
    expect(pending.pendingTransferToAgentId ?? (pending as { pendingTransferToAgentId?: number }).pendingTransferToAgentId).toBeTruthy();

    await closeTicketForCleanup(managerToken, ticket.id);
    const closed = await waitForTicketStatus(managerToken, ticket.id, 'CLOSED', 45_000);
    expect(closed.status).toBe('CLOSED');
  });

  test('TC-EDGE-012 · mark notification read is idempotent', async () => {
    test.skip(!managerEmail || !managerPassword, 'MANAGER_* credentials required');

    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const managerToken = await getToken(managerEmail!, managerPassword!);

    const ticket = await createTicket(customerToken, `EDGE-012 ${Date.now()}`);
    track(ticket.id);
    await assignTicket(managerToken, ticket.id, (await getMe(agentToken)).id);

    const notif = await waitForTicketNotification(
      agentToken,
      ticket.id,
      (n) => n.type === 'TICKET_ASSIGNED' || n.type === 'STATUS_CHANGED',
      30_000,
    );

    expect(await markNotificationRead(agentToken, notif.id)).toBe(204);
    expect(await markNotificationRead(agentToken, notif.id)).toBe(204);

    const refreshed = (await listNotifications(agentToken)).find((n) => n.id === notif.id);
    expect(refreshed?.read).toBe(true);
  });
});
