import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MANAGER_CHROME, MANAGER_COLORS } from "../managerTokens";
import { FILTER_ALL } from "../utils/managerFilterCodes";

const MENU_SHELL =
  "destrova-manager-filter-menu fixed z-[200] max-h-[min(20rem,55vh)] overflow-y-auto rounded-xl border border-gray-200 bg-white py-2 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_20px_rgba(15,23,42,0.08)] animate-fade-in";

function computeMenuPosition(btnEl, options = [], { minWidth = 220 } = {}) {
  if (!btnEl) return { top: 0, left: 0, width: minWidth };
  const margin = 8;
  const rect = btnEl.getBoundingClientRect();
  const longest = options.reduce((max, o) => Math.max(max, String(o.label ?? "").length), 0);
  const contentWidth = Math.ceil(longest * 7.5 + 64);
  const width = Math.min(Math.max(minWidth, Math.ceil(rect.width), contentWidth), 360);
  let left = rect.left;
  if (left + width > window.innerWidth - margin) {
    left = window.innerWidth - margin - width;
  }
  if (left < margin) left = margin;
  return { top: rect.bottom + 6, left, width };
}

function IconChevron({ className, open }) {
  return (
    <svg
      className={[className, open ? "rotate-180" : "", "transition-transform duration-150"].join(" ")}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCheck({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3.5 8.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Custom filter dropdown — styled SaaS menu instead of native OS select chrome.
 */
export default function ManagerFilterDropdown({
  label,
  value,
  options,
  onChange,
  layout = "inline",
  className = "",
  menuMinWidth,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 200 });
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const listRef = useRef(null);
  const btnId = useId();
  const listId = useId();

  const v = value == null ? "" : String(value);
  const isAll = v === FILTER_ALL;
  const selected = options.find((o) => String(o.value) === v) ?? options[0];

  const updatePosition = useCallback(() => {
    setMenuPos(
      computeMenuPosition(btnRef.current, options, {
        minWidth: menuMinWidth ?? (layout === "stack" ? 240 : 220),
      }),
    );
  }, [layout, menuMinWidth, options]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      const target = e.target;
      if (wrapRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector('[aria-selected="true"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [open]);

  const pick = (optValue) => {
    onChange(optValue);
    setOpen(false);
    btnRef.current?.focus();
  };

  const onTriggerKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    const idx = options.findIndex((o) => String(o.value) === v);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = options[Math.min(idx + 1, options.length - 1)];
      if (next) onChange(next.value);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = options[Math.max(idx - 1, 0)];
      if (prev) onChange(prev.value);
    } else if (e.key === "Enter") {
      e.preventDefault();
      setOpen(false);
    }
  };

  const triggerClass = [
    "destrova-manager-filter-trigger",
    layout === "stack"
      ? "destrova-manager-filter-trigger--stack flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-left text-[13px] font-semibold transition-[box-shadow,border-color] duration-150 hover:border-slate-300"
      : "destrova-manager-filter-trigger--inline flex min-w-0 max-w-[10.5rem] flex-1 items-center justify-between gap-2 py-1.5 pl-0 pr-1 text-left text-[13px] font-semibold tracking-tight",
  ].join(" ");

  const trigger = (
    <button
      ref={btnRef}
      type="button"
      id={btnId}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={listId}
      aria-label={label}
      onClick={() => { if (!disabled) setOpen((o) => !o); }}
      onKeyDown={onTriggerKeyDown}
      disabled={disabled}
      className={triggerClass}
      style={{
        color: isAll ? MANAGER_COLORS.support : MANAGER_COLORS.dark,
        boxShadow: layout === "stack" ? MANAGER_CHROME.inputInset : undefined,
      }}
    >
      <span className="min-w-0 truncate">{selected?.label}</span>
      <IconChevron className="h-3.5 w-3.5 shrink-0 opacity-70" open={open} />
    </button>
  );

  const menu = open
    ? createPortal(
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={btnId}
          className={MENU_SHELL}
          style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
        >
          {options.map((opt) => {
            const isSelected = String(opt.value) === v;
            return (
              <li key={String(opt.value)} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => pick(opt.value)}
                  className={[
                    "destrova-manager-filter-menu__option flex min-h-[2.375rem] items-center gap-3 px-3.5 py-2.5 text-[13px] font-medium leading-snug transition-colors duration-150",
                    isSelected
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                    {isSelected ? <IconCheck className="h-3 w-3 text-blue-600" /> : null}
                  </span>
                  <span className="min-w-0 whitespace-nowrap">{opt.label}</span>
                </button>
              </li>
            );
          })}
        </ul>,
        document.body,
      )
    : null;

  if (layout === "stack") {
    return (
      <div ref={wrapRef} className={`relative ${className}`}>
        <span
          className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: MANAGER_COLORS.muted }}
        >
          {label}
        </span>
        {trigger}
        {menu}
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className={[
        "relative inline-flex min-w-0 items-center gap-2.5 rounded-lg border border-gray-200 bg-white py-2 pl-3.5 pr-2",
        className,
      ].join(" ")}
      style={{ color: MANAGER_COLORS.support, boxShadow: MANAGER_CHROME.inputInset }}
    >
      <span
        className="shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: MANAGER_COLORS.muted }}
      >
        {label}
      </span>
      {trigger}
      {menu}
    </div>
  );
}
