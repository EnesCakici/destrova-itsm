//TABLO / UI DEĞİŞTİRMEK İSTİYORSAN
//Burada: AdminTable
//AdminCard
//AdminInput
//👉 tüm UI burada kontrol edilir

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import ManagerCard, { ManagerCardHeader } from "../../manager/components/ManagerCard";
import ManagerSurface from "../../manager/components/ManagerSurface";
import ManagerStatusPill from "../../manager/components/ManagerStatusPill";
import { ADMIN_COLORS } from "../adminTokens";

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
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold tracking-tight transition-[background-color,opacity] duration-150 disabled:cursor-not-allowed disabled:opacity-60"
      style={{ color: "#FFFFFF", backgroundColor: ADMIN_COLORS.dark }}
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
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold tracking-tight transition-[background-color,color,opacity] duration-150 disabled:cursor-not-allowed disabled:opacity-60 hover:bg-slate-100"
      style={{ color: danger ? "#A8243B" : ADMIN_COLORS.dark, backgroundColor: "transparent" }}
    >
      {children}
    </button>
  );
}

/* ──────────────── Form inputs ──────────────── */
export function AdminField({ label, hint, children }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs" style={{ color: ADMIN_COLORS.muted }}>
      <span className="font-semibold uppercase tracking-[0.14em]">{label}</span>
      {children}
      {hint ? <span className="text-[11px]" style={{ color: ADMIN_COLORS.muted }}>{hint}</span> : null}
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
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200/70 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      style={{ color: disabled ? undefined : ADMIN_COLORS.dark }}
    />
  );
}

export function AdminSelect({ value, onChange, options, disabled }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition-[border-color,box-shadow] duration-150 focus:border-slate-300 focus:ring-2 focus:ring-slate-200/70 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      style={{ color: disabled ? undefined : ADMIN_COLORS.dark }}
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
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm" style={{ color: ADMIN_COLORS.dark }}>
      <span
        className="relative inline-block h-5 w-9 rounded-full transition-[background-color] duration-150"
        style={{ backgroundColor: checked ? ADMIN_COLORS.ink : "#CBD5E1" }}
        aria-hidden
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-[left] duration-150"
          style={{ left: checked ? "calc(100% - 18px)" : "2px" }}
        />
      </span>
      <input type="checkbox" className="sr-only" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      {label ? <span className="font-medium">{label}</span> : null}
    </label>
  );
}

export function AdminSearchInput({ value, onChange, placeholder = "Search…" }) {
  return (
    <div className="flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 transition-[border-color,box-shadow] duration-150 focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-200/70">
      <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="none" aria-hidden style={{ color: ADMIN_COLORS.muted }}>
        <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M13 13l-2.6-2.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type="search"
        className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none ring-0 placeholder:font-normal placeholder:text-slate-400"
        style={{ color: ADMIN_COLORS.dark }}
      />
    </div>
  );
}

/* ──────────────── Status / role pills ──────────────── */
export function AdminStatePill({ tone = "neutral", children }) {
  const TONES = {
    success:  { fg: "#1F7A5C", bg: "rgba(31,122,92,0.10)" },
    warn:     { fg: "#A56400", bg: "rgba(165,100,0,0.10)" },
    danger:   { fg: "#A8243B", bg: "rgba(168,36,59,0.10)" },
    info:     { fg: "#34508C", bg: "rgba(52,80,140,0.10)" },
    neutral:  { fg: ADMIN_COLORS.support, bg: "rgba(39,39,87,0.06)" },
  };
  const c = TONES[tone] || TONES.neutral;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-tight"
      style={{ color: c.fg, backgroundColor: c.bg }}
    >
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.fg }} />
      {children}
    </span>
  );
}

/* ──────────────── Sortable table primitive ──────────────── */
/**
 * Compact admin table.
 *
 * `columns` is `[{ id, label, accessor, align?, width? }]`.
 * `onRowClick` makes rows clickable + keyboard-activatable.
 *
 * Headers are inline buttons — no boxes, no thick borders, just an
 * arrow indicator when the column is sorted.
 */
export function AdminTable({ columns, rows, getRowKey, onRowClick, sort, onSort, empty }) {
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate" style={{ borderSpacing: 0 }}>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.id;
              const sortable = !!onSort;
              return (
                <th
                  key={c.id}
                  scope="col"
                  className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: ADMIN_COLORS.muted, width: c.width, textAlign: c.align || "left" }}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort(c.id)}
                      className="inline-flex items-center gap-1 rounded px-0.5 transition-colors duration-150 hover:text-[var(--ink)]"
                      style={{ color: active ? ADMIN_COLORS.dark : ADMIN_COLORS.muted }}
                    >
                      <span>{c.label}</span>
                      <SortArrow active={active} dir={sort?.dir} />
                    </button>
                  ) : (
                    <span>{c.label}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {ordered.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-sm" style={{ color: ADMIN_COLORS.muted }}>
                {empty || "No results."}
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
                className={clickable ? "cursor-pointer transition-colors duration-100 hover:bg-slate-50 focus:bg-slate-100/70 focus:outline-none" : ""}
              >
                {columns.map((c) => (
                  <td
                    key={c.id}
                    className="border-t border-slate-200/70 px-3 py-2.5 text-sm align-middle"
                    style={{
                      color: ADMIN_COLORS.dark,
                      textAlign: c.align || "left",
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
      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden style={{ opacity: 0.4 }}>
        <path d="M6 2.5l2.2 2.2H3.8L6 2.5zM6 9.5L3.8 7.3h4.4L6 9.5z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
      {dir === "desc"
        ? <path d="M6 9.5L3.8 7.3h4.4L6 9.5z" fill="currentColor" />
        : <path d="M6 2.5l2.2 2.2H3.8L6 2.5z" fill="currentColor" />
      }
    </svg>
  );
}

/* ──────────────── Drawer (slide-in from right) ──────────────── */
export function AdminDrawer({ open, onClose, title, eyebrow, footer, children, width = 480 }) {
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
        aria-label="Close drawer"
        onClick={onClose}
        className="flex-1 cursor-default bg-[rgba(15,14,71,0.32)]"
        style={{ backdropFilter: "blur(2px)" }}
      />
      <aside
        className="flex h-full flex-col bg-white shadow-[0_30px_80px_-24px_rgba(15,14,71,0.45)] ring-1 ring-slate-200/60"
        style={{ width }}
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200/70 px-6 py-4">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: ADMIN_COLORS.muted }}>{eyebrow}</p>
            ) : null}
            <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight" style={{ color: ADMIN_COLORS.dark }}>{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors duration-150 hover:bg-slate-100"
            style={{ color: ADMIN_COLORS.support }}
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer ? (
          <footer className="border-t border-slate-200/70 bg-slate-50/60 px-6 py-3">
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
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" onClick={onClose}
        className="absolute inset-0 cursor-default bg-[rgba(15,14,71,0.36)]" style={{ backdropFilter: "blur(2px)" }} />
      <div
        className="relative z-10 flex max-h-[88vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_-24px_rgba(15,14,71,0.45)] ring-1 ring-slate-200/60"
        style={{ maxWidth: width }}
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200/70 px-6 py-4">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: ADMIN_COLORS.muted }}>{eyebrow}</p>
            ) : null}
            <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight" style={{ color: ADMIN_COLORS.dark }}>{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors duration-150 hover:bg-slate-100"
            style={{ color: ADMIN_COLORS.support }}
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer ? (
          <footer className="border-t border-slate-200/70 bg-slate-50/60 px-6 py-3">
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
