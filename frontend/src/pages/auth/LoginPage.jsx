import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SessionLoadingScreen from "../../components/shared/SessionLoadingScreen";
import { useKeycloak } from "../../context/KeycloakContext";

const logoSrc = "/Destrova_logo.png";

function LoginPage() {
  const { authenticated, loading, login, hasRole } = useKeycloak();
  const navigate = useNavigate();

  useEffect(() => {
    if (authenticated) {
      if (hasRole("ADMIN")) navigate("/admin/overview", { replace: true });
      else if (hasRole("MANAGER")) navigate("/manager/dashboard", { replace: true });
      else if (hasRole("AGENT")) navigate("/agent/inbox", { replace: true });
      else navigate("/customer/tickets", { replace: true });
    }
  }, [authenticated, hasRole, navigate]);

  if (loading) {
    return <SessionLoadingScreen />;
  }

  return (
    <div className="min-h-screen w-full flex">

      {/* SOL PANEL — büyük ekranda görünür, mobilde gizli */}
      <div className="hidden lg:flex lg:w-[52%] bg-gradient-to-br from-[#0F0E47] to-[#1a1960] flex-col justify-between px-14 py-12">

        <div>
          {/* Logo */}
          <div className="flex items-center mb-16">
            <img
              src={logoSrc}
              alt="Destrova"
              className="h-12 w-auto max-w-[220px] object-contain"
            />
          </div>

          {/* Başlık */}
          <h1 className="text-white text-[2.4rem] font-extrabold leading-[1.12] mb-4 max-w-md">
            IT Service Management,<br />Redefined.
          </h1>
          <p className="text-white/60 text-base leading-relaxed mb-12 max-w-sm">
            SLA-driven ticketing with intelligent routing,
            real-time monitoring and enterprise-grade access control.
          </p>

          {/* Özellik listesi */}
          <ul className="space-y-5">
            {[
              {
                icon: "⚡",
                label: "Streamlined Support",
                sub: "Fast, SLA-backed resolutions to keep your work moving.",
              },
              {
                icon: "🎯",
                label: "Intelligent Routing",
                sub: "Automatically connecting your requests with the right experts.",
              },
              {
                icon: "🔄",
                label: "Complete Transparency",
                sub: "Full visibility from your initial request to final resolution.",
              },
            ].map((f) => (
              <li key={f.label} className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-base">
                  {f.icon}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold leading-snug">{f.label}</p>
                  <p className="text-white/50 text-xs leading-relaxed mt-0.5">{f.sub}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Alt güvenlik notu */}
        <div className="flex items-center gap-2 mt-12">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4 text-white/30 shrink-0"
          >
            <path
              fillRule="evenodd"
              d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-white/30 text-[11px] tracking-wide">
            Enterprise SSO · PKCE S256 · OAuth 2.0 / OIDC
          </span>
        </div>
      </div>

      {/* SAĞ PANEL — login action */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-[400px]">

          {/* Mobil logo (sadece lg altında görünür) */}
          <div className="flex lg:hidden items-center mb-10 justify-center">
            <img
              src={logoSrc}
              alt="Destrova"
              className="h-11 w-auto max-w-[190px] object-contain"
            />
          </div>

          {/* Başlık */}
          <div className="mb-8">
            <h2 className="text-slate-900 text-2xl font-bold mb-1">
              Welcome back
            </h2>
            <p className="text-slate-500 text-sm">
              Sign in to your account to continue.
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] text-slate-400 font-semibold tracking-widest uppercase">
              SECURE SIGN-IN
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Keycloak Login Butonu */}
          <button
            type="button"
            onClick={login}
            className="w-full flex items-center justify-center gap-3 h-12 rounded-xl bg-[#0F0E47] text-white text-[15px] font-semibold shadow-[0_4px_14px_rgba(15,14,71,0.35)] transition-all duration-200 hover:bg-[#1a1960] hover:shadow-[0_6px_20px_rgba(15,14,71,0.45)] active:scale-[0.98]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 fill-current opacity-80"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            </svg>
            Continue to Destrova
          </button>

          <p className="mt-3 text-center text-[11px] text-slate-400 leading-relaxed">
            You'll be redirected to your organization's secure sign-in page.
          </p>

          {/* Footer */}
          <p className="mt-10 text-center text-[10px] text-slate-300">
            © {new Date().getFullYear()} Destrova ITSM. All rights reserved.
          </p>
        </div>
      </div>

    </div>
  );
}

export default LoginPage;
