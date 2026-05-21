import Keycloak from 'keycloak-js';

// Keycloak konfigürasyonu
const keycloakConfig = {
  url: 'http://localhost:8081',      // Keycloak sunucu adresi
  realm: 'ticket-realm',             // Realm adın
  clientId: 'ticket-frontend',       // Frontend client ID'n
};

const keycloak = new Keycloak(keycloakConfig);

/** Scopes so the access token includes standard profile + email claims (backend JIT needs `email`). */
export const KEYCLOAK_LOGIN_SCOPE = "openid profile email";

/** Cached promise — Keycloak throws if .init() is called twice on the same instance (e.g. React Strict Mode). */
let initPromise = null;

/**
 * Initializes the singleton once; subsequent calls return the same promise.
 */
export function initKeycloakClient() {
  if (!initPromise) {
    initPromise = keycloak.init({
      onLoad: "check-sso",
      silentCheckSsoRedirectUri:
        window.location.origin + "/silent-check-sso.html",
      pkceMethod: "S256",
      scope: KEYCLOAK_LOGIN_SCOPE,
    });
  }
  return initPromise;
}

export default keycloak;