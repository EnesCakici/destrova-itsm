import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import keycloak, { initKeycloakClient, KEYCLOAK_LOGIN_SCOPE } from "../keycloak";
import { getCurrentAppUser } from "../services/api";

const KeycloakContext = createContext();

const devLog = (...args) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

export const KeycloakProvider = ({ children }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  /** Backend app_users.id — ticket creatorId / assigneeId ile eslesir */
  const [appUser, setAppUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initKeycloak = async () => {
      try {
        const auth = await initKeycloakClient();

        devLog("Keycloak initialized, authenticated:", auth);
        setAuthenticated(auth);

        if (auth) {
          try {
            const userInfo = await keycloak.loadUserInfo();
            setUser(userInfo);
            devLog("User info loaded:", userInfo);
          } catch (err) {
            console.error("User info error:", err);
          }
          try {
            const me = await getCurrentAppUser();
            setAppUser(me);
          } catch (err) {
            console.error("App user (/users/me) yuklenemedi:", err);
            setAppUser(null);
          }
        } else {
          setAppUser(null);
        }

        keycloak.onTokenExpired = () => {
          keycloak
            .updateToken(30)
            .then((refreshed) => {
              if (refreshed) devLog("Token yenilendi");
            })
            .catch(() => {
              devLog("Token yenilenemedi, çıkış yapılıyor");
              keycloak.logout();
            });
        };
      } catch (err) {
        console.error("Keycloak init error:", err);
      } finally {
        setLoading(false);
        setInitialized(true);
        devLog("Keycloak setup complete");
      }
    };

    initKeycloak();
  }, []);

  const login = useCallback(() => {
    devLog("Login called");
    keycloak.login({ scope: KEYCLOAK_LOGIN_SCOPE });
  }, []);

  const logout = useCallback(() => {
    devLog("Logout called");
    setAppUser(null);
    keycloak.logout({ redirectUri: window.location.origin + "/login" });
  }, []);

  const getToken = useCallback(() => keycloak.token || null, []);

  const hasRole = useCallback((role) => {
    const result = keycloak.hasRealmRole?.(role) || false;
    devLog(`hasRole(${role}):`, result);
    return result;
  }, []);

  const value = useMemo(
    () => ({
      authenticated,
      user,
      appUser,
      loading,
      initialized,
      login,
      logout,
      getToken,
      hasRole,
      keycloak,
    }),
    [
      authenticated,
      user,
      appUser,
      loading,
      initialized,
      login,
      logout,
      getToken,
      hasRole,
    ]
  );

  return (
    <KeycloakContext.Provider value={value}>
      {children}
    </KeycloakContext.Provider>
  );
};

export const useKeycloak = () => {
  const context = useContext(KeycloakContext);
  if (!context) {
    throw new Error("useKeycloak must be used within KeycloakProvider");
  }
  return context;
};
