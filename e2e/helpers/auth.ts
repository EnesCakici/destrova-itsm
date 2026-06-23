import { expect, type Page } from '@playwright/test';

const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? 'http://127.0.0.1:8081';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM ?? 'ticket-realm';

function isKeycloakHost(url: URL): boolean {
  return url.port === '8081' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
}

async function submitKeycloakLogin(page: Page, email: string, password: string) {
  await page.waitForURL(
    (url) => isKeycloakHost(url) || url.pathname.includes('/login'),
    { timeout: 30_000 },
  );

  if (isKeycloakHost(new URL(page.url()))) {
    await page.locator('#username, input[name="username"]').first().fill(email);
    await page.locator('#password, input[name="password"]').first().fill(password);
    await page
      .locator('#kc-login, input[type="submit"], button[type="submit"]')
      .first()
      .click();
  }

  await page.waitForURL(
    (url) => !isKeycloakHost(url),
    { timeout: 30_000 },
  );
}

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByRole('button', { name: /Continue to Destrova|Destrova'ya Devam Et/ }).click();
  await submitKeycloakLogin(page, email, password);
  await expect(page).not.toHaveURL(/\/login$/);
}

export async function logout(page: Page) {
  await page.getByTestId('profile-menu-trigger').click();
  await page.getByRole('button', { name: 'Log out' }).click();
  await page.waitForURL(/\/login/, { timeout: 30_000 });
}

export async function fetchKeycloakToken(email: string, password: string): Promise<string | null> {
  const clientId = process.env.KEYCLOAK_CLIENT_ID ?? 'ticket-frontend';
  const tokenUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: clientId,
      username: email,
      password,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { access_token?: string };
  return payload.access_token ?? null;
}
