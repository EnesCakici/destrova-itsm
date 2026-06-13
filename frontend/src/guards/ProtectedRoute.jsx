import { Navigate, Outlet } from "react-router-dom";
import SessionLoadingScreen from "../components/shared/SessionLoadingScreen";
import { useKeycloak } from "../context/KeycloakContext";

function ProtectedRoute() {
  const { authenticated, loading, initialized } = useKeycloak();

  if (loading || !initialized) {
    return <SessionLoadingScreen />;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
