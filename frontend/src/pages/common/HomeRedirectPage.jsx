import { Navigate } from "react-router-dom";
import { useKeycloak } from "../../context/KeycloakContext";

function HomeRedirectPage() {
  const { authenticated, hasRole } = useKeycloak();

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (hasRole("ADMIN")) {
    return <Navigate to="/admin/overview" replace />;
  }
  if (hasRole("MANAGER")) {
    return <Navigate to="/manager/dashboard" replace />;
  }
  if (hasRole("AGENT")) {
    return <Navigate to="/agent/inbox" replace />;
  }
  if (hasRole("CUSTOMER")) {
    return <Navigate to="/customer/tickets" replace />;
  }

  return <Navigate to="/login" replace />;
}

export default HomeRedirectPage;
