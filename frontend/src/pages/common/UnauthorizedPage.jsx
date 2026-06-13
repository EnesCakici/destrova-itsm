import { Link } from "react-router-dom";
import { useKeycloak } from "../../context/KeycloakContext";

function UnauthorizedPage() {
  const { hasRole, logout } = useKeycloak();

  const getHomePath = () => {
    if (hasRole("ADMIN")) return "/admin/overview";
    if (hasRole("MANAGER")) return "/manager/dashboard";
    if (hasRole("AGENT")) return "/agent/inbox";
    if (hasRole("CUSTOMER")) return "/customer/tickets";
    return null;
  };

  const homePath = getHomePath();

  return (
    <div className="center-auth">
      <section className="card auth-card text-center">
        <div className="error-icon" style={{ fontSize: "48px", marginBottom: "16px" }}>🚫</div>
        <h2>Unauthorized</h2>
        <p className="mb-6">
          You do not have permission to view this page. Please contact your administrator if you believe this is a mistake.
        </p>

        <div className="flex flex-col gap-3">
          {homePath ? (
            <Link to={homePath} className="btn btn-primary w-full">
              Go to my workspace
            </Link>
          ) : (
            <p className="mb-2 font-semibold text-red-500">No role has been assigned to your account yet.</p>
          )}

          <button type="button" onClick={() => logout()} className="btn btn-secondary w-full">
            Sign in with a different account
          </button>
        </div>
      </section>
    </div>
  );
}

export default UnauthorizedPage;
