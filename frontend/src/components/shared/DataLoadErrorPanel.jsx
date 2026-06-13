import { useTranslation } from "react-i18next";
import { getApiErrorMessage } from "../../services/api";

/**
 * Enterprise-style load failure — no demo/mock data underneath.
 */
export default function DataLoadErrorPanel({
  message,
  error = null,
  onRetry,
  showReloadPage = true,
  className = "",
}) {
  const { t } = useTranslation("common");
  const detail = error ? getApiErrorMessage(error, "") : "";

  return (
    <div
      className={`rounded-xl border border-red-200/90 bg-red-50 px-5 py-5 md:px-6 md:py-6 ${className}`.trim()}
      role="alert"
    >
      <p className="text-sm font-semibold text-red-950">
        {message || t("dataLoad.failed")}
      </p>
      {detail ? (
        <p className="mt-1.5 text-sm text-red-900/85">{detail}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-9 items-center rounded-lg bg-red-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-800"
          >
            {t("button.retry")}
          </button>
        ) : null}
        {showReloadPage ? (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-9 items-center rounded-lg border border-red-300/80 bg-white px-4 text-sm font-semibold text-red-900 transition-colors hover:bg-red-50"
          >
            {t("button.reloadPage")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
