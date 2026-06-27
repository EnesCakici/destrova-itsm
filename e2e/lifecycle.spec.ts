import dotenv from 'dotenv';
import path from 'path';
import { expect, test, type Page } from '@playwright/test';
import { fetchKeycloakToken, loginAs, logout } from './helpers/auth';
import { closeTicketForCleanup } from './helpers/api';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const customerEmail = process.env.CUSTOMER_EMAIL;
const customerPassword = process.env.CUSTOMER_PASSWORD;
const agentEmail = process.env.AGENT_EMAIL;
const agentPassword = process.env.AGENT_PASSWORD;
const managerEmail = process.env.MANAGER_EMAIL;
const managerPassword = process.env.MANAGER_PASSWORD;

const DESCRIPTION_EDITOR_TEST_ID = 'ticket-description-editor';
const COMMENT_EDITOR_TEST_ID = 'ticket-comment-editor';

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
  if (!customerEmail || !customerPassword || !agentEmail || !agentPassword) {
    throw new Error(
      'Missing required env vars: CUSTOMER_EMAIL, CUSTOMER_PASSWORD, AGENT_EMAIL, AGENT_PASSWORD (.env.test)',
    );
  }
});

function ticketApiPath(ticketId: number, suffix: string) {
  return `/api/tickets/${ticketId}${suffix}`;
}

function waitForTicketAction(page: Page, ticketId: number, action: string) {
  return page.waitForResponse(
    (res) => res.url().includes(ticketApiPath(ticketId, `/actions/${action}`)) && res.status() === 202,
    { timeout: 30_000 },
  );
}

async function fillRichText(page: Page, testId: string, text: string) {
  const editor = page.getByTestId(testId);
  await editor.click();
  await editor.fill(text);
}

async function expectAgentStatus(page: Page, label: string) {
  await expect(page.getByTestId('agent-ticket-status')).toHaveText(label, { timeout: 30_000 });
}

async function expectCustomerStatus(page: Page, label: string) {
  await expect(page.getByTestId('customer-ticket-status')).toHaveText(label, { timeout: 30_000 });
}

async function openAgentTicketByTitle(
  page: Page,
  title: string,
  queue: 'unassigned' | 'assigned',
) {
  await page.goto('/agent/inbox');
  await page
    .getByRole('button', { name: queue === 'assigned' ? 'Assigned to me' : 'Unassigned', exact: true })
    .click();
  await page.getByRole('searchbox', { name: 'Search inbox tickets' }).fill(title);
  const ticketRow = page.getByTestId('ticket-list-item').filter({ hasText: title });
  await expect(ticketRow).toHaveCount(1, { timeout: 30_000 });
  await ticketRow.click();
}

async function openCustomerTicket(page: Page, ticketId: number) {
  await page.goto(`/customer/tickets/${ticketId}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });
}

async function changeAgentStatus(
  page: Page,
  ticketId: number,
  statusLabel: string,
  options?: { resolutionNote?: string; action?: string },
) {
  const responsePromise = options?.action
    ? waitForTicketAction(page, ticketId, options.action)
    : null;

  await page.getByLabel('Change ticket status').selectOption({ label: statusLabel });

  if (options?.resolutionNote) {
    await page.getByLabel(/Solution summary/i).fill(options.resolutionNote);
  }

  const confirmButton = page.getByRole('button', { name: 'Confirm changes' });
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();

  if (responsePromise) {
    await responsePromise;
  }
}

/**
 * Best-effort teardown after P0 lifecycle.
 * Ticket is already CLOSED at end of happy path; force-close is idempotent.
 */
async function cleanupTicket(ticketId: number) {
  if (!managerEmail || !managerPassword) {
    return;
  }

  const token = await fetchKeycloakToken(managerEmail, managerPassword);
  if (!token) {
    console.warn(`[E2E cleanup] Ticket #${ticketId}: Keycloak token unavailable`);
    return;
  }

  await closeTicketForCleanup(token, ticketId);
}

