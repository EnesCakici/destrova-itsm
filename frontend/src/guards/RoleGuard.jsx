import { Navigate, Outlet } from "react-router-dom";
import SessionLoadingScreen from "../components/shared/SessionLoadingScreen";
import { useKeycloak } from "../context/KeycloakContext";

function RoleGuard({ allowedRoles }) {
  const { authenticated, loading, initialized, hasRole } = useKeycloak();

  if (loading || !initialized) {
    return <SessionLoadingScreen message="Verifying your access…" />;
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
