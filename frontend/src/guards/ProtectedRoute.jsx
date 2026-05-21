import { Navigate, Outlet } from "react-router-dom";
import { useKeycloak } from "../context/KeycloakContext";

function ProtectedRoute() {
  const { authenticated, loading, initialized } = useKeycloak();

  console.log('ProtectedRoute:', { authenticated, loading, initialized });

  if (loading || !initialized) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <p>Yükleniyor... (loading: {String(loading)}, init: {String(initialized)})</p>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;