import axios from "axios";
import keycloak from "../../../../keycloak";

async function attachFreshToken(config) {
  if (keycloak.authenticated) {
    try {
      await keycloak.updateToken(30);
    } catch {
      // Token refresh failed; request may proceed without a fresh token.
    }
  }
  const token = keycloak.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}

/** Destrova API client — base `http://localhost:8080/api` */
const httpClient = axios.create({
  baseURL: "http://localhost:8080/api",
});

httpClient.interceptors.request.use(attachFreshToken, (error) => Promise.reject(error));

/**
 * @param {unknown} error
 * @param {string} [fallback]
 * @returns {string}
 */
export function getDestrovaApiErrorMessage(error, fallback = "Request failed.") {
  const data = error?.response?.data;
  if (typeof data === "string" && data.trim()) return data.trim();
  if (data && typeof data === "object" && typeof data.message === "string" && data.message.trim()) {
    return data.message.trim();
  }
  if (error?.message && String(error.message).trim()) {
    return String(error.message).trim();
  }
  return fallback;
}

export default httpClient;
