import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import LanguageSwitcher from "../../components/destrova/shared/LanguageSwitcher";
import SessionLoadingScreen from "../../components/shared/SessionLoadingScreen";
import { useKeycloak } from "../../context/KeycloakContext";

const logoSrc = "/Destrova_logo.png";

const FEATURE_KEYS = ["streamlined", "routing", "transparency"];

const FEATURE_ICONS = [
  (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden>
      <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="8" cy="7" r="2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="11" cy="17" r="2" fill="currentColor" stroke="none" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden>
      <circle cx="12" cy="12" r="8.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5v5l3 2" />
    </svg>
  ),
];

function LoginPage() {
  const { t } = useTranslation("auth");
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

      {/* Sol panel — orijinal koyu mor */}
      <div className="hidden lg:flex lg:w-[52%] flex-col bg-gradient-to-br from-[#0F0E47] to-[#1a1960] px-14 py-12">

        <div>
          <div className="flex items-center mb-16">
            <img
              src={logoSrc}
              alt="Destrova"
              className="h-12 w-auto max-w-[220px] object-contain"
            />
          </div>

          <h1 className="max-w-md text-[2.35rem] font-bold leading-[1.14] tracking-tight text-white mb-4">
            {t("login.headline")}
          </h1>
          <p className="mb-12 max-w-md text-[15px] leading-relaxed text-slate-300">
            {t("login.subline")}
          </p>

          <ul className="space-y-6">
            {FEATURE_KEYS.map((key, index) => (
              <li key={key}>
                <div className="flex items-center gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-slate-200 ring-1 ring-white/[0.08]">
                    {FEATURE_ICONS[index]}
                  </div>
                  <p className="min-w-0 text-sm font-semibold leading-snug text-white">
                    {t(`login.features.${key}.label`)}
                  </p>
                </div>
                <p className="mt-1.5 pl-[3.25rem] text-xs leading-relaxed text-slate-400">
                  {t(`login.features.${key}.sub`)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sağ panel */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-[400px]">

          <div className="flex lg:hidden items-center mb-10 justify-center">
            <img
              src={logoSrc}
              alt="Destrova"
              className="h-11 w-auto max-w-[190px] object-contain"
            />
          </div>

          <div className="mb-8">
            <h2 className="text-slate-900 text-2xl font-bold mb-1">
              {t("login.welcome")}
            </h2>
            <p className="text-slate-500 text-sm">
              {t("login.welcomeSub")}
            </p>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] text-slate-400 font-semibold tracking-widest uppercase">
              {t("login.secureSignIn")}
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

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
            {t("login.cta")}
          </button>

          <p className="mt-3 text-center text-[11px] text-slate-400 leading-relaxed">
            {t("login.redirect")}
          </p>

          <div className="flex justify-center mt-10 mb-2">
            <LanguageSwitcher variant="login" />
          </div>

          <p className="text-center text-[10px] text-slate-300">
            {t("login.copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>

    </div>
  );
}

export default LoginPage;
