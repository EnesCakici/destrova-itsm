//TABLO / UI DEĞİŞTİRMEK İSTİYORSAN
//Burada: AdminTable
//AdminCard
//AdminInput
//👉 tüm UI burada kontrol edilir

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import ManagerCard, { ManagerCardHeader } from "../../manager/components/ManagerCard";
import ManagerSurface from "../../manager/components/ManagerSurface";
import ManagerStatusPill from "../../manager/components/ManagerStatusPill";
import { SAAS_BUTTON } from "../../shared/saasPlatformTokens";

/** Shared field chrome — gray border + blue focus (no destrova-accent purple). */
const ADMIN_FIELD_CLASS =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-gray-400 focus:border-blue-600 focus:shadow-[0_0_0_2px_rgba(37,99,235,0.15)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-gray-400";

/**
 * Re-exports + admin-tuned helpers.
 *
 * Admin reuses Manager card + surface primitives so the visual language
 * stays identical at the shell level. Density tweaks live inside admin
 * views (tighter padding, table-first layouts).
 */

export const AdminCard       = ManagerCard;
export const AdminCardHeader = ManagerCardHeader;
export const AdminSurface    = ManagerSurface;
export const AdminPill       = ManagerStatusPill;

/* ──────────────── Buttons ──────────────── */
export function AdminPrimaryButton({ children, onClick, disabled, type = "button", title }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={SAAS_BUTTON.primary}
    >
      {children}
    </button>
  );
}

export function AdminGhostButton({ children, onClick, disabled, type = "button", title, danger }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        danger
          ? "inline-flex items-center gap-2 rounded-[10px] bg-red-50 px-4 py-2 text-sm font-medium text-red-700 outline-none transition-colors duration-150 hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          : SAAS_BUTTON.secondary,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/* ──────────────── Form inputs ──────────────── */
export function AdminField({ label, hint, children }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-slate-500">
      <span className="font-semibold uppercase tracking-[0.14em]">{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function AdminInput({ value, onChange, placeholder, type = "text", disabled }) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={ADMIN_FIELD_CLASS}
    />
  );
}

export function AdminSelect({ value, onChange, options, disabled }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`${ADMIN_FIELD_CLASS} font-medium`}
    >
      {options.map((opt) =>
        typeof opt === "string"
          ? <option key={opt} value={opt}>{opt}</option>
          : <option key={opt.value ?? opt.label} value={opt.value}>{opt.label}</option>
      )}
    </select>
  );
}

export function AdminToggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-900">
      <span
        className={`relative inline-block h-5 w-9 rounded-full transition-[background-color] duration-150 ${
          checked ? "bg-blue-600" : "bg-slate-300"
        }`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-[left] duration-150 ${
            checked ? "left-[calc(100%-18px)]" : "left-0.5"
          }`}
        />
      </span>
      <input type="checkbox" className="sr-only" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      {label ? <span className="font-medium">{label}</span> : null}
    </label>
  );
}

export function AdminSearchInput({ value, onChange, placeholder = "Search…" }) {
  return (
    <div className="flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-gray-200 bg-slate-100 px-3 transition-[box-shadow] duration-150 focus-within:border-blue-600 focus-within:bg-white focus-within:shadow-[0_0_0_2px_rgba(37,99,235,0.15)]">
      <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-slate-400" fill="none" aria-hidden>
        <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M13 13l-2.6-2.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type="search"
        className="min-w-0 flex-1 border-0 bg-transparent text-sm text-gray-900 outline-none ring-0 placeholder:text-gray-400"
      />
    </div>
  );
}

/* ──────────────── Status / role pills ──────────────── */
export function AdminStatePill({ tone = "neutral", children }) {
  const TONE_CLASSES = {
    success: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200/80",
    warn:    "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200/80",
    danger:  "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200/80",
    info:    "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200/80",
    neutral: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200/90",
  };
  const toneClass = TONE_CLASSES[tone] || TONE_CLASSES.neutral;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-tight ${toneClass}`}
    >
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

/* ──────────────── Sortable table primitive ──────────────── */
/**
 * Compact admin table.
 *
 * `columns` is `[{ id, label, accessor, align?, width?, headerClassName?, cellClassName? }]`.
 * `onRowClick` makes rows clickable + keyboard-activatable.
 *
 * `layout="fixed"` — table fits container width; pair with column widths + truncate.
 * `scrollable={false}` — no horizontal scroll wrapper (use with fixed layout).
 *
 * Headers are inline buttons — no boxes, no thick borders, just an
 * arrow indicator when the column is sorted.
 */
