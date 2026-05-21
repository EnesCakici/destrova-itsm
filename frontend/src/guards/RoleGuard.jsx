import { Navigate, Outlet } from "react-router-dom";
import { useKeycloak } from "../context/KeycloakContext";

function RoleGuard({ allowedRoles }) {
  const { authenticated, loading, initialized, hasRole } = useKeycloak();

  // Yükleniyorsa bekle
  if (loading || !initialized) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <p>Yetki kontrol ediliyor...</p>
      </div>
    );
  }

  // Giriş yapmamışsa login sayfasına yönlendir
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  // Kullanıcının izin verilen rollerden biri var mı kontrol et
  const hasPermission = allowedRoles.some(role => hasRole(role));

  // Yetkisi yoksa unauthorized sayfasına yönlendir
  if (!hasPermission) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Yetkisi varsa alt route'ları göster
  return <Outlet />;
}

export default RoleGuard;