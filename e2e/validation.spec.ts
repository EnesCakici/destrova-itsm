import dotenv from 'dotenv';
import path from 'path';
import { expect, test } from '@playwright/test';
import {
  apiRequest,
  assignToMe,
  createTicket,
  deleteTicketAsManager,
  getMe,
  getToken,
  waitForTicketStatus,
} from './helpers/api';

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
  if (!customerEmail || !customerPassword || !agentEmail || !agentPassword) {
    throw new Error('Missing CUSTOMER_* or AGENT_* credentials in .env.test');
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

async function peerAgentId(agentToken: string, excludeUserId: number): Promise<number> {
  const response = await apiRequest('/agent/capacities', agentToken);
  if (!response.ok) {
    throw new Error(`GET /agent/capacities failed: ${response.status}`);
  }
  const peers = (await response.json()) as Array<{ agentId: number }>;
  const peer = peers.find((p) => p.agentId !== excludeUserId);
  if (!peer) {
    throw new Error('No peer agent found for transfer tests');
  }
  return peer.agentId;
}

test.describe.configure({ mode: 'serial' });

test.describe('P1 Validation guards', () => {
  test('TC-VALID-001 · title longer than 200 characters rejected', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const title = 'V'.repeat(201);
    const response = await apiRequest('/tickets', customerToken, {
      method: 'POST',
      body: JSON.stringify({
        title,
        description: 'Title length guard test.',
        priority: 'MEDIUM',
      }),
    });
    expect(response.status).toBe(400);
  });

  test('TC-VALID-002 · resolution note shorter than 10 characters rejected', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `VALID-002 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    const response = await apiRequest(`/tickets/${ticket.id}/actions/resolve`, agentToken, {
      method: 'POST',
      body: JSON.stringify({ resolutionNote: '123456789' }),
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as { message?: string };
    expect(body.message).toMatch(/10 characters/i);
  });

  test('TC-VALID-003 · invalid priority enum rejected', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const response = await apiRequest('/tickets', customerToken, {
      method: 'POST',
      body: JSON.stringify({
        title: `VALID-003 ${Date.now()}`,
        description: 'Invalid priority test.',
        priority: 'CRITICAL',
      }),
    });
    expect(response.status).toBe(400);
  });

  test('TC-VALID-004 · invalid status enum on PUT rejected', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `VALID-004 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    const response = await apiRequest(`/tickets/${ticket.id}`, agentToken, {
      method: 'PUT',
      body: JSON.stringify({ status: 'UNKNOWN' }),
    });
    expect(response.status).not.toBe(200);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('TC-VALID-005 · invalid transferReason rejected', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const me = await getMe(agentToken);
    const targetId = await peerAgentId(agentToken, me.id);

    const ticket = await createTicket(customerToken, `VALID-005 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    const response = await apiRequest(`/tickets/${ticket.id}/transfer`, agentToken, {
      method: 'POST',
      body: JSON.stringify({ toAgentId: targetId, transferReason: 'BORED' }),
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as { message?: string };
    expect(body.message).toMatch(/transferReason/i);
  });

  test('TC-VALID-006 · missing transferReason rejected', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const me = await getMe(agentToken);
    const targetId = await peerAgentId(agentToken, me.id);

    const ticket = await createTicket(customerToken, `VALID-006 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    const response = await apiRequest(`/tickets/${ticket.id}/transfer`, agentToken, {
      method: 'POST',
      body: JSON.stringify({ toAgentId: targetId }),
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as { message?: string };
    expect(body.message).toMatch(/transferReason zorunludur/i);
  });

  test('TC-VALID-007 · blank comment message rejected', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const ticket = await createTicket(customerToken, `VALID-007 ${Date.now()}`);
    track(ticket.id);

    const response = await apiRequest(`/tickets/${ticket.id}/comments`, customerToken, {
      method: 'POST',
      body: JSON.stringify({ message: '   ', isInternal: false }),
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as { message?: string };
    expect(body.message).toMatch(/Yorum mesaji zorunludur/i);
  });

  test('TC-VALID-008 · negative worklog duration rejected', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `VALID-008 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    const response = await apiRequest(`/tickets/${ticket.id}/worklogs`, agentToken, {
      method: 'POST',
      body: JSON.stringify({ durationMinutes: -10, description: 'Negative duration test' }),
    });
    expect(response.status).toBe(400);
  });

  test.skip('TC-VALID-009 · empty JWT sub rejected', async () => {
    // Requires a forged JWT; not feasible with Keycloak password grant in E2E.
  });

  test('TC-VALID-010 · transfer to current assignee rejected', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const me = await getMe(agentToken);

    const ticket = await createTicket(customerToken, `VALID-010 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    const response = await apiRequest(`/tickets/${ticket.id}/transfer`, agentToken, {
      method: 'POST',
      body: JSON.stringify({ toAgentId: me.id, transferReason: 'EXPERTISE' }),
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as { message?: string };
    expect(body.message).toMatch(/zaten bu agent/i);
  });

  test.skip('TC-VALID-011 · transfer to agent without email rejected', async () => {
    // Precondition: target agent must have null/blank email in DB — not exposed via capacities API.
  });

  test('TC-VALID-012 · duplicate pending transfer rejected', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const agent2Token = await getToken(agent2Email, agent2Password);
    const agent1 = await getMe(agentToken);
    const agent2 = await getMe(agent2Token);

    const ticket = await createTicket(customerToken, `VALID-012 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    const first = await apiRequest(`/tickets/${ticket.id}/transfer`, agentToken, {
      method: 'POST',
      body: JSON.stringify({ toAgentId: agent2.id, transferReason: 'OVERLOAD' }),
    });
    expect(first.status).toBe(200);

    const second = await apiRequest(`/tickets/${ticket.id}/transfer`, agentToken, {
      method: 'POST',
      body: JSON.stringify({ toAgentId: agent2.id, transferReason: 'VACATION' }),
    });
    expect(second.status).toBe(400);
    const body = (await second.json()) as { message?: string };
    expect(body.message).toMatch(/bekleyen bir devir talebi/i);

    void agent1;
  });
});