test('P0 lifecycle happy path', async ({ page }) => {
  const ticketTitle = `E2E Lifecycle ${Date.now()}`;
  const ticketDescription = 'Automated Playwright lifecycle test — initial customer request.';
  const customerComment = 'Thanks for the update. Here is the additional information you requested.';
  const resolutionNote = 'VPN profile reset and connection verified successfully.';
  let ticketId: number | undefined;

  try {
    // 1–3. Customer creates a HIGH priority ticket
    await loginAs(page, customerEmail!, customerPassword!);
    await page.goto('/customer/new');

    await page
      .getByPlaceholder('e.g. Unable to access the billing portal')
      .fill(ticketTitle);
    await fillRichText(page, DESCRIPTION_EDITOR_TEST_ID, ticketDescription);
    await page.getByRole('radio', { name: 'High' }).click();

    const createResponsePromise = page.waitForResponse(
      (res) => res.request().method() === 'POST' && /\/api\/tickets\/?$/.test(res.url()) && res.status() === 201,
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: 'Submit request' }).click();
    const createResponse = await createResponsePromise;
    const createdTicket = (await createResponse.json()) as { id: number };
    ticketId = createdTicket.id;

    await expect(page).toHaveURL(/\/customer\/tickets/);
    await expect(page.getByRole('heading', { name: 'Your support requests' })).toBeVisible();

    await logout(page);

    // 4–7. Agent assigns and waits for customer
    await loginAs(page, agentEmail!, agentPassword!);
    await openAgentTicketByTitle(page, ticketTitle, 'unassigned');

    const assignResponsePromise = waitForTicketAction(page, ticketId, 'assign');
    await page.getByTestId('assign-to-me').click();
    await assignResponsePromise;
    await expectAgentStatus(page, 'In Progress');

    await openAgentTicketByTitle(page, ticketTitle, 'assigned');

    await changeAgentStatus(page, ticketId, 'Awaiting Response', {
      action: 'wait-for-customer',
    });
    await expectAgentStatus(page, 'Awaiting Response');

    await logout(page);

    // 8–10. Customer replies; ticket returns to IN_PROGRESS
    await loginAs(page, customerEmail!, customerPassword!);
    await openCustomerTicket(page, ticketId!);
    await expectCustomerStatus(page, 'Awaiting your response');

    const commentResponsePromise = page.waitForResponse(
      (res) =>
        res.request().method() === 'POST' &&
        res.url().includes(ticketApiPath(ticketId!, '/comments')) &&
        res.status() === 201,
      { timeout: 30_000 },
    );
    await fillRichText(page, COMMENT_EDITOR_TEST_ID, customerComment);
    await page.getByRole('button', { name: 'Send reply' }).click();
    await commentResponsePromise;
    await expect(page.getByText('Your reply was sent.')).toBeVisible({ timeout: 30_000 });
    await expectCustomerStatus(page, 'Our team is reviewing');

    await logout(page);

    // 11–13. Agent resolves the ticket
    await loginAs(page, agentEmail!, agentPassword!);
    await openAgentTicketByTitle(page, ticketTitle, 'assigned');

    await changeAgentStatus(page, ticketId!, 'Resolved', {
      resolutionNote,
      action: 'resolve',
    });
    await expectAgentStatus(page, 'Resolved');

    await logout(page);

    // 14–16. Customer accepts the solution
    await loginAs(page, customerEmail!, customerPassword!);
    await openCustomerTicket(page, ticketId!);
    await expectCustomerStatus(page, 'Solution provided');

    const approveResponsePromise = waitForTicketAction(page, ticketId!, 'approve');
    await page.getByTestId('accept-solution').click();
    await approveResponsePromise;
    await expect(page.getByText('Thanks — this request is now closed.')).toBeVisible({ timeout: 30_000 });
    await expectCustomerStatus(page, 'Closed');
  } finally {
    if (ticketId != null) {
      await cleanupTicket(ticketId);
    }
  }
});