export function AdminTable({
  columns,
  rows,
  getRowKey,
  onRowClick,
  sort,
  onSort,
  empty,
  layout = "auto",
  scrollable,
}) {
  const { t } = useTranslation("admin");
  const fixedLayout = layout === "fixed";
  const allowScroll = scrollable ?? !fixedLayout;
  const ordered = useMemo(() => {
    if (!sort?.key) return rows;
    const col = columns.find((c) => c.id === sort.key);
    if (!col) return rows;
    const dir = sort.dir === "desc" ? -1 : 1;
    return [...rows].sort((a, b) => {
      const av = col.accessor(a);
      const bv = col.accessor(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1 * dir;
      if (bv == null) return -1 * dir;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [columns, rows, sort]);

  const headerLabelClass =
    "text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500";

  return (
    <div className={allowScroll ? "overflow-x-auto" : "overflow-x-hidden"}>
      <table className={`w-full border-collapse ${fixedLayout ? "table-fixed" : ""}`}>
        <thead className="bg-slate-50/90">
          <tr className="border-b border-gray-200">
            {columns.map((c) => {
              const active = sort?.key === c.id;
              const sortable = !!onSort;
              const align = c.align || "left";
              return (
                <th
                  key={c.id}
                  scope="col"
                  className={`px-4 py-3.5 text-left font-normal ${align === "right" ? "text-right" : ""} ${c.headerClassName || ""}`}
                  style={c.width != null ? { width: c.width } : undefined}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort(c.id)}
                      className={`inline-flex items-center gap-1 border-0 bg-transparent p-0 outline-none transition-colors duration-150 hover:text-slate-800 focus-visible:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600/20 ${headerLabelClass} ${
                        active ? "!text-blue-700" : ""
                      } ${align === "right" ? "ml-auto" : ""}`}
                      aria-sort={active ? (sort?.dir === "asc" ? "ascending" : "descending") : "none"}
                    >
                      <span>{c.label}</span>
                      <SortArrow active={active} dir={sort?.dir} />
                    </button>
                  ) : (
                    <span className={headerLabelClass}>{c.label}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {ordered.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">
                {empty || t("common.noResults")}
              </td>
            </tr>
          ) : ordered.map((row) => {
            const key = getRowKey(row);
            const clickable = !!onRowClick;
            return (
              <tr
                key={key}
                onClick={clickable ? () => onRowClick(row) : undefined}
                onKeyDown={clickable ? (e) => { if (e.key === "Enter") onRowClick(row); } : undefined}
                tabIndex={clickable ? 0 : undefined}
                role={clickable ? "button" : undefined}
                className={clickable ? "cursor-pointer transition-colors duration-150 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600/10" : "hover:bg-slate-50/60"}
              >
                {columns.map((c) => (
                  <td
                    key={c.id}
                    className={`border-t border-gray-100 px-4 py-3 text-sm text-gray-900 align-middle ${c.cellClassName || ""}`}
                    style={{
                      textAlign: c.align || "left",
                      ...(c.width != null ? { width: c.width } : {}),
                    }}
                  >
                    {c.render ? c.render(row) : c.accessor(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SortArrow({ active, dir }) {
  if (!active) {
    return (
      <svg viewBox="0 0 12 12" className="h-3 w-3 text-slate-400/70" fill="none" aria-hidden>
        <path d="M6 2.5l2.2 2.2H3.8L6 2.5zM6 9.5L3.8 7.3h4.4L6 9.5z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3 text-blue-600" fill="none" aria-hidden>
      {dir === "desc"
        ? <path d="M6 9.5L3.8 7.3h4.4L6 9.5z" fill="currentColor" />
        : <path d="M6 2.5l2.2 2.2H3.8L6 2.5z" fill="currentColor" />
      }
    </svg>
  );
}

/* ──────────────── Drawer (slide-in from right) ──────────────── */
export function AdminDrawer({ open, onClose, title, eyebrow, footer, children, width = 480 }) {
  const { t } = useTranslation("admin");
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label={t("common.closeDrawer")}
        onClick={onClose}
        className="flex-1 cursor-default bg-slate-900/40"
        style={{ backdropFilter: "blur(2px)" }}
      />
      <aside
        className="flex h-full flex-col border-l border-gray-200 bg-white shadow-xl"
        style={{ width }}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-6 py-4">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p>
            ) : null}
            <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-gray-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            title={t("common.close")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm text-gray-600 transition-colors duration-150 hover:bg-slate-100 hover:text-gray-900"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer ? (
          <footer className="shrink-0 border-t border-gray-200 bg-slate-50 px-6 py-3">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}

/* ──────────────── Modal (centered) ──────────────── */
export function AdminModal({ open, onClose, title, eyebrow, footer, children, width = 480 }) {
  const { t } = useTranslation("admin");
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6" role="dialog" aria-modal="true">
      <button type="button" aria-label={t("common.close")} onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-900/40" style={{ backdropFilter: "blur(2px)" }} />
      <div
        className="relative z-10 flex max-h-[88vh] w-full flex-col overflow-hidden rounded-[14px] border border-gray-200 bg-white shadow-xl"
        style={{ maxWidth: width }}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-6 py-4">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p>
            ) : null}
            <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-gray-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            title={t("common.close")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm text-gray-600 transition-colors duration-150 hover:bg-slate-100 hover:text-gray-900"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer ? (
          <footer className="shrink-0 border-t border-gray-200 bg-slate-50 px-6 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/* ──────────────── Generic sort hook ──────────────── */
export function useSort(initialKey, initialDir = "asc") {
  const [sort, setSort] = useState({ key: initialKey, dir: initialDir });
  const onSort = (key) => setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
  return { sort, onSort };
}
