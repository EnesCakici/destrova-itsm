import dotenv from 'dotenv';
import path from 'path';
import { expect, test } from '@playwright/test';
import {
  addWorklog,
  apiRequest,
  assignToMe,
  assignTicket,
  createTicket,
  deleteTicketAsManager,
  getMe,
  getToken,
  postComment,
  postTicketAction,
  resolveTicket,
  waitForTicketStatus,
} from './helpers/api';
import { setTicketClosedForReports } from './helpers/db';
import { postSlaUpdatedWebhook } from './helpers/webhook';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const customerEmail = process.env.CUSTOMER_EMAIL!;
const customerPassword = process.env.CUSTOMER_PASSWORD!;
const agentEmail = process.env.AGENT_EMAIL!;
const agentPassword = process.env.AGENT_PASSWORD!;
const managerEmail = process.env.MANAGER_EMAIL;
const managerPassword = process.env.MANAGER_PASSWORD;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

const createdTicketIds: number[] = [];
const createdProductIds: number[] = [];
let isolatedReportWindow = '2030-06-15';

function reportWindowForStamp(stamp: number): string {
  const month = String((Math.floor(stamp / 1000) % 11) + 1).padStart(2, '0');
  const day = String((stamp % 27) + 1).padStart(2, '0');
  return `2032-${month}-${day}`;
}

test.beforeAll(() => {
  if (!managerEmail || !managerPassword) {
    throw new Error('Missing MANAGER_* credentials in .env.test');
  }
  if (!customerEmail || !agentEmail) {
    throw new Error('Missing CUSTOMER_* or AGENT_* in .env.test');
  }
});

test.afterAll(async () => {
  const managerToken = await getToken(managerEmail!, managerPassword!);
  for (const id of createdTicketIds) {
    await deleteTicketAsManager(managerToken, id);
  }
});

function trackTicket(id: number) {
  createdTicketIds.push(id);
}

function trackProduct(id: number) {
  createdProductIds.push(id);
}

test.describe.configure({ mode: 'serial' });

type ReportsDto = {
  totalCreated: number;
  totalResolved: number;
  avgResolutionHours: number;
  slaCompliancePercent: number;
  volumeSeries: Array<{ label?: string; opened?: number; closed?: number }>;
  products: unknown[];
  agents: unknown[];
  resolutionTrend: unknown[];
};

async function fetchReports(
  managerToken: string,
  query = '',
): Promise<ReportsDto> {
  const response = await apiRequest(`/manager/reports${query}`, managerToken);
  expect(response.ok).toBe(true);
  return (await response.json()) as ReportsDto;
}

async function closeTicketViaWorkflow(
  customerToken: string,
  agentToken: string,
  ticketId: number,
  options: { breachBeforeClose?: boolean } = {},
) {
  await assignToMe(agentToken, ticketId);
  await waitForTicketStatus(agentToken, ticketId, 'IN_PROGRESS');
  if (options.breachBeforeClose) {
    expect(
      (
        await postSlaUpdatedWebhook(ticketId, {
          slaDueDate: new Date(Date.now() - 60_000).toISOString(),
        })
      ).ok,
    ).toBe(true);
  }
  await resolveTicket(agentToken, ticketId, 'Reports SLA path verification.');
  await waitForTicketStatus(customerToken, ticketId, 'RESOLVED');
  const approve = await apiRequest(`/tickets/${ticketId}/approve`, customerToken, { method: 'POST' });
  expect(approve.ok).toBe(true);
  await waitForTicketStatus(agentToken, ticketId, 'CLOSED', 45_000);
}

