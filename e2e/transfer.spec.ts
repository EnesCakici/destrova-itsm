import dotenv from 'dotenv';
import path from 'path';
import { expect, test } from '@playwright/test';
import {
  apiRequest,
  assignTicket,
  assignToMe,
  createTicket,
  deleteTicketAsManager,
  getMe,
  getToken,
  rejectTransfer,
  transferTicket,
  updateAgentLimit,
  waitForTicketStatus,
} from './helpers/api';
import {
  notificationHeadline,
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
let restoredAgent2Limit: number | null = null;

test.beforeAll(() => {
  if (!customerEmail || !customerPassword || !agentEmail || !agentPassword) {
    throw new Error('Missing CUSTOMER_* or AGENT_* credentials in .env.test');
  }
});

test.afterAll(async () => {
  if (managerEmail && managerPassword && restoredAgent2Limit != null) {
    const managerToken = await getToken(managerEmail, managerPassword);
    const agent2Token = await getToken(agent2Email, agent2Password);
    const agent2 = await getMe(agent2Token);
    await updateAgentLimit(managerToken, agent2.id, restoredAgent2Limit);
  }

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

test.describe('P1 Transfer scenarios', () => {
  test('TC-TRNSFR-001 · agent-to-agent transfer request creates pending state', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const agent2Token = await getToken(agent2Email, agent2Password);
    const agent1 = await getMe(agentToken);
    const agent2 = await getMe(agent2Token);

    const ticket = await createTicket(customerToken, `TRNSFR-001 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    const transferred = await transferTicket(agentToken, ticket.id, {
      toAgentId: agent2.id,
      transferReason: 'OVERLOAD',
      transferNote: 'Hasta oldum.',
      internalMessage: `@${agent2.email ?? agent2Email} Seni de haberdar ettim.`,
    });

    expect(transferred.assigneeId).toBe(agent1.id);
    expect(transferred.pendingTransferToAgentId).toBe(agent2.id);

    await waitForTicketNotification(
      agent2Token,
      ticket.id,
      (n) => notificationHeadline(n.message) === 'Transfer Request',
    );
    await waitForTicketNotification(
      agentToken,
      ticket.id,
      (n) => notificationHeadline(n.message) === 'Transfer Pending',
    );
  });

  test('TC-TRNSFR-002 · target agent approves transfer', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const agent2Token = await getToken(agent2Email, agent2Password);
    const agent2 = await getMe(agent2Token);

    const ticket = await createTicket(customerToken, `TRNSFR-002 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');
    await transferTicket(agentToken, ticket.id, {
      toAgentId: agent2.id,
      transferReason: 'EXPERTISE',
    });

    const response = await apiRequest(`/tickets/${ticket.id}/transfer/approve`, agent2Token, {
      method: 'POST',
    });
    expect(response.status).toBe(200);

    const updated = (await response.json()) as {
      assigneeId: number;
      pendingTransferToAgentId?: number | null;
    };
    expect(updated.assigneeId).toBe(agent2.id);
    expect(updated.pendingTransferToAgentId ?? null).toBeNull();

    await waitForTicketNotification(
      agentToken,
      ticket.id,
      (n) => notificationHeadline(n.message) === 'Transfer Approved',
    );
  });

  test('TC-TRNSFR-003 · target agent rejects transfer', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const agent2Token = await getToken(agent2Email, agent2Password);
    const agent1 = await getMe(agentToken);
    const agent2 = await getMe(agent2Token);

    const ticket = await createTicket(customerToken, `TRNSFR-003 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');
    await transferTicket(agentToken, ticket.id, {
      toAgentId: agent2.id,
      transferReason: 'VACATION',
    });

    const updated = await rejectTransfer(agent2Token, ticket.id, 'Kapasitem dolu.');
    expect(updated.assigneeId).toBe(agent1.id);
    expect((updated as { pendingTransferToAgentId?: number | null }).pendingTransferToAgentId ?? null).toBeNull();

    const detail = await apiRequest(`/tickets/${ticket.id}`, agentToken);
    const body = (await detail.json()) as { comments?: Array<{ message?: string; isInternal?: boolean }> };
    const declineComment = body.comments?.find(
      (c) => c.isInternal && (c.message ?? '').includes('Transfer request declined'),
    );
    expect(declineComment?.message).toContain('Kapasitem dolu.');

    await waitForTicketNotification(
      agentToken,
      ticket.id,
      (n) => notificationHeadline(n.message) === 'Transfer Declined',
    );
  });

  test('TC-TRNSFR-004 · manager direct transfer without pending approval', async () => {
    test.skip(!managerEmail || !managerPassword, 'MANAGER_* credentials required');

    const customerToken = await getToken(customerEmail, customerPassword);
    const agent2Token = await getToken(agent2Email, agent2Password);
    const managerToken = await getToken(managerEmail!, managerPassword!);
    const agent2 = await getMe(agent2Token);

    const ticket = await createTicket(customerToken, `TRNSFR-004 ${Date.now()}`);
    track(ticket.id);

    const transferred = await transferTicket(managerToken, ticket.id, {
      toAgentId: agent2.id,
      transferReason: 'EXPERTISE',
    });

    expect(transferred.assigneeId).toBe(agent2.id);
    expect((transferred as { pendingTransferToAgentId?: number | null }).pendingTransferToAgentId ?? null).toBeNull();

    await waitForTicketNotification(
      agent2Token,
      ticket.id,
      (n) => n.type === 'TICKET_ASSIGNED' && notificationHeadline(n.message) === 'Request Transferred',
    );
  });

  test('TC-TRNSFR-005 · approve transfer fails when target agent at capacity', async () => {
    test.skip(!managerEmail || !managerPassword, 'MANAGER_* credentials required');

    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const agent2Token = await getToken(agent2Email, agent2Password);
    const managerToken = await getToken(managerEmail!, managerPassword!);
    const agent2 = await getMe(agent2Token);

    const capacities = (await (
      await apiRequest('/agent/capacities', agentToken)
    ).json()) as Array<{ agentId: number; activeTicketCount?: number; maxTicketLimit?: number }>;
    const agent2Capacity = capacities.find((c) => c.agentId === agent2.id);
    const activeCount = agent2Capacity?.activeTicketCount ?? 0;
    restoredAgent2Limit = agent2Capacity?.maxTicketLimit ?? 10;

    await updateAgentLimit(managerToken, agent2.id, Math.max(activeCount, 0));

    const ticket = await createTicket(customerToken, `TRNSFR-005 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');
    await transferTicket(agentToken, ticket.id, {
      toAgentId: agent2.id,
      transferReason: 'OVERLOAD',
    });

    const response = await apiRequest(`/tickets/${ticket.id}/transfer/approve`, agent2Token, {
      method: 'POST',
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as { message?: string };
    expect(body.message).toMatch(/limit/i);
  });
});
