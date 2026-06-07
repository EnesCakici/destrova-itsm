import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ROLES, ROLE_LABELS } from "../../../constants/roles";
import { useKeycloak } from "../../../context/KeycloakContext";
import { IconChart, IconFilter, IconPlus, IconSearch, IconUsers } from "../shared/DestrovaIcons";
import NotificationCenter from "./NotificationCenter";
import AdminQuickAdd from "../admin/components/AdminQuickAdd";
import AdminHealthIndicator from "../admin/components/AdminHealthIndicator";
import { getRoleShellConfig, SHELL_ROLES } from "./roleConfig";
import { agentChromeSurface, enterpriseSearchField, enterpriseTopbar } from "./enterpriseShellTheme";
import { useDestrovaShell } from "./AgentShellContext";

const ROLE_ORDER = [ROLES.ADMIN, ROLES.MANAGER, ROLES.AGENT, ROLES.CUSTOMER];

function HamburgerIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDown({ className = "h-4 w-4 text-slate-600" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EnterpriseSearch({ value, onChange, inputRef }) {
  const isMac = useMemo(() => {
    if (typeof navigator === "undefined") return true;
    return /Mac|iPhone|iPod/i.test(navigator.platform);
  }, []);

  return (
    <div className="relative w-full max-w-md min-w-[180px]">
      <div className={enterpriseSearchField}>
        <IconSearch className="h-[18px] w-[18px] shrink-0 text-slate-400 group-focus-within:text-slate-500" />
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search inbox — ID, title, requester, status…"
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none ring-0"
          aria-label="Search inbox tickets"
        />
        <span className="hidden shrink-0 items-center gap-0.5 sm:flex" aria-hidden>
          {isMac ? (
            <kbd className="rounded-md bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              ⌘ K
            </kbd>
          ) : (
            <kbd className="rounded-md bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              Ctrl K
            </kbd>
          )}
        </span>
      </div>
    </div>
  );
}

function ProfileMenu() {
  const { user, appUser, logout, hasRole } = useKeycloak();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, right: 0 });

  const { displayName, email, roleLabel, initials } = useMemo(() => {
    const fromUserinfo =
      (typeof user?.name === "string" && user.name.trim()) ||
      [user?.given_name, user?.family_name].filter(Boolean).join(" ").trim() ||
      (typeof user?.preferred_username === "string" && user.preferred_username) ||
      "";
    const fromApp = (appUser && (appUser.firstName || appUser.name)) || "";
    const name = (fromUserinfo || fromApp || "User").trim();
    const mail = (typeof user?.email === "string" && user.email) || (appUser && appUser.email) || "";
    const primaryRole = ROLE_ORDER.find((r) => hasRole(r));
    const role = primaryRole ? ROLE_LABELS[primaryRole] : "—";
    const parts = name.split(/\s+/).filter(Boolean);
    const inits =
      parts.length >= 2
        ? `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase()
        : name.slice(0, 2).toUpperCase() || "??";
    return { displayName: name, email: mail, roleLabel: role, initials: inits };
  }, [user, appUser, hasRole]);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      const t = e.target;
      if (wrapRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const dropdown =
    open &&
    createPortal(
      <div
        ref={menuRef}
        style={{
          position: "fixed",
          top: coords.top,
          right: coords.right,
          width: 260,
          zIndex: 9999,
        }}
        className="rounded-2xl bg-white p-2 text-sm font-medium text-slate-700  ring-1 ring-slate-900/[0.06]"
        role="menu"
      >
        <div className="rounded-xl bg-slate-50/90 px-3 py-3">
          <p className="text-sm font-semibold tracking-tight text-slate-900">{displayName}</p>
          <p className="mt-0.5 text-xs font-medium text-slate-600">{roleLabel}</p>
          {email ? <p className="mt-1 truncate text-xs text-slate-500">{email}</p> : null}
        </div>
        <div className="mt-1 flex flex-col gap-0.5 py-1">
          <button
            type="button"
            className="mt-0.5 min-h-[2rem] w-full rounded-lg px-3.5 py-2.5 text-left font-semibold text-red-600 transition-colors duration-150 hover:bg-red-50 hover:text-red-700 active:scale-[0.99] border-none"
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            Log out
          </button>
        </div>
      </div>,
      document.body,
    );

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        title="Profile"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-2 rounded-xl border-0 py-1 pl-1 pr-2 text-sm font-medium text-slate-700 transition-[background-color,transform] duration-150 ease-out hover:bg-slate-900/[0.05] active:scale-[0.98]"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200/90 text-xs font-semibold text-slate-800">
          {initials}
        </span>
        <ChevronDown className="h-4 w-4 text-slate-600" />
      </button>
      {dropdown}
    </div>
  );
}

function ActionButton({ children, title }) {
  return (
    <button
      type="button"
      title={title}
      className="inline-flex h-10 items-center gap-2 rounded-xl border-0 bg-slate-900/[0.05] px-3 text-sm font-medium text-slate-700 transition-[background-color,color,transform] duration-150 ease-out hover:bg-slate-900/[0.09] hover:text-slate-900 active:scale-[0.98]"
    >
      {children}
    </button>
  );
}

function PrimaryGradientButton({ children, title, onClick }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-agent-button border-0 px-4 text-sm font-semibold text-white shadow-[0_6px_14px_rgba(37,99,235,0.35)] transition-[transform,filter] duration-150 ease-out [background:linear-gradient(135deg,#2563EB,#1D4ED8)] hover:brightness-[1.03] active:scale-[0.98]"
    >
      {children}
    </button>
  );
}


function TopbarActions({ actions, onTopbarAction }) {
  const nodes = [];
  for (const action of actions) {
    if (action === "dateRange") {
      nodes.push(
        <ActionButton key={action} title="Date range">
          <IconFilter className="h-4 w-4" />
          Date range
        </ActionButton>,
      );
    } else if (action === "export") {
      nodes.push(
        <ActionButton key={action} title="Export">
          <IconChart className="h-4 w-4" />
          Export
        </ActionButton>,
      );
    } else if (action === "quickAddUser") {
      nodes.push(
        <PrimaryGradientButton key={action} title="Quick add user" onClick={() => onTopbarAction?.("quickAddUser")}>
          <IconUsers className="h-4 w-4" />
          Quick add user
        </PrimaryGradientButton>,
      );
    } else if (action === "quickAdd") {
      nodes.push(<AdminQuickAdd key={action} />);
    } else if (action === "systemHealth") {
      nodes.push(
        <ActionButton key={action} title="System health">
          <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
          System health
        </ActionButton>,
      );
    } else if (action === "systemHealthIndicator") {
      nodes.push(<AdminHealthIndicator key={action} />);
    } else if (action === "newTicket") {
      nodes.push(
        <PrimaryGradientButton key={action} title="New request" onClick={() => onTopbarAction?.("newTicket")}>
          <IconPlus className="h-4 w-4" />
          New request
        </PrimaryGradientButton>,
      );
    } else if (action === "notifications") {
      nodes.push(<NotificationCenter key={action} variant="enterprise" />);
    } else if (action === "profile") {
      nodes.push(<ProfileMenu key={action} />);
    }
  }
  return <>{nodes}</>;
}

/**
 * Enterprise light topbar: agent inbox search (controlled), ⌘K / Ctrl+K focus, profile menu portaled.
 */
export default function Topbar({
  role = SHELL_ROLES.AGENT,
  activeNavId,
  onTopbarAction,
  sidebarPinned,
  onSidebarToggle,
  sidebarControlsId = "destrova-agent-sidebar",
}) {
  const config = getRoleShellConfig(role);
  const dLogoSrc = `${import.meta.env.BASE_URL}D_logo.png`;
  const showSearch =
    role === SHELL_ROLES.AGENT &&
    activeNavId === "inbox" &&
    config.topbar?.includes("globalSearch");
  const { ticketSearchQuery, setTicketSearchQuery, searchInputRef } = useDestrovaShell();

  useEffect(() => {
    if (!showSearch) return undefined;
    const onKey = (e) => {
      if (e.defaultPrevented) return;
      const k = e.key?.toLowerCase();
      if (k !== "k") return;
      if (!(e.metaKey || e.ctrlKey)) return;
      const t = e.target;
      if (t instanceof HTMLElement && t.isContentEditable) return;
      if (t instanceof HTMLTextAreaElement) return;
      if (t instanceof HTMLInputElement && t !== searchInputRef.current) {
        const skip = ["text", "email", "password", "number", "tel", "url", "search", "date", "time"];
        if (skip.includes(t.type)) return;
      }
      e.preventDefault();
      searchInputRef.current?.focus?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showSearch, searchInputRef]);

  return (
    <header
      className={[
        "sticky top-0 z-30 flex h-16 w-full shrink-0 items-center gap-3 overflow-x-hidden overflow-y-visible border-b border-slate-200/70 px-4 sm:gap-4 sm:px-5",
        agentChromeSurface,
        "shadow-[0_1px_0_rgba(15,23,42,0.04)]",
        enterpriseTopbar.transition,
      ].join(" ")}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
        {typeof onSidebarToggle === "function" ? (
          <button
            type="button"
            aria-expanded={sidebarPinned}
            aria-controls={sidebarControlsId}
            title={sidebarPinned ? "Collapse sidebar" : "Expand sidebar"}
            onClick={onSidebarToggle}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-0 text-slate-600 transition-[background-color,color,transform] duration-150 ease-out hover:bg-slate-900/[0.06] active:scale-[0.98]"
          >
            <HamburgerIcon />
          </button>
        ) : null}

        <a
          href="/"
          className="group flex min-w-0 shrink-0 items-center rounded-[10px] py-0.5 transition-colors duration-150 hover:bg-slate-900/[0.03]"
          title="Home"
          aria-label="Home"
        >
          <img
            src={dLogoSrc}
            alt=""
            width={320}
            height={96}
            decoding="async"
            className="block h-11 w-auto max-h-[56px] max-w-[min(360px,62vw)] object-contain object-left sm:h-12 sm:max-h-[58px] sm:max-w-[min(420px,52vw)]"
          />
        </a>
      </div>

      <div className="hidden min-w-0 flex-1 justify-center overflow-visible px-2 md:flex md:px-4">
        {showSearch ? (
          <EnterpriseSearch
            value={ticketSearchQuery}
            onChange={setTicketSearchQuery}
            inputRef={searchInputRef}
          />
        ) : null}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 overflow-visible">
        <TopbarActions
          actions={(config.topbar || []).filter((a) => a !== "globalSearch")}
          onTopbarAction={onTopbarAction}
        />
      </div>
    </header>
  );
}
