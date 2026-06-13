import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ROLES } from "../../../constants/roles";
import { useKeycloak } from "../../../context/KeycloakContext";
import LanguageSwitcher from "../shared/LanguageSwitcher";
import { IconChart, IconFilter, IconPlus, IconSearch, IconUsers } from "../shared/DestrovaIcons";
import NotificationCenter from "./NotificationCenter";
import AdminQuickAdd from "../admin/components/AdminQuickAdd";
import AdminHealthIndicator from "../admin/components/AdminHealthIndicator";
import { getRoleShellConfig, SHELL_ROLES } from "./roleConfig";
import { agentChromeSurface, enterpriseSearchField, enterpriseTopbar, enterpriseTopbarControl, topbarControlClass } from "./enterpriseShellTheme";
import { useDestrovaShell } from "./AgentShellContext";

const ROLE_ORDER = [ROLES.ADMIN, ROLES.MANAGER, ROLES.AGENT, ROLES.CUSTOMER];

const ROLE_I18N_KEYS = {
  [ROLES.CUSTOMER]: "role.customer",
  [ROLES.AGENT]: "role.agent",
  [ROLES.MANAGER]: "role.manager",
  [ROLES.ADMIN]: "role.admin",
};

/** Prefer backend display name; humanize lowercase username-style labels. */
function resolveProfileDisplayName(appUser, user) {
  const fromApp = typeof appUser?.name === "string" ? appUser.name.trim() : "";
  const fromUserinfo =
    (typeof user?.name === "string" && user.name.trim()) ||
    [user?.given_name, user?.family_name].filter(Boolean).join(" ").trim() ||
    "";
  const fromUsername =
    typeof user?.preferred_username === "string" ? user.preferred_username.trim() : "";
  const raw = (fromApp || fromUserinfo || fromUsername || "").trim();
  if (!raw) return "User";
  if (raw !== raw.toLowerCase() && /[A-Z]/.test(raw)) return raw;
  return raw.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function profileInitials(name) {
  const parts = String(name || "").split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
  }
  return String(name || "??").slice(0, 2).toUpperCase();
}

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

function IconLogOut({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 17l5-5-5-5M21 12H9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EnterpriseSearch({ value, onChange, inputRef }) {
  const { t } = useTranslation("common");
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
          placeholder={t("shell.searchInboxPlaceholder")}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none ring-0"
          aria-label={t("shell.searchInboxAria")}
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
  const { t } = useTranslation("common");
  const { user, appUser, logout, hasRole } = useKeycloak();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, right: 0 });

  const { displayName, email, roleLabel, initials, showRoleLabel } = useMemo(() => {
    const name = resolveProfileDisplayName(appUser, user);
    const mail =
      (typeof user?.email === "string" && user.email.trim()) ||
      (typeof appUser?.email === "string" && appUser.email.trim()) ||
      "";
    const primaryRole = ROLE_ORDER.find((r) => hasRole(r));
    const role = primaryRole ? t(ROLE_I18N_KEYS[primaryRole]) : "";
    return {
      displayName: name,
      email: mail,
      roleLabel: role,
      initials: profileInitials(name),
      showRoleLabel: Boolean(primaryRole && primaryRole !== ROLES.CUSTOMER),
    };
  }, [user, appUser, hasRole, t]);

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
        className="rounded-2xl bg-white p-2 text-sm font-medium text-slate-700 shadow-[0_12px_40px_-6px_rgba(15,23,42,0.10),0_2px_10px_-2px_rgba(15,23,42,0.05)] ring-1 ring-[rgba(37,99,235,0.08)]"
        role="menu"
      >
        <div className="px-2 pt-1 pb-2">
          <div className="flex items-start gap-3 rounded-xl px-2 py-2">
            <span className={enterpriseTopbarControl.avatarActive}>{initials}</span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="truncate text-sm font-semibold leading-snug tracking-tight text-slate-900">
                {displayName}
              </p>
              {email ? (
                <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{email}</p>
              ) : null}
              {showRoleLabel ? (
                <span className="mt-2 inline-flex max-w-full items-center rounded-full bg-[rgba(37,99,235,0.08)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-blue-700 ring-1 ring-[rgba(37,99,235,0.12)]">
                  {roleLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="mx-3 my-1 border-t border-slate-100" />
        <div className="px-3 py-2.5">
          <LanguageSwitcher variant="topbar" />
        </div>
        <div className="mx-3 my-1 border-t border-slate-100" />
        <div className="px-2 py-1">
          <button
            type="button"
            className={enterpriseTopbarControl.logout}
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            <IconLogOut className={enterpriseTopbarControl.logoutIcon} />
            {t("shell.logOut")}
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
        title={t("shell.profile")}
        data-testid="profile-menu-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className={topbarControlClass({ active: open, variant: "profile" })}
      >
        <span className={open ? enterpriseTopbarControl.avatarActive : enterpriseTopbarControl.avatarInactive}>
          {initials}
        </span>
        <ChevronDown className={open ? "h-4 w-4 text-blue-600" : "h-4 w-4 text-slate-600 group-hover:text-blue-600"} />
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
  const { t } = useTranslation("common");
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
        <PrimaryGradientButton
          key={action}
          title={t("shell.newRequest")}
          onClick={() => onTopbarAction?.("newTicket")}
        >
          <IconPlus className="h-4 w-4" />
          {t("shell.newRequest")}
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
  const { t } = useTranslation("common");
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
            title={sidebarPinned ? t("shell.collapseSidebar") : t("shell.expandSidebar")}
            onClick={onSidebarToggle}
            className={topbarControlClass({ active: sidebarPinned })}
          >
            <span className={sidebarPinned ? enterpriseTopbarControl.iconActive : enterpriseTopbarControl.iconInactive}>
              <HamburgerIcon />
            </span>
          </button>
        ) : null}

        <a
          href="/"
          className="group flex min-w-0 shrink-0 items-center rounded-[10px] py-0.5 transition-colors duration-150 hover:bg-slate-900/[0.03]"
          title={t("shell.home")}
          aria-label={t("shell.home")}
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
