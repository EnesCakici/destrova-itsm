const logoSrc = "/Destrova_logo.png";

/**
 * Full-viewport auth boot splash — Keycloak init, route guards, login redirect.
 * Logo + calm spinner + single status line; no internal debug state.
 */
export default function SessionLoadingScreen({
  message = "Checking your session…",
  showLogo = true,
}) {
  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-slate-50"
      style={{
        backgroundImage:
          "radial-gradient(60rem 36rem at 50% -20%, rgba(37,99,235,0.05), transparent 60%)",
      }}
    >
      <div
        className="flex flex-col items-center gap-5 px-6"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={message}
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
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600"
            aria-hidden
          />
          <p className="text-sm font-medium tracking-wide text-slate-500">{message}</p>
        </div>
      </div>
    </div>
  );
}
