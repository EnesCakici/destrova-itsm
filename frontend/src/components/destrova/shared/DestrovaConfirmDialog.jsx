import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  MANAGER_COLORS,
  MANAGER_GHOST_BUTTON,
  MANAGER_STATUS,
} from "../manager/managerTokens";

/**
 * In-app confirmation dialog — replaces native window.confirm across Destrova portals.
 */
export function DestrovaConfirmDialog({
  open,
  title,
  subtitle,
  onConfirm,
  onCancel,
  busy = false,
  confirmLabel,
  confirmBusyLabel,
  cancelLabel,
  closeAria,
  zIndex = 1060,
  children,
  irreversibleNote,
}) {
  const { t } = useTranslation("common");
  const titleId = useId();
  const bodyId = useId();
  const resolvedCancel = cancelLabel ?? t("button.cancel");
  const resolvedConfirmBusy = confirmBusyLabel ?? confirmLabel;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4"
      style={{ zIndex }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
    >
      <div
        className="absolute inset-0 cursor-default bg-slate-900/50 backdrop-blur-[1px]"
        onClick={() => { if (!busy) onCancel(); }}
        aria-hidden
      />
      <div
        className="relative z-10 w-full max-w-md overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-[0_8px_32px_rgba(15,23,42,0.16)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0 pr-2">
            <h2
              id={titleId}
              className="text-base font-semibold tracking-tight text-slate-900"
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 truncate text-sm text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            className={`manager-ghost-btn inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 ${MANAGER_GHOST_BUTTON}`}
            onClick={onCancel}
            disabled={busy}
            aria-label={closeAria ?? t("button.cancel")}
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden>
              <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div id={bodyId} className="px-5 py-4">
          <div
            className="rounded-xl px-4 py-4"
            style={{
              backgroundColor: MANAGER_STATUS.atRisk.bg,
              color: MANAGER_COLORS.dark,
              boxShadow: "0 0 0 1px rgba(165,100,0,0.18) inset",
            }}
          >
            {children}
            {irreversibleNote ? (
              <p className="mt-3 text-xs font-semibold" style={{ color: MANAGER_STATUS.breached.fg }}>
                {irreversibleNote}
              </p>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="inline-flex h-9 items-center rounded-lg border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-800 transition-colors duration-150 hover:bg-slate-50 disabled:opacity-60"
            >
              {resolvedCancel}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className="inline-flex h-9 items-center rounded-lg bg-red-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? resolvedConfirmBusy : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
