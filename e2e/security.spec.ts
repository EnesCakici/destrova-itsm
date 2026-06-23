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
  resolveTicket,
  waitForTicketStatus,
} from './helpers/api';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const customerEmail = process.env.CUSTOMER_EMAIL!;
const customerPassword = process.env.CUSTOMER_PASSWORD!;
const customer2Email = process.env.CUSTOMER2_EMAIL ?? 'customer2@ticket.com';
const customer2Password = process.env.CUSTOMER2_PASSWORD ?? '123456';
const agentEmail = process.env.AGENT_EMAIL!;
const agentPassword = process.env.AGENT_PASSWORD!;
const agent2Email = process.env.AGENT2_EMAIL ?? 'agent2@ticket.com';
const agent2Password = process.env.AGENT2_PASSWORD ?? '123456';
const agent3Email = process.env.AGENT3_EMAIL ?? 'agent3@ticket.com';
const agent3Password = process.env.AGENT3_PASSWORD ?? '123456';
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

function trackTicket(id: number) {
  createdTicketIds.push(id);
}

test.describe.configure({ mode: 'serial' });

test.describe('P0 Security', () => {
  test('TC-SEC-001 · customer cannot PUT another customer ticket', async () => {
    const customer2Token = await getToken(customer2Email, customer2Password);
    const customer1Token = await getToken(customerEmail, customerPassword);

    const ticket = await createTicket(
      customer2Token,
      `SEC-001 ${Date.now()}`,
    );
    trackTicket(ticket.id);

    const response = await apiRequest(`/tickets/${ticket.id}`, customer1Token, {
      method: 'PUT',
      body: JSON.stringify({ description: 'Unauthorized update attempt.' }),
    });
    expect(response.status).toBe(403);
  });

  test('TC-SEC-002 · customer cannot force-close ticket', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `SEC-002 ${Date.now()}`);
    trackTicket(ticket.id);

    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    const response = await apiRequest(`/tickets/${ticket.id}/actions/close`, customerToken, {
      method: 'POST',
      body: JSON.stringify({ closureReason: 'INVALID' }),
    });
    expect(response.status).toBe(403);
  });

  test('TC-SEC-003 · agent cannot resolve ticket assigned to another agent', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agent2Token = await getToken(agent2Email, agent2Password);
    const agent1Token = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `SEC-003 ${Date.now()}`);
    trackTicket(ticket.id);

    await assignToMe(agent2Token, ticket.id);
    await waitForTicketStatus(agent2Token, ticket.id, 'IN_PROGRESS');

    const response = await apiRequest(`/tickets/${ticket.id}/actions/resolve`, agent1Token, {
      method: 'POST',
      body: JSON.stringify({ resolutionNote: 'Unauthorized resolve attempt.' }),
    });
    expect(response.status).toBe(403);
  });

  test('TC-SEC-004 · customer cannot approve another customer ticket', async () => {
    const customer1Token = await getToken(customerEmail, customerPassword);
    const customer2Token = await getToken(customer2Email, customer2Password);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customer1Token, `SEC-004 ${Date.now()}`);
    trackTicket(ticket.id);

    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');
    await resolveTicket(agentToken, ticket.id, 'Prepared solution for SEC-004 test case.');
    await waitForTicketStatus(agentToken, ticket.id, 'RESOLVED');

    const response = await apiRequest(`/tickets/${ticket.id}/actions/approve`, customer2Token, {
      method: 'POST',
    });
    expect(response.status).toBe(403);
  });

  test('TC-SEC-005 · wrong agent cannot approve transfer request', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agent1Token = await getToken(agentEmail, agentPassword);
    const agent2Token = await getToken(agent2Email, agent2Password);
    const agent3Token = await getToken(agent3Email, agent3Password);

    const agent2 = await getMe(agent2Token);

    const ticket = await createTicket(customerToken, `SEC-005 ${Date.now()}`);
    trackTicket(ticket.id);

    await assignToMe(agent1Token, ticket.id);
    await waitForTicketStatus(agent1Token, ticket.id, 'IN_PROGRESS');

    const transferResponse = await apiRequest(`/tickets/${ticket.id}/transfer`, agent1Token, {
      method: 'POST',
      body: JSON.stringify({
        toAgentId: agent2.id,
        transferReason: 'OVERLOAD',
        transferNote: 'Handoff for SEC-005',
      }),
    });
    expect(transferResponse.status).toBe(200);

    const approveResponse = await apiRequest(`/tickets/${ticket.id}/transfer/approve`, agent3Token, {
      method: 'POST',
    });
    expect(approveResponse.status).toBe(403);
  });

  test('TC-SEC-006 · agent cannot wait-for-customer on another agent ticket', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agent2Token = await getToken(agent2Email, agent2Password);
    const agent1Token = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `SEC-006 ${Date.now()}`);
    trackTicket(ticket.id);

    await assignToMe(agent2Token, ticket.id);
    await waitForTicketStatus(agent2Token, ticket.id, 'IN_PROGRESS');

    const response = await apiRequest(`/tickets/${ticket.id}/actions/wait-for-customer`, agent1Token, {
      method: 'POST',
    });
    expect(response.status).toBe(403);
  });
});
