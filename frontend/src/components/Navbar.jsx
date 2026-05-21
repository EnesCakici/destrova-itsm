import { Link, NavLink } from "react-router-dom";
import { useKeycloak } from "../context/KeycloakContext";

function Navbar() {
  const { authenticated, user, hasRole, logout } = useKeycloak();

  // Kullanıcının rolüne göre ana sayfa belirle
  const getHomePath = () => {
    if (hasRole("ADMIN")) return "/admin/overview";
    if (hasRole("MANAGER")) return "/manager/dashboard";
    if (hasRole("AGENT")) return "/agent/inbox";
    return "/customer/tickets";
  };

  // Kullanıcının göreceği ana menü
  const getPrimaryNavPath = () => {
    if (hasRole("AGENT")) return "/agent/inbox";
    return `${getRolePrefix()}/tickets`;
  };

  const getPrimaryNavLabel = () => {
    if (hasRole("CUSTOMER")) return "Taleplerim";
    return "Talepler";
  };

  const getRolePrefix = () => {
    if (hasRole("ADMIN") || hasRole("MANAGER")) return "/manager";
    if (hasRole("AGENT")) return "/agent";
    return "/customer";
  };

  // Kullanıcı adını göster (Keycloak'tan gelen)
  const getUserName = () => {
    if (!user) return "";
    return user.name || user.preferred_username || user.email || "Kullanıcı";
  };

  // Eğer kullanıcı giriş yapmamışsa navbar'ı gösterme
  if (!authenticated) {
    return null;
  }

  return (
    <header className="global-navbar">
      <div className="global-navbar-inner">
        <div className="navbar-left">
          <Link to={getHomePath()} className="brand-wrap">
            <span className="brand-title">
              <strong>ITSM</strong> <span>Ticket Management</span>
            </span>
          </Link>
          <nav className="navbar-links">
            <NavLink
              to={getPrimaryNavPath()}
              className={({ isActive }) => `navbar-link ${isActive ? "active" : ""}`}
            >
              {getPrimaryNavLabel()}
            </NavLink>
            {(hasRole("MANAGER") || hasRole("ADMIN")) && (
              <NavLink
                to="/manager/dashboard"
                className={({ isActive }) => `navbar-link ${isActive ? "active" : ""}`}
              >
                Dashboard
              </NavLink>
            )}
            {hasRole("ADMIN") && (
              <NavLink
                to="/admin/users"
                className={({ isActive }) => `navbar-link ${isActive ? "active" : ""}`}
              >
                Kullanıcılar
              </NavLink>
            )}
          </nav>
        </div>

        <div className="navbar-right">
          {/* Kullanıcı rolünü göster (opsiyonel) */}
          <span className="navbar-role-badge">
            {hasRole("ADMIN") && "Admin"}
            {hasRole("MANAGER") && !hasRole("ADMIN") && "Yönetici"}
            {hasRole("AGENT") && !hasRole("MANAGER") && !hasRole("ADMIN") && "Destek Uzmanı"}
            {hasRole("CUSTOMER") && !hasRole("AGENT") && !hasRole("MANAGER") && !hasRole("ADMIN") && "Müşteri"}
          </span>

          <div className="profile-chip" title={getUserName()}>
            <span className="profile-icon">👤</span>
            <span className="profile-name">{getUserName()}</span>
          </div>

          <button className="btn btn-secondary navbar-logout" onClick={logout}>
            Çıkış Yap
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;