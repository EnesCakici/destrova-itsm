import { useEffect, useRef, useState } from "react";
import { IconChart, IconFilter, IconPlus, IconSearch, IconUsers } from "../shared/DestrovaIcons";
import NotificationCenter from "./NotificationCenter";
import { getRoleShellConfig, SHELL_ROLES } from "./roleConfig";

/* ── Profile dropdown (agent/all roles) ────────────────────────────────────── */
function ProfileButton({ dark, agentShell }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Profile"
        className={
          agentShell
            ? "flex max-w-[min(100%,260px)] items-center gap-2.5 rounded-md border-0 py-1 pl-0.5 pr-1.5 text-left transition-colors duration-150 hover:bg-slate-800/70"
            : [
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                dark
                  ? "bg-gradient-to-br from-[#7070aa] to-[#4d4d86] text-white ring-2 ring-white/25"
                  : "bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 ring-2 ring-white",
              ].join(" ")
        }
      >
        {agentShell ? (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-500/50 bg-sky-950/35 text-[11px] font-bold tracking-tight text-sky-100">
              AM
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white">Agent McBride</span>
              <span className="block truncate text-xs text-slate-400">Agent</span>
            </span>
            <svg className="h-4 w-4 shrink-0 text-slate-500" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        ) : (
          "AM"
        )}
      </button>

      {open && (
        <div
          className={[
            "absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border shadow-[0_24px_48px_-12px_rgba(15,14,71,0.32)]",
            dark
              ? agentShell
                ? "border-slate-600/80 bg-slate-900 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.55)]"
                : "border-[#35356d] bg-[#0F0E47]"
              : "border-[#E1E4F2] bg-white",
          ].join(" ")}
        >
          {/* User identity */}
          <div
            className={[
              "border-b px-4 py-3",
              dark ? (agentShell ? "border-slate-700/80" : "border-white/[0.08]") : "border-[#EEF1F7]",
            ].join(" ")}
          >
            <p className={dark ? "text-[13px] font-semibold text-white" : "text-[13px] font-semibold text-[#272757]"}>Agent McBride</p>
            <p className={["mt-0.5 text-[11px]", dark ? (agentShell ? "text-slate-400" : "text-[#8686AC]") : "text-[#8686AC]"].join(" ")}>
              agent@destrova.io
            </p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              type="button"
              className={dark
                ? agentShell
                  ? "flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-slate-200 transition-colors hover:bg-slate-800/90 hover:text-white"
                  : "flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-white/75 transition-colors hover:bg-white/[0.07] hover:text-white"
                : "flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-[#505081] transition-colors hover:bg-[#F6F7FC] hover:text-[#272757]"}
            >
              Profile
            </button>
            <button
              type="button"
              className={dark
                ? agentShell
                  ? "flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-slate-200 transition-colors hover:bg-slate-800/90 hover:text-white"
                  : "flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-white/75 transition-colors hover:bg-white/[0.07] hover:text-white"
                : "flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-[#505081] transition-colors hover:bg-[#F6F7FC] hover:text-[#272757]"}
            >
              Settings
            </button>
          </div>

          <div className={dark ? (agentShell ? "mx-4 border-t border-slate-700/80" : "mx-4 border-t border-white/[0.08]") : "mx-4 border-t border-[#EEF1F7]"} />

          <div className="py-1">
            <button
              type="button"
              className={dark
                ? agentShell
                  ? "flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-red-400/95 transition-colors hover:bg-slate-800/90 hover:text-red-300"
                  : "flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-red-400/90 transition-colors hover:bg-white/[0.06] hover:text-red-400"
                : "flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-red-500 transition-colors hover:bg-[#FFF4F4] hover:text-red-600"}
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Generic action button ──────────────────────────────────────────────────── */
function ActionButton({ children, title, dark }) {
  return (
    <button
      type="button"
      title={title}
      className={[
        "inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-[border-color,background-color,color] duration-150",
        dark
          ? "border-white/20 bg-white/[0.1] text-white/85 hover:bg-white/[0.18] hover:text-white"
          : "border-destrova-border bg-white text-destrova-inkMuted shadow-destrova-sm hover:border-destrova-borderStrong hover:bg-destrova-surfaceMuted hover:text-destrova-ink",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/* ── Global search (functional, Ctrl/⌘+K to focus) ─────────────────────────── */
function GlobalSearchInput({ dark, isAgent }) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState("");
  const agentRail = dark && isAgent;

  useEffect(() => {
    const onKey = (e) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const wrapperClass = [
    "group flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-sm transition-[background-color,box-shadow,color] duration-150",
    agentRail
      ? focused
        ? "bg-slate-800/85 text-white shadow-[0_0_0_1px_rgba(148,163,184,0.45)_inset]"
        : "bg-slate-800/45 text-slate-300 shadow-[0_0_0_1px_rgba(71,85,105,0.45)_inset] hover:bg-slate-800/65"
      : dark
        ? focused
          ? "bg-white/[0.12] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.22)_inset]"
          : "bg-white/[0.06] text-white/70 shadow-[0_0_0_1px_rgba(255,255,255,0.10)_inset] hover:bg-white/[0.10]"
        : focused
          ? "bg-white text-destrova-ink shadow-[0_0_0_1px_rgba(39,39,87,0.18)_inset,0_1px_2px_rgba(15,14,71,0.05)]"
          : "bg-[rgba(39,39,87,0.04)] text-destrova-inkSoft shadow-[0_0_0_1px_rgba(39,39,87,0.06)_inset] hover:bg-[rgba(39,39,87,0.06)]",
  ].join(" ");

  const iconClass = agentRail
    ? "h-4 w-4 shrink-0 text-slate-400"
    : dark
      ? "h-4 w-4 shrink-0 text-white/55"
      : "h-4 w-4 shrink-0 text-destrova-inkFaint";

  const inputClass = [
    "min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-medium tracking-tight outline-none placeholder:font-medium placeholder:tracking-tight",
    agentRail
      ? "text-white placeholder:text-slate-500"
      : dark
        ? "text-white placeholder:text-white/45"
        : "text-destrova-ink placeholder:text-destrova-inkFaint",
  ].join(" ");

  const kbdClass = [
    "rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
    agentRail
      ? "bg-slate-900/70 text-slate-400 shadow-[0_0_0_1px_rgba(71,85,105,0.6)_inset]"
      : dark
        ? "bg-white/10 text-white/55 shadow-[0_0_0_1px_rgba(255,255,255,0.18)_inset]"
        : "bg-white text-destrova-inkSoft shadow-[0_0_0_1px_rgba(39,39,87,0.10)_inset]",
  ].join(" ");

  return (
    <label
      className={wrapperClass}
      onClick={() => inputRef.current?.focus()}
    >
      <IconSearch className={iconClass} />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search tickets, customers, assignees..."
        aria-label="Global search"
        spellCheck={false}
        autoComplete="off"
        className={inputClass}
      />
      <span className="ml-2 hidden shrink-0 items-center gap-1 lg:inline-flex">
        <kbd className={kbdClass}>Ctrl</kbd>
        <kbd className={kbdClass}>K</kbd>
      </span>
    </label>
  );
}

/* ── Individual topbar action renderers ────────────────────────────────────── */
function TopbarAction({ action, onTopbarAction, dark, isAgent }) {
  if (action === "globalSearch") {
    return <GlobalSearchInput dark={dark} isAgent={isAgent} />;
  }

  if (action === "dateRange") {
    return (
      <ActionButton title="Date range" dark={dark}>
        <IconFilter className="h-4 w-4" />
        Date Range
      </ActionButton>
    );
  }

  if (action === "export") {
    return (
      <ActionButton title="Export" dark={dark}>
        <IconChart className="h-4 w-4" />
        Export
      </ActionButton>
    );
  }

  if (action === "quickAddUser") {
    return (
      <button
        type="button"
        className="inline-flex h-8 items-center gap-2 rounded-lg bg-destrova-brand px-3.5 text-sm font-semibold text-white shadow-destrova-cta transition-transform duration-150 hover:-translate-y-px"
        title="Quick add user"
      >
        <IconUsers className="h-4 w-4" />
        Quick Add User
      </button>
    );
  }

  if (action === "systemHealth") {
    return (
      <ActionButton title="System health" dark={dark}>
        <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
        System Health
      </ActionButton>
    );
  }

  if (action === "newTicket") {
    return (
      <button
        type="button"
        onClick={() => onTopbarAction?.("newTicket")}
        className="inline-flex h-8 items-center gap-2 rounded-lg px-3.5 text-sm font-bold !text-white shadow-destrova-cta transition-transform duration-150 hover:-translate-y-px"
        style={{ backgroundImage: "linear-gradient(135deg,#505081 0%,#272757 58%,#0F0E47 100%)" }}
        title="New request"
      >
        <IconPlus className="h-4 w-4" />
        New request
      </button>
    );
  }

  if (action === "notifications") {
    return <NotificationCenter variant="shell" dark={dark} isAgent={isAgent} />;
  }

  if (action === "profile") {
    return <ProfileButton dark={dark} agentShell={Boolean(isAgent)} />;
  }

  return null;
}

/* ── Main topbar ────────────────────────────────────────────────────────────── */
function HamburgerIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function RoleTopbar({
  role,
  title = "ITSM Ticket Management",
  onTopbarAction,
  sidebarCollapsed,
  onSidebarToggle,
}) {
  const config     = getRoleShellConfig(role);
  const isCustomer = role === SHELL_ROLES.CUSTOMER;
  const isAgent    = role === SHELL_ROLES.AGENT;

  const dark = isCustomer || isAgent;

  const dLogoSrc = `${import.meta.env.BASE_URL}D_logo.png`;

  const hasSearch = config.topbar.includes("globalSearch");
  const rightActions = config.topbar.filter((a) => a !== "globalSearch");

  return (
    <header
      className={[
        "z-20 flex h-14 shrink-0 items-center justify-between gap-4",
        isCustomer
          ? "relative border-b border-[#3d3a72] bg-gradient-to-r from-[#272757] via-[#2f2c67] to-[#1e1d58] pl-0 pr-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:pr-5 md:pr-6"
          : isAgent
            ? "border-b border-slate-800/80 bg-[#0f172a] px-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            : "border-b border-destrova-border bg-white/85 px-6 backdrop-blur-md supports-[backdrop-filter]:bg-white/75 dark:border-destrova-borderDark dark:bg-destrova-surfaceDark/80",
      ].join(" ")}
    >
      {/* ── Left ─────────────────────────────────────────────────────────────── */}
      <div className={[
        "flex min-w-0 items-center gap-3",
        hasSearch ? "shrink-0" : "flex-1",
      ].join(" ")}>
        {isCustomer ? (
          <a
            href="/"
            className="group flex min-w-0 items-center rounded-r-xl py-0.5 pr-2 transition-[background-color] duration-200 hover:bg-white/[0.06]"
            title="Destrova home"
            aria-label="Destrova home"
          >
            <span className="flex h-11 w-[76px] shrink-0 items-center justify-center">
              <img
                src={dLogoSrc}
                alt=""
                width={200}
                height={200}
                decoding="async"
                className="h-9 w-9 max-h-10 max-w-10 object-contain transition-[filter,transform] duration-200 group-hover:scale-[1.02] group-hover:drop-shadow-[0_4px_14px_rgba(0,0,0,0.5)]"
              />
            </span>
            <span className="-ml-3 select-none border-l border-white/[0.1] text-[1.35rem] font-semibold italic leading-none tracking-[-0.01em] text-white/95 [font-family:Georgia,'Times_New_Roman',serif] [text-shadow:0_1px_18px_rgba(0,0,0,0.35)] sm:pl-2.5 sm:text-[1.55rem]">
              Destrova
            </span>
          </a>
        ) : isAgent ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {typeof onSidebarToggle === "function" ? (
              <button
                type="button"
                aria-expanded={!sidebarCollapsed}
                aria-controls="destrova-agent-sidebar"
                title={sidebarCollapsed ? "Menüyü aç" : "Menüyü kapat"}
                onClick={onSidebarToggle}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-0 text-slate-400 transition-colors hover:bg-slate-800/90 hover:text-white"
              >
                <HamburgerIcon />
              </button>
            ) : null}
            <a
              href="/"
              className="group flex min-w-0 items-center gap-2.5"
              title="Destrova home"
              aria-label="Destrova home"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-800/70 ring-1 ring-slate-600/60 transition-[background-color,ring-color] group-hover:bg-slate-800 group-hover:ring-slate-500/70">
                <img
                  src={dLogoSrc}
                  alt=""
                  width={22}
                  height={22}
                  decoding="async"
                  className="h-5 w-5 object-contain brightness-110"
                />
              </span>
              <span className="truncate text-[1.05rem] font-semibold italic leading-none tracking-[-0.01em] text-white/95 [font-family:Georgia,'Times_New_Roman',serif]">
                Destrova
              </span>
            </a>
          </div>
        ) : (
          <span className="truncate text-[15px] font-semibold tracking-tight text-destrova-ink md:text-base">
            {title}
          </span>
        )}
      </div>

      {/* ── Center search (only when role exposes globalSearch) ──────────────── */}
      {hasSearch ? (
        <div className="hidden flex-1 items-center justify-center px-4 md:flex">
          <div className="w-full max-w-[460px]">
            <TopbarAction action="globalSearch" onTopbarAction={onTopbarAction} dark={dark} isAgent={isAgent} />
          </div>
        </div>
      ) : null}

      {/* ── Right actions ────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-1.5">
        {rightActions.map((action) => (
          <TopbarAction key={action} action={action} onTopbarAction={onTopbarAction} dark={dark} isAgent={isAgent} />
        ))}
      </div>
    </header>
  );
}
