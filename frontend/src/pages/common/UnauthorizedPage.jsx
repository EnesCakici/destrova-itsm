import { useKeycloak } from "../../context/KeycloakContext";
import { Link } from "react-router-dom";

function UnauthorizedPage() {
  const { hasRole, logout } = useKeycloak(); // logout fonksiyonunu da alıyoruz
  
  const getHomePath = () => {
    if (hasRole("ADMIN")) return "/admin/overview";
    if (hasRole("MANAGER")) return "/manager/dashboard";
    if (hasRole("AGENT")) return "/agent/inbox";
    if (hasRole("CUSTOMER")) return "/customer/tickets";
    return null; // Hiçbir rol yoksa null dön
  };

  const homePath = getHomePath();

  return (
    <div className="center-auth">
      <section className="card auth-card text-center">
        <div className="error-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
        <h2>Yetkisiz Erişim</h2>
        <p className="mb-6">Bu sayfayı görüntülemek için gerekli yetkiye sahip değilsiniz. Lütfen yöneticinizle iletişime geçin.</p>
        
        <div className="flex flex-col gap-3">
          {homePath ? (
            <Link to={homePath} className="btn btn-primary w-full">
              Kendi Panelime Dön
            </Link>
          ) : (
            <p className="text-red-500 font-semibold mb-2">Henüz bir rolünüz tanımlanmamış.</p>
          )}
          
          <button onClick={() => logout()} className="btn btn-secondary w-full">
            Farklı Hesapla Giriş Yap (Çıkış)
          </button>
        </div>
      </section>
    </div>
  );
}

export default UnauthorizedPage;