import { Navigate, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SessionLoadingScreen from "../components/shared/SessionLoadingScreen";
import { useKeycloak } from "../context/KeycloakContext";

function RoleGuard({ allowedRoles }) {
  const { t } = useTranslation("common");
  const { authenticated, loading, initialized, hasRole } = useKeycloak();

  if (loading || !initialized) {
    return <SessionLoadingScreen message={t("session.verifyingAccess")} />;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  const hasPermission = allowedRoles.some((role) => hasRole(role));

  if (!hasPermission) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

export default RoleGuard;
