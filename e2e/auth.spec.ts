import dotenv from 'dotenv';
import path from 'path';
import { expect, test } from '@playwright/test';
import { fetchKeycloakToken, loginAs } from './helpers/auth';
import { logoutKeycloakUserSessions } from './helpers/keycloak-admin';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const customerEmail = process.env.CUSTOMER_EMAIL;
const customerPassword = process.env.CUSTOMER_PASSWORD;
const agentEmail = process.env.AGENT_EMAIL;
const agentPassword = process.env.AGENT_PASSWORD;
const apiBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:8080/api';

test.beforeAll(() => {
  if (!customerEmail || !customerPassword || !agentEmail || !agentPassword) {
    throw new Error('Missing CUSTOMER_* or AGENT_* credentials in .env.test');
  }
});

test.describe.configure({ mode: 'serial' });

test.describe('P0 Auth & RBAC', () => {
  test('TC-AUTH-001 · unauthenticated access redirects to login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/customer/tickets');
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  });

  test('TC-AUTH-002 · customer cannot access agent inbox', async ({ page }) => {
    await loginAs(page, customerEmail!, customerPassword!);
    await page.goto('/agent/inbox');
    await expect(page).toHaveURL(/\/unauthorized/);
  });

  test('TC-AUTH-003 · expired bearer token returns 401', async ({ request }) => {
    const response = await request.get(`${apiBaseUrl}/tickets`, {
      headers: { Authorization: 'Bearer expired' },
    });
    expect(response.status()).toBe(401);
  });

  test('TC-AUTH-004 · Keycloak session revoke redirects to login on reload', async ({ page }) => {
    await loginAs(page, agentEmail!, agentPassword!);
    await page.goto('/agent/inbox');
    await expect(page).toHaveURL(/\/agent\/inbox/);

    await logoutKeycloakUserSessions(agentEmail!);
    await page.reload();

    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  });

  test('TC-AUTH-005 · customer cannot access manager reports API', async () => {
    const token = await fetchKeycloakToken(customerEmail!, customerPassword!);
    expect(token).toBeTruthy();

    // Frontend route is /manager/dashboard; protected API is /api/manager/reports.
    const response = await fetch(`${apiBaseUrl}/manager/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(403);
  });

  test('TC-AUTH-006 · agent cannot POST admin products', async () => {
    const token = await fetchKeycloakToken(agentEmail!, agentPassword!);
    expect(token).toBeTruthy();

    const response = await fetch(`${apiBaseUrl}/admin/products`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'E2E Forbidden Product', isActive: true }),
    });
    expect(response.status).toBe(403);
  });
});
