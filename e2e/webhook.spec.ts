import dotenv from 'dotenv';
import path from 'path';
import { expect, test } from '@playwright/test';
import {
  assignToMe,
  createTicket,
  deleteTicketAsManager,
  getTicket,
  getToken,
  waitForTicketStatus,
} from './helpers/api';
import { countWebhookEventsForId, webhookEventExists } from './helpers/db';
import {
  postSlaBreachWebhookWithEventId,
  postSlaUpdatedWebhook,
  type WebhookResponseBody,
} from './helpers/webhook';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const customerEmail = process.env.CUSTOMER_EMAIL!;
const customerPassword = process.env.CUSTOMER_PASSWORD!;
const agentEmail = process.env.AGENT_EMAIL!;
const agentPassword = process.env.AGENT_PASSWORD!;
const managerEmail = process.env.MANAGER_EMAIL;
const managerPassword = process.env.MANAGER_PASSWORD;
const shadowProjection = process.env.SHADOW_PROJECTION === 'true';

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

test.describe.configure({ mode: 'serial' });

test.describe('P4 Webhook & shadow', () => {
  test('TC-WH-001 · webhook request processed and persisted', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `WH-001 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    const eventId = `e2e-wh-001-${ticket.id}-${Date.now()}`;
    const current = await getTicket(agentToken, ticket.id);
    const response = await postSlaUpdatedWebhook(
      ticket.id,
      {
        priority: current.priority,
        slaDueDate: current.slaDueDate,
        totalPausedDurationMs: current.totalPausedDurationMs ?? 0,
      },
      eventId,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as WebhookResponseBody;
    expect(body.accepted).toBe(true);
    expect(body.duplicate).toBe(false);
    expect(body.ticketId).toBe(ticket.id);
    expect(webhookEventExists(eventId)).toBe(true);
  });

  test('TC-WH-002 · duplicate event ID is idempotent', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `WH-002 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    const eventId = `e2e-wh-002-${ticket.id}`;
    const first = await postSlaBreachWebhookWithEventId(ticket.id, eventId);
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as WebhookResponseBody;
    expect(firstBody.accepted).toBe(true);
    expect(firstBody.duplicate).toBe(false);

    const second = await postSlaBreachWebhookWithEventId(ticket.id, eventId);
    expect(second.status).toBe(200);
    const secondBody = (await second.json()) as WebhookResponseBody;
    expect(secondBody.accepted).toBe(true);
    expect(secondBody.duplicate).toBe(true);
    expect(countWebhookEventsForId(eventId)).toBe(1);
  });

  test('TC-WH-003 · shadow comparator accepts matching projection payload', async () => {
    test.skip(
      !shadowProjection,
      'Default stack uses live projection (shadow-projection=false); set SHADOW_PROJECTION=true to run',
    );

    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `WH-003 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    const current = await getTicket(agentToken, ticket.id);
    const eventId = `e2e-wh-003-${ticket.id}-${Date.now()}`;
    const response = await postSlaUpdatedWebhook(
      ticket.id,
      {
        priority: current.priority,
        slaDueDate: current.slaDueDate,
        totalPausedDurationMs: current.totalPausedDurationMs ?? 0,
      },
      eventId,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as WebhookResponseBody;
    expect(body.accepted).toBe(true);
    expect(body.duplicate).toBe(false);
  });
});
