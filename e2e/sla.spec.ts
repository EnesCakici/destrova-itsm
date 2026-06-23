import dotenv from 'dotenv';
import path from 'path';
import { expect, test } from '@playwright/test';
import {
  assignToMe,
  createTicket,
  deleteTicketAsManager,
  getTicket,
  getToken,
  postTicketAction,
  resolveTicket,
  waitForTicketStatus,
} from './helpers/api';
import {
  listNotifications,
  notificationHeadline,
  waitForTicketNotification,
} from './helpers/notifications';
import {
  postSlaBreachWebhook,
  postSlaBreachWebhookWithEventId,
  postSlaUpdatedWebhook,
} from './helpers/webhook';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const customerEmail = process.env.CUSTOMER_EMAIL!;
const customerPassword = process.env.CUSTOMER_PASSWORD!;
const agentEmail = process.env.AGENT_EMAIL!;
const agentPassword = process.env.AGENT_PASSWORD!;
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

function parseDate(value: string): Date {
  return new Date(value);
}

function hoursBetween(start: string, end: string): number {
  return (parseDate(end).getTime() - parseDate(start).getTime()) / 3_600_000;
}

test.describe.configure({ mode: 'serial' });

test.describe('P1 SLA engine', () => {
  test('TC-SLA-001 · HIGH priority ticket gets 4h SLA window', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const ticket = await createTicket(customerToken, `SLA-001 ${Date.now()}`, 'SLA test', 'HIGH');
    track(ticket.id);

    expect(ticket.createdAt).toBeTruthy();
    expect(ticket.slaDueDate).toBeTruthy();
    expect(ticket.slaState).toBe('SAFE');

    const deltaHours = hoursBetween(ticket.createdAt!, ticket.slaDueDate!);
    expect(deltaHours).toBeGreaterThan(3.9);
    expect(deltaHours).toBeLessThan(4.1);
  });

  test('TC-SLA-002 · MEDIUM priority ticket gets 24h SLA window', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const ticket = await createTicket(customerToken, `SLA-002 ${Date.now()}`, 'SLA test', 'MEDIUM');
    track(ticket.id);

    const deltaHours = hoursBetween(ticket.createdAt!, ticket.slaDueDate!);
    expect(deltaHours).toBeGreaterThan(23.9);
    expect(deltaHours).toBeLessThan(24.1);
  });

  test('TC-SLA-003 · LOW priority ticket gets 48h SLA window', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const ticket = await createTicket(customerToken, `SLA-003 ${Date.now()}`, 'SLA test', 'LOW');
    track(ticket.id);

    const deltaHours = hoursBetween(ticket.createdAt!, ticket.slaDueDate!);
    expect(deltaHours).toBeGreaterThan(47.9);
    expect(deltaHours).toBeLessThan(48.1);
  });

  test('TC-SLA-004 · slaState AT_RISK after 80% of SLA elapsed', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const ticket = await createTicket(customerToken, `SLA-004 ${Date.now()}`, 'SLA test', 'HIGH');
    track(ticket.id);

    const slaDueDate = new Date(Date.now() + 90_000).toISOString();
    const update = await postSlaUpdatedWebhook(ticket.id, { slaDueDate });
    expect(update.ok).toBe(true);

    const deadline = Date.now() + 120_000;
    let current: Awaited<ReturnType<typeof getTicket>> | undefined;
    while (Date.now() < deadline) {
      current = await getTicket(customerToken, ticket.id);
      if (current.slaState === 'AT_RISK') {
        break;
      }
      if (current.slaState === 'BREACHED') {
        throw new Error('Ticket became BREACHED before AT_RISK threshold');
      }
      await new Promise((r) => setTimeout(r, 2000));
    }

    expect(current?.slaState).toBe('AT_RISK');
  });

  test('TC-SLA-005 · slaState BREACHED when due date is in the past', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const ticket = await createTicket(customerToken, `SLA-005 ${Date.now()}`, 'SLA test', 'MEDIUM');
    track(ticket.id);

    const pastDue = new Date(Date.now() - 60_000).toISOString();
    const update = await postSlaUpdatedWebhook(ticket.id, { slaDueDate: pastDue });
    expect(update.ok).toBe(true);

    const current = await getTicket(customerToken, ticket.id);
    expect(current.slaState).toBe('BREACHED');
  });

  test('TC-SLA-006 · WAITING_FOR_CUSTOMER pauses SLA state', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `SLA-006 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    const wait = await postTicketAction(agentToken, ticket.id, 'wait-for-customer');
    expect(wait.status).toBe(202);
    await waitForTicketStatus(agentToken, ticket.id, 'WAITING_FOR_CUSTOMER');

    const current = await getTicket(agentToken, ticket.id);
    expect(current.slaState).toBe('PAUSED');
  });

  test('TC-SLA-007 · RESOLVED ticket stops SLA state', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `SLA-007 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');
    await resolveTicket(agentToken, ticket.id, 'Fixed for SLA stopped test.');
    await waitForTicketStatus(agentToken, ticket.id, 'RESOLVED');

    const current = await getTicket(agentToken, ticket.id);
    expect(current.slaState).toBe('STOPPED');
  });

  test('TC-SLA-008 · duplicate SLA breach webhook does not duplicate notifications within 24h', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `SLA-008 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    const eventId = `e2e-sla-dedupe-${ticket.id}`;
    expect((await postSlaBreachWebhookWithEventId(ticket.id, eventId)).ok).toBe(true);
    await waitForTicketNotification(
      agentToken,
      ticket.id,
      (n) => n.type === 'SLA_BREACHED',
    );

    const countAfterFirst = (await listNotifications(agentToken)).filter(
      (n) => n.relatedTicketId === ticket.id && n.type === 'SLA_BREACHED',
    ).length;

    expect((await postSlaBreachWebhookWithEventId(ticket.id, `${eventId}-retry`)).ok).toBe(true);
    await new Promise((r) => setTimeout(r, 2000));

    const countAfterSecond = (await listNotifications(agentToken)).filter(
      (n) => n.relatedTicketId === ticket.id && n.type === 'SLA_BREACHED',
    ).length;
    expect(countAfterSecond).toBe(countAfterFirst);
  });

  test('TC-SLA-009 · SLA breach notifies assignee and manager', async () => {
    test.skip(!managerEmail || !managerPassword, 'MANAGER_* credentials required');

    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const managerToken = await getToken(managerEmail!, managerPassword!);

    const ticket = await createTicket(customerToken, `SLA-009 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    expect((await postSlaBreachWebhook(ticket.id)).ok).toBe(true);

    const agentNotif = await waitForTicketNotification(
      agentToken,
      ticket.id,
      (n) => n.type === 'SLA_BREACHED' && notificationHeadline(n.message) === 'SLA Breached',
    );
    expect(agentNotif.message).toContain('Immediate action required');

    await waitForTicketNotification(
      managerToken,
      ticket.id,
      (n) => n.type === 'SLA_BREACHED',
    );
  });

  test('TC-SLA-010 · priority HIGH to MEDIUM extends SLA due date', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `SLA-010 ${Date.now()}`, 'SLA test', 'HIGH');
    track(ticket.id);
    const initialHours = hoursBetween(ticket.createdAt!, ticket.slaDueDate!);
    expect(initialHours).toBeLessThan(5);

    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    const change = await postTicketAction(agentToken, ticket.id, 'change-priority', {
      priority: 'MEDIUM',
    });
    expect(change.status).toBe(202);

    const deadline = Date.now() + 30_000;
    let updated: Awaited<ReturnType<typeof getTicket>> | null = null;
    while (Date.now() < deadline) {
      const current = await getTicket(agentToken, ticket.id);
      const delta = hoursBetween(ticket.createdAt!, current.slaDueDate ?? ticket.slaDueDate!);
      if (delta > 20) {
        updated = current;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    expect(updated).not.toBeNull();
    const extendedHours = hoursBetween(ticket.createdAt!, updated!.slaDueDate!);
    expect(extendedHours).toBeGreaterThan(23.5);
    expect(extendedHours).toBeLessThan(24.5);
    expect(updated!.priority).toBe('MEDIUM');
  });
});
