import { useTranslation } from "react-i18next";
import { DestrovaSpinner } from "./DestrovaLoading";

const logoSrc = "/Destrova_logo.png";

/**
 * Full-viewport auth boot splash — Keycloak init, route guards, lazy routes.
 */
export default function SessionLoadingScreen({
  message,
  showLogo = true,
}) {
  const { t } = useTranslation("common");
  const statusLine = message ?? t("session.loading");

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-slate-50"
      style={{
        backgroundImage:
          "radial-gradient(60rem 36rem at 50% -20%, rgba(37,99,235,0.06), transparent 60%)",
      }}
    >
      <div
        className="flex flex-col items-center gap-6 px-6"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={statusLine}
      >
        {showLogo ? (
          <img
            src={logoSrc}
            alt="Destrova"
            className="h-10 w-auto max-w-[200px] object-contain opacity-90"
            draggable={false}
          />
        ) : null}
        <div className="flex flex-col items-center gap-3">
          <DestrovaSpinner size="md" />
          <p className="text-sm font-medium tracking-wide text-slate-500">{statusLine}</p>
        </div>
      </div>
    </div>
  );
}
