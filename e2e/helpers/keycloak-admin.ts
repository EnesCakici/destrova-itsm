const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? 'http://localhost:8081';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM ?? 'ticket-realm';

export async function fetchKeycloakAdminToken(): Promise<string> {
  const response = await fetch(`${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: process.env.KEYCLOAK_ADMIN_USER ?? 'admin',
      password: process.env.KEYCLOAK_ADMIN_PASSWORD ?? 'admin',
    }),
  });

  if (!response.ok) {
    throw new Error(`Keycloak admin token failed: ${response.status}`);
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error('Keycloak admin token missing in response');
  }
  return payload.access_token;
}

export async function logoutKeycloakUserSessions(email: string): Promise<void> {
  const adminToken = await fetchKeycloakAdminToken();
  const headers = { Authorization: `Bearer ${adminToken}` };

  const search = await fetch(
    `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users?email=${encodeURIComponent(email)}&exact=true`,
    { headers },
  );
  if (!search.ok) {
    throw new Error(`Keycloak user lookup failed: ${search.status}`);
  }

  const users = (await search.json()) as Array<{ id: string }>;
  if (users.length === 0) {
    throw new Error(`Keycloak user not found: ${email}`);
  }

  const logout = await fetch(
    `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${users[0].id}/logout`,
    { method: 'POST', headers },
  );
  if (!logout.ok) {
    throw new Error(`Keycloak user logout failed: ${logout.status}`);
  }
}