test.describe('P3 Dashboard & Reports', () => {
  test('TC-DASH-001 · reports without date params default to last 30 days', async () => {
    const managerToken = await getToken(managerEmail!, managerPassword!);
    const reports = await fetchReports(managerToken);

    expect(reports.totalCreated).toBeGreaterThanOrEqual(0);
    expect(reports.totalResolved).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(reports.avgResolutionHours)).toBe(true);
    expect(Number.isFinite(reports.slaCompliancePercent)).toBe(true);
    expect(Array.isArray(reports.volumeSeries)).toBe(true);
    expect(Array.isArray(reports.products)).toBe(true);
    expect(Array.isArray(reports.agents)).toBe(true);
    expect(Array.isArray(reports.resolutionTrend)).toBe(true);
  });

  test('TC-DASH-002 · SLA compliance percent is 50 for mixed closed tickets', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const managerToken = await getToken(managerEmail!, managerPassword!);
    const stamp = Date.now();
    isolatedReportWindow = reportWindowForStamp(stamp);

    for (let i = 0; i < 2; i++) {
      const ticket = await createTicket(customerToken, `DASH-SLA-OK-${i}-${stamp}`);
      trackTicket(ticket.id);
      await closeTicketViaWorkflow(customerToken, agentToken, ticket.id);
      setTicketClosedForReports(ticket.id, { compliant: true, windowDate: isolatedReportWindow });
    }

    for (let i = 0; i < 2; i++) {
      const ticket = await createTicket(customerToken, `DASH-SLA-BAD-${i}-${stamp}`);
      trackTicket(ticket.id);
      await closeTicketViaWorkflow(customerToken, agentToken, ticket.id, { breachBeforeClose: true });
      setTicketClosedForReports(ticket.id, { compliant: false, windowDate: isolatedReportWindow });
    }

    const reports = await fetchReports(
      managerToken,
      `?startDate=${isolatedReportWindow}&endDate=${isolatedReportWindow}`,
    );
    expect(reports.totalCreated).toBe(4);
    expect(reports.totalResolved).toBe(4);
    expect(reports.slaCompliancePercent).toBe(50);
  });

  test('TC-DASH-003 · volume series exposes opened vs closed buckets', async () => {
    const managerToken = await getToken(managerEmail!, managerPassword!);
    const reports = await fetchReports(
      managerToken,
      `?startDate=${isolatedReportWindow}&endDate=${isolatedReportWindow}`,
    );

    expect(reports.volumeSeries.length).toBeGreaterThan(0);
    for (const bucket of reports.volumeSeries) {
      expect(typeof bucket.opened).toBe('number');
      expect(typeof bucket.closed).toBe('number');
      expect(bucket.label).toBeTruthy();
    }

    const statusChecks = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
    for (const status of statusChecks) {
      const response = await apiRequest(`/manager/tickets?status=${status}`, managerToken);
      expect(response.ok).toBe(true);
      expect(Array.isArray(await response.json())).toBe(true);
    }
  });

  test('TC-DASH-004 · CSV export headers and comma escaping', async () => {
    test.skip(!adminEmail || !adminPassword, 'ADMIN_* credentials required');

    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const managerToken = await getToken(managerEmail!, managerPassword!);
    const adminToken = await getToken(adminEmail!, adminPassword!);
    const productName = `DASH, CSV "Product" ${Date.now()}`;

    const create = await apiRequest('/admin/products', adminToken, {
      method: 'POST',
      body: JSON.stringify({ name: productName, isActive: true }),
    });
    expect(create.ok).toBe(true);
    const product = (await create.json()) as { id: number };
    trackProduct(product.id);

    const ticket = await createTicket(
      customerToken,
      `DASH-CSV ${Date.now()}`,
      'CSV export row',
      'MEDIUM',
      product.id,
    );
    trackTicket(ticket.id);
    await closeTicketViaWorkflow(customerToken, agentToken, ticket.id);
    setTicketClosedForReports(ticket.id, { compliant: true, windowDate: isolatedReportWindow });

    const response = await apiRequest(
      `/manager/reports/export?startDate=${isolatedReportWindow}&endDate=${isolatedReportWindow}`,
      managerToken,
    );
    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toMatch(/text\/csv/i);

    const csv = await response.text();
    expect(csv).toContain('Destrova ITSM Performance Report');
    expect(csv).toContain('Product,Tickets,Avg Resolution,SLA Met %,Delta %');
    expect(csv).toContain(`"${productName.replace(/"/g, '""')}"`);
  });

  test('TC-DASH-005 · empty date range returns zero metrics', async () => {
    const managerToken = await getToken(managerEmail!, managerPassword!);
    const reports = await fetchReports(
      managerToken,
      '?startDate=2030-01-01&endDate=2030-01-31',
    );

    expect(reports.totalCreated).toBe(0);
    expect(reports.totalResolved).toBe(0);
    expect(reports.avgResolutionHours).toBe(0);
    expect(reports.slaCompliancePercent).toBe(0);
    expect(reports.volumeSeries.every((b) => (b.opened ?? 0) === 0 && (b.closed ?? 0) === 0)).toBe(true);
    expect(reports.products).toEqual([]);
    expect(reports.agents).toEqual([]);
    expect(reports.resolutionTrend.every((p) => (p as { avgHours?: number }).avgHours === 0)).toBe(true);
  });

  test('TC-DASH-006 · agent worklog summary filters by productId', async () => {
    test.skip(!adminEmail || !adminPassword, 'ADMIN_* credentials required');

    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const managerToken = await getToken(managerEmail!, managerPassword!);
    const adminToken = await getToken(adminEmail!, adminPassword!);
    const stamp = Date.now();

    async function createProduct(label: string) {
      const response = await apiRequest('/admin/products', adminToken, {
        method: 'POST',
        body: JSON.stringify({ name: `${label}-${stamp}`, isActive: true }),
      });
      expect(response.ok).toBe(true);
      const row = (await response.json()) as { id: number };
      trackProduct(row.id);
      return row.id;
    }

    const productA = await createProduct('DASH-PROD-A');
    const productB = await createProduct('DASH-PROD-B');

    const ticketA = await createTicket(customerToken, `DASH-WL-A ${stamp}`, 'Worklog A', 'MEDIUM', productA);
    trackTicket(ticketA.id);
    await assignTicket(managerToken, ticketA.id, (await getMe(agentToken)).id);
    await waitForTicketStatus(agentToken, ticketA.id, 'IN_PROGRESS');
    expect((await addWorklog(agentToken, ticketA.id, 15, 'Product A worklog entry.')).status).toBe(201);
    await postComment(agentToken, ticketA.id, 'Product A internal note.', true);

    const ticketB = await createTicket(customerToken, `DASH-WL-B ${stamp}`, 'Worklog B', 'MEDIUM', productB);
    trackTicket(ticketB.id);
    await assignTicket(managerToken, ticketB.id, (await getMe(agentToken)).id);
    await waitForTicketStatus(agentToken, ticketB.id, 'IN_PROGRESS');
    expect((await addWorklog(agentToken, ticketB.id, 30, 'Product B worklog entry.')).status).toBe(201);

    const filtered = await apiRequest(
      `/agent/worklog-summary?period=week&productId=${productA}`,
      agentToken,
    );
    expect(filtered.ok).toBe(true);
    const summary = (await filtered.json()) as {
      totalLoggedMinutes?: number;
      activities?: Array<{ ticketId?: number; productName?: string | null }>;
    };

    expect((summary.totalLoggedMinutes ?? 0)).toBeGreaterThanOrEqual(15);
    expect(summary.activities?.every((a) => a.productName?.includes('DASH-PROD-A'))).toBe(true);
    expect(summary.activities?.some((a) => a.ticketId === ticketB.id)).toBe(false);
  });
});
