import dotenv from 'dotenv';
import path from 'path';
import { expect, test } from '@playwright/test';
import {
  apiRequest,
  assignTicket,
  assignViaAction,
  createTicket,
  ensureAgentHeadroom,
  getTicket,
  getMe,
  getManagerCapacities,
  getToken,
  postTicketAction,
  updateAgentLimit,
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
let restoredAgentLimit: { agentId: number; limit: number } | null = null;

test.beforeAll(() => {
  if (!managerEmail || !managerPassword) {
    throw new Error('Missing MANAGER_* credentials in .env.test');
  }
  if (!customerEmail || !agentEmail) {
    throw new Error('Missing CUSTOMER_* or AGENT_* in .env.test');
  }
});

test.afterAll(async () => {
  if (restoredAgentLimit && managerEmail && managerPassword) {
    const managerToken = await getToken(managerEmail, managerPassword);
    await updateAgentLimit(managerToken, restoredAgentLimit.agentId, restoredAgentLimit.limit);
  }
});

function track(id: number) {
  createdTicketIds.push(id);
}

test.describe.configure({ mode: 'serial' });

test.describe('P2 Manager scenarios', () => {
  test('TC-MGR-001 · manager sees all tickets', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const managerToken = await getToken(managerEmail!, managerPassword!);

    const ticket = await createTicket(customerToken, `MGR-001 ${Date.now()}`);
    track(ticket.id);

    const customerList = await apiRequest('/tickets', customerToken);
    const managerList = await apiRequest('/tickets', managerToken);
    expect(customerList.ok).toBe(true);
    expect(managerList.ok).toBe(true);

    const customerTickets = (await customerList.json()) as Array<{ id: number }>;
    const managerTickets = (await managerList.json()) as Array<{ id: number }>;
    expect(managerTickets.length).toBeGreaterThanOrEqual(customerTickets.length);
    expect(managerTickets.some((t) => t.id === ticket.id)).toBe(true);
  });

  test('TC-MGR-002 · filtered manager ticket list', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const managerToken = await getToken(managerEmail!, managerPassword!);

    const ticket = await createTicket(
      customerToken,
      `MGR-002 ${Date.now()}`,
      'Filter test',
      'HIGH',
    );
    track(ticket.id);
    await assignTicket(managerToken, ticket.id, (await getMe(agentToken)).id);
    await waitForTicketStatus(managerToken, ticket.id, 'IN_PROGRESS');

    const response = await apiRequest(
      '/manager/tickets?status=IN_PROGRESS&priority=HIGH',
      managerToken,
    );
    expect(response.ok).toBe(true);
    const rows = (await response.json()) as Array<{ id: number; status: string; priority: string }>;
    expect(rows.some((t) => t.id === ticket.id)).toBe(true);
    expect(rows.every((t) => t.status === 'IN_PROGRESS' && t.priority === 'HIGH')).toBe(true);
  });

  test('TC-MGR-003 · manager assigns ticket to agent', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const managerToken = await getToken(managerEmail!, managerPassword!);
    const agent = await getMe(agentToken);

    const ticket = await createTicket(customerToken, `MGR-003 ${Date.now()}`);
    track(ticket.id);

    const response = await assignViaAction(managerToken, ticket.id, agent.id);
    expect(response.status).toBe(202);
    await waitForTicketStatus(managerToken, ticket.id, 'IN_PROGRESS');

    const updated = await getTicket(managerToken, ticket.id);
    expect(updated.assigneeId).toBe(agent.id);
  });

  test('TC-MGR-004 · manager force-closes ticket (no DELETE in UI)', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const managerToken = await getToken(managerEmail!, managerPassword!);

    const ticket = await createTicket(customerToken, `MGR-004 ${Date.now()}`);
    const closeResponse = await postTicketAction(managerToken, ticket.id, 'close', {
      closureReason: 'INVALID',
    });
    expect(closeResponse.status).toBe(202);
    await waitForTicketStatus(managerToken, ticket.id, 'CLOSED');
  });

  test('TC-MGR-005 · manager performance reports metrics', async () => {
    const managerToken = await getToken(managerEmail!, managerPassword!);
    const response = await apiRequest(
      '/manager/reports?startDate=2026-01-01&endDate=2026-12-31',
      managerToken,
    );
    expect(response.ok).toBe(true);

    const reports = (await response.json()) as {
      totalCreated: number;
      totalResolved: number;
      avgResolutionHours: number;
      slaCompliancePercent: number;
      volumeSeries: unknown[];
      products: unknown[];
      agents: unknown[];
      resolutionTrend: unknown[];
    };

    expect(typeof reports.totalCreated).toBe('number');
    expect(typeof reports.totalResolved).toBe('number');
    expect(typeof reports.avgResolutionHours).toBe('number');
    expect(typeof reports.slaCompliancePercent).toBe('number');
    expect(Array.isArray(reports.volumeSeries)).toBe(true);
    expect(Array.isArray(reports.products)).toBe(true);
    expect(Array.isArray(reports.agents)).toBe(true);
    expect(Array.isArray(reports.resolutionTrend)).toBe(true);
  });

  test('TC-MGR-006 · agent capacity table', async () => {
    const managerToken = await getToken(managerEmail!, managerPassword!);
    const response = await apiRequest('/manager/capacity', managerToken);
    expect(response.ok).toBe(true);

    const rows = (await response.json()) as Array<{
      agentId: number;
      agentName: string;
      maxTicketLimit: number;
      activeTicketCount: number;
    }>;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].agentName).toBeTruthy();
    expect(typeof rows[0].maxTicketLimit).toBe('number');
    expect(typeof rows[0].activeTicketCount).toBe('number');
  });

  test('TC-MGR-007 · update agent ticket limit', async () => {
    const managerToken = await getToken(managerEmail!, managerPassword!);
    const agentToken = await getToken(agentEmail, agentPassword);
    const agent = await getMe(agentToken);

    const capacities = await getManagerCapacities(managerToken);
    const current = capacities.find((c) => c.agentId === agent.id);
    restoredAgentLimit = { agentId: agent.id, limit: current?.maxTicketLimit ?? 5 };
    const newLimit = Math.max((current?.activeTicketCount ?? 0) + 5, 10);

    const response = await apiRequest(`/manager/agents/${agent.id}/limit`, managerToken, {
      method: 'PUT',
      body: JSON.stringify({ maxTicketLimit: newLimit }),
    });
    expect(response.ok).toBe(true);
    const updated = (await response.json()) as { maxTicketLimit: number };
    expect(updated.maxTicketLimit).toBe(newLimit);
  });

  test('TC-MGR-008 · invalid agent limit rejected', async () => {
    const managerToken = await getToken(managerEmail!, managerPassword!);
    const agentToken = await getToken(agentEmail, agentPassword);
    const agent = await getMe(agentToken);

    const response = await apiRequest(`/manager/agents/${agent.id}/limit`, managerToken, {
      method: 'PUT',
      body: JSON.stringify({ maxTicketLimit: 0 }),
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as { message?: string };
    expect(body.message).toMatch(/en az 1/i);
  });

  test('TC-MGR-009 · transfer-all moves active tickets', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const agent2Token = await getToken(agent2Email, agent2Password);
    const managerToken = await getToken(managerEmail!, managerPassword!);
    const agent1 = await getMe(agentToken);
    const agent2 = await getMe(agent2Token);

    await ensureAgentHeadroom(managerToken, agent1.id, 3);
    await ensureAgentHeadroom(managerToken, agent2.id, 5);

    const ids: number[] = [];
    for (let i = 0; i < 2; i++) {
      const ticket = await createTicket(customerToken, `MGR-009-${i}-${Date.now()}`);
      track(ticket.id);
      ids.push(ticket.id);
      await assignTicket(managerToken, ticket.id, agent1.id);
      await waitForTicketStatus(managerToken, ticket.id, 'IN_PROGRESS');
    }

    const capacitiesAfterAssign = await getManagerCapacities(managerToken);
    const agent1Load = capacitiesAfterAssign.find((c) => c.agentId === agent1.id);
    const agent2Load = capacitiesAfterAssign.find((c) => c.agentId === agent2.id);
    const fromActive = agent1Load?.activeTicketCount ?? ids.length;
    const toActive = agent2Load?.activeTicketCount ?? 0;
    await updateAgentLimit(managerToken, agent2.id, toActive + fromActive);

    const response = await apiRequest('/manager/transfer-all', managerToken, {
      method: 'POST',
      body: JSON.stringify({ fromAgentId: agent1.id, toAgentId: agent2.id }),
    });
    expect(response.ok).toBe(true);
    const body = (await response.json()) as { transferredCount: number };
    expect(body.transferredCount).toBeGreaterThanOrEqual(2);

    for (const id of ids) {
      const row = await getTicket(agent2Token, id);
      expect(row.assigneeId).toBe(agent2.id);
    }
  });

  test('TC-MGR-010 · transfer-all fails when target at capacity', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const agent2Token = await getToken(agent2Email, agent2Password);
    const managerToken = await getToken(managerEmail!, managerPassword!);
    const agent1 = await getMe(agentToken);
    const agent2 = await getMe(agent2Token);

    await ensureAgentHeadroom(managerToken, agent1.id, 3);

    const capacities = await getManagerCapacities(managerToken);
    const agent2Cap = capacities.find((c) => c.agentId === agent2.id);
    const activeCount = agent2Cap?.activeTicketCount ?? 0;
    const previousAgent2Limit = agent2Cap?.maxTicketLimit ?? 27;

    try {
      await updateAgentLimit(managerToken, agent2.id, Math.max(activeCount, 1));

      const ids: number[] = [];
      for (let i = 0; i < 2; i++) {
        const ticket = await createTicket(customerToken, `MGR-010-${i}-${Date.now()}`);
        track(ticket.id);
        ids.push(ticket.id);
        await assignTicket(managerToken, ticket.id, agent1.id);
        await waitForTicketStatus(managerToken, ticket.id, 'IN_PROGRESS');
      }

      const response = await apiRequest('/manager/transfer-all', managerToken, {
        method: 'POST',
        body: JSON.stringify({ fromAgentId: agent1.id, toAgentId: agent2.id }),
      });
      expect(response.status).toBe(400);
      const body = (await response.json()) as { message?: string };
      expect(body.message).toMatch(/limit/i);
      void ids;
    } finally {
      await updateAgentLimit(managerToken, agent2.id, previousAgent2Limit);
    }
  });

  test('TC-MGR-011 · transfer-all rejects same source and target', async () => {
    const managerToken = await getToken(managerEmail!, managerPassword!);
    const agentToken = await getToken(agentEmail, agentPassword);
    const agent = await getMe(agentToken);

    const response = await apiRequest('/manager/transfer-all', managerToken, {
      method: 'POST',
      body: JSON.stringify({ fromAgentId: agent.id, toAgentId: agent.id }),
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as { message?: string };
    expect(body.message).toMatch(/ayni olamaz/i);
  });

  test('TC-MGR-012 · CSV report export', async () => {
    const managerToken = await getToken(managerEmail!, managerPassword!);
    const response = await apiRequest(
      '/manager/reports/export?startDate=2026-01-01&endDate=2026-12-31',
      managerToken,
    );
    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toMatch(/text\/csv/i);

    const csv = await response.text();
    expect(csv).toContain('Destrova ITSM Performance Report');
    expect(csv).toContain('Summary');
    expect(csv).toContain('SLA Compliance');
  });

  test('TC-MGR-013 · duplicate force-close returns conflict', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const managerToken = await getToken(managerEmail!, managerPassword!);

    const ticket = await createTicket(customerToken, `MGR-013 ${Date.now()}`);
    const first = await postTicketAction(managerToken, ticket.id, 'close', {
      closureReason: 'INVALID',
    });
    expect(first.status).toBe(202);
    await waitForTicketStatus(managerToken, ticket.id, 'CLOSED');

    const second = await postTicketAction(managerToken, ticket.id, 'close', {
      closureReason: 'INVALID',
    });
    expect(second.status).toBe(409);
  });
});
