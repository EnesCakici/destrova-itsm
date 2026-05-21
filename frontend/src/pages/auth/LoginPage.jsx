import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useKeycloak } from "../../context/KeycloakContext";

function LoginPage() {
  const { authenticated, loading, login, hasRole } = useKeycloak();
  const navigate = useNavigate();

  // Kullanıcı zaten giriş yapmışsa dashboard'a yönlendir
  useEffect(() => {
    if (authenticated) {
      // 🆕 Rolüne göre yönlendir
      if (hasRole("ADMIN")) {
        navigate("/admin/overview", { replace: true });
      } else if (hasRole("MANAGER")) {
        navigate("/manager/dashboard", { replace: true });
      } else if (hasRole("AGENT")) {
        navigate("/agent/inbox", { replace: true });
      } else {
        navigate("/customer/tickets", { replace: true });
      }
    }
  }, [authenticated, hasRole, navigate]);

  // Yükleniyor durumu
  if (loading) {
    return (
      <div className="center-auth">
        <section className="card auth-card">
          <h2>Yükleniyor...</h2>
          <p>Lütfen bekleyiniz.</p>
        </section>
      </div>
    );
  }

  // Giriş yapılmamışsa login butonunu göster
  return (
    <div className="center-auth">
      <section className="card auth-card">
        <h2>ITSM Giriş</h2>
        <p>Sisteme giriş yapmak için aşağıdaki butona tıklayın.</p>
        <button className="btn btn-primary" onClick={login}>
          Keycloak ile Giriş Yap
        </button>
      </section>
    </div>
  );
}

export default LoginPage;