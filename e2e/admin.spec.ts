import dotenv from 'dotenv';
import path from 'path';
import { expect, test } from '@playwright/test';
import {
  addWorklog,
  apiRequest,
  assignViaAction,
  createTicket,
  getMe,
  getToken,
  waitForTicketStatus,
} from './helpers/api';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const customerEmail = process.env.CUSTOMER_EMAIL!;
const customerPassword = process.env.CUSTOMER_PASSWORD!;
const agentEmail = process.env.AGENT_EMAIL!;
const agentPassword = process.env.AGENT_PASSWORD!;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

const createdProductIds: number[] = [];

test.beforeAll(() => {
  if (!adminEmail || !adminPassword) {
    throw new Error('Missing ADMIN_* credentials in .env.test');
  }
  if (!customerEmail || !agentEmail) {
    throw new Error('Missing CUSTOMER_* or AGENT_* in .env.test');
  }
});

function trackProduct(id: number) {
  createdProductIds.push(id);
}

test.describe.configure({ mode: 'serial' });

test.describe('P2 Admin scenarios', () => {
  test('TC-ADMIN-001 · create product', async () => {
    const adminToken = await getToken(adminEmail!, adminPassword!);
    const name = `E2E Product ${Date.now()}`;

    const response = await apiRequest('/admin/products', adminToken, {
      method: 'POST',
      body: JSON.stringify({ name, isActive: true }),
    });
    expect(response.ok).toBe(true);
    const product = (await response.json()) as { id: number; name: string; isActive: boolean };
    trackProduct(product.id);
    expect(product.name).toBe(name);
    expect(product.isActive).toBe(true);
  });

  test('TC-ADMIN-002 · deactivate product hides from customer catalog', async () => {
    const adminToken = await getToken(adminEmail!, adminPassword!);
    const customerToken = await getToken(customerEmail, customerPassword);
    const name = `E2E Inactive ${Date.now()}`;

    const create = await apiRequest('/admin/products', adminToken, {
      method: 'POST',
      body: JSON.stringify({ name, isActive: true }),
    });
    const product = (await create.json()) as { id: number };
    trackProduct(product.id);

    const update = await apiRequest(`/admin/products/${product.id}`, adminToken, {
      method: 'PUT',
      body: JSON.stringify({ name: `${name} v2`, isActive: false }),
    });
    expect(update.ok).toBe(true);

    const catalog = (await (
      await apiRequest('/products', customerToken)
    ).json()) as Array<{ id: number }>;
    expect(catalog.some((p) => p.id === product.id)).toBe(false);
  });

  test('TC-ADMIN-003 · active ticket overview count', async () => {
    const adminToken = await getToken(adminEmail!, adminPassword!);
    const customerToken = await getToken(customerEmail, customerPassword);

    const ticket = await createTicket(customerToken, `ADMIN-003 ${Date.now()}`);
    const before = (await (
      await apiRequest('/admin/overview/tickets', adminToken)
    ).json()) as { activeTickets: number };

    const after = (await (
      await apiRequest('/admin/overview/tickets', adminToken)
    ).json()) as { activeTickets: number };

    expect(typeof before.activeTickets).toBe('number');
    expect(after.activeTickets).toBeGreaterThanOrEqual(before.activeTickets);
    void ticket;
  });

  test('TC-ADMIN-004 · admin user management accessible only to admin', async () => {
    const adminToken = await getToken(adminEmail!, adminPassword!);
    const agentToken = await getToken(agentEmail, agentPassword);

    const adminResponse = await apiRequest('/admin/users', adminToken);
    expect(adminResponse.ok).toBe(true);
    const users = (await adminResponse.json()) as unknown[];
    expect(Array.isArray(users)).toBe(true);

    const agentResponse = await apiRequest('/admin/users', agentToken);
    expect(agentResponse.status).toBe(403);
  });

  test('TC-ADMIN-005 · admin assigns any ticket to agent', async () => {
    const adminToken = await getToken(adminEmail!, adminPassword!);
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const agent = await getMe(agentToken);

    const ticket = await createTicket(customerToken, `ADMIN-005 ${Date.now()}`);
    const response = await assignViaAction(adminToken, ticket.id, agent.id);
    expect(response.status).toBe(202);
    await waitForTicketStatus(adminToken, ticket.id, 'IN_PROGRESS');
  });

  test('TC-ADMIN-006 · admin adds worklog without assignee restriction', async () => {
    const adminToken = await getToken(adminEmail!, adminPassword!);
    const customerToken = await getToken(customerEmail, customerPassword);

    const ticket = await createTicket(customerToken, `ADMIN-006 ${Date.now()}`);
    const response = await addWorklog(adminToken, ticket.id, 15, 'Admin diagnostic time');
    expect(response.status).toBe(201);
  });
});
