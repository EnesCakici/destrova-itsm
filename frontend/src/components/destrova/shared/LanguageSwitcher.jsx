import { useTranslation } from "react-i18next";

const SUPPORTED_LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "tr", label: "TR" },
];

function IconGlobe({ className = "h-3.5 w-3.5" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M10 17.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <path
        d="M2.5 10h15M10 2.63c-1.86 1.74-2.79 4.04-2.79 6.87s.93 5.13 2.79 6.87c1.86-1.74 2.79-4.04 2.79-6.87S11.86 4.37 10 2.63Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SegmentedControl({ active, onChange, fullWidth = false, compact = false }) {
  const { t } = useTranslation("common");

  return (
    <div
      className={[
        "inline-flex items-center gap-0.5 rounded-xl p-0.5 ring-1 ring-[rgba(37,99,235,0.10)]",
        fullWidth ? "w-full" : "",
      ].join(" ")}
      role="group"
      aria-label={t("language.label")}
    >
      {SUPPORTED_LANGUAGES.map(({ code, label }) => {
        const selected = active === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => onChange(code)}
            aria-pressed={selected}
            className={[
              "destrova-lang-segment-btn relative border-0 font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:ring-offset-1",
              fullWidth ? "flex-1" : "",
              compact ? "px-2.5 py-1 text-[10px] tracking-[0.08em]" : "px-3 py-1 text-[11px] tracking-[0.06em]",
              selected
                ? "rounded-[9px] bg-white text-blue-700 font-semibold shadow-[0_1px_3px_rgba(37,99,235,0.10),0_0_0_1px_rgba(37,99,235,0.14)]"
                : "rounded-[9px] bg-transparent text-slate-700 hover:bg-[rgba(37,99,235,0.06)] hover:text-blue-700",
            ].join(" ")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function LanguageSwitcher({ variant = "login" }) {
  const { i18n, t } = useTranslation("common");
  const active = (i18n.language || "en").split("-")[0];

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem("destrova_lang", code);
  };

  if (variant === "topbar") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
          <IconGlobe className="h-3.5 w-3.5 text-slate-500" />
          <span>{t("language.label")}</span>
        </div>
        <SegmentedControl active={active} onChange={changeLanguage} fullWidth compact />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2.5">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-slate-600">
        <IconGlobe className="h-3.5 w-3.5 text-slate-500" />
        {t("language.label")}
      </span>
      <SegmentedControl active={active} onChange={changeLanguage} />
    </div>
  );
}
