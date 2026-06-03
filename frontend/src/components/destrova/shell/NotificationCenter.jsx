import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useKeycloak } from "../../../context/KeycloakContext";
import { ROLES } from "../../../constants/roles";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATIONS_BUMP_EVENT,
} from "../../../services/api";
import { useAgentShell } from "./AgentShellContext";
import { IconBell } from "../shared/DestrovaIcons";

/**
 * Rol bazlı ticket derin bağlantısı (router ile uyumlu).
 * @param {(role: string) => boolean} hasRole
 * @param {string|number|null|undefined} ticketId
 */
export function ticketPathForNotification(hasRole, ticketId) {
  if (ticketId == null || ticketId === "") return null;
  const id = String(ticketId);
  if (hasRole(ROLES.CUSTOMER)) return `/customer/tickets/${id}`;
  if (hasRole(ROLES.AGENT)) return `/agent/inbox?ticketId=${encodeURIComponent(id)}`;
  if (hasRole(ROLES.MANAGER)) return `/manager/tickets/${id}`;
  if (hasRole(ROLES.ADMIN)) return `/manager/tickets/${id}`;
  return null;
}

/**
 * Topbar bildirim zili + dropdown (canlı API; polling yok).
 * @param {{ variant?: "shell" | "enterprise"; dark?: boolean; isAgent?: boolean }} props
 */
export default function NotificationCenter({ variant = "shell", dark = false, isAgent = false }) {
  const navigate = useNavigate();
  const { openTicket } = useAgentShell();
  const { authenticated, hasRole } = useKeycloak();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const wrapRef = useRef(null);
  const bellRef = useRef(null);
  const panelRef = useRef(null);
  const [panelCoords, setPanelCoords] = useState(
    /** @type {{ top: number; left: number; width: number; maxHeight: number } | null} */ (null),
  );

  const isEnterprise = variant === "enterprise";

  const refreshUnread = useCallback(async () => {
    if (!authenticated) {
      setUnread(0);
      return;
    }
    try {
      const raw = await getUnreadNotificationCount();
      const n = typeof raw === "number" ? raw : Number(raw);
      setUnread(Number.isFinite(n) && n >= 0 ? Math.min(9999, Math.floor(n)) : 0);
    } catch {
      setUnread(0);
    }
  }, [authenticated]);

  const loadList = useCallback(async () => {
    if (!authenticated) {
      setItems([]);
      return;
    }
    setListLoading(true);
    try {
      const data = await getNotifications();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setListLoading(false);
    }
  }, [authenticated]);

  const computePanelCoords = useCallback(() => {
    const el = bellRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const margin = 8;
    const gap = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxPanelW = 384;
    const width = Math.min(maxPanelW, vw - 2 * margin);
    let left = r.right - width;
    if (left < margin) left = margin;
    if (left + width > vw - margin) left = Math.max(margin, vw - width - margin);
    let top = r.bottom + gap;
    let maxHeight = Math.min(420, vh - top - margin);
    if (maxHeight < 100) {
      maxHeight = Math.min(420, Math.max(120, r.top - margin - gap));
      top = Math.max(margin, r.top - gap - maxHeight);
    } else {
      maxHeight = Math.max(120, maxHeight);
    }
    return { top, left, width, maxHeight };
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPanelCoords(null);
      return;
    }
    const apply = () => {
      const c = computePanelCoords();
      if (c) setPanelCoords(c);
    };
    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("scroll", apply, true);
    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("scroll", apply, true);
    };
  }, [open, computePanelCoords]);

  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread]);

  useEffect(() => {
    const onFocus = () => {
      if (authenticated) void refreshUnread();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [authenticated, refreshUnread]);

  useEffect(() => {
    const onBump = () => {
      void refreshUnread();
    };
    window.addEventListener(NOTIFICATIONS_BUMP_EVENT, onBump);
    return () => window.removeEventListener(NOTIFICATIONS_BUMP_EVENT, onBump);
  }, [refreshUnread]);

  useEffect(() => {
    if (!authenticated) return undefined;
    const pollMs = 30_000;
    const tick = () => {
      if (document.visibilityState === "visible") void refreshUnread();
    };
    const id = window.setInterval(tick, pollMs);
    return () => window.clearInterval(id);
  }, [authenticated, refreshUnread]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const onBellClick = () => {
    setOpen((o) => !o);
    void refreshUnread();
    void loadList();
  };

  const onMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      await refreshUnread();
      await loadList();
    } catch {
      /* sessiz */
    }
  };

  const onRowClick = async (row) => {
    try {
      if (row?.id != null && !row.read) {
        await markNotificationRead(row.id);
      }
    } catch {
      /* devam et — yönlendirme yapılabilir */
    }
    void refreshUnread();
    const tid = row?.relatedTicketId;
    setOpen(false);

    if (tid != null && hasRole(ROLES.AGENT)) {
      const idStr = String(tid);
      openTicket(idStr);
      navigate(`/agent/inbox?ticketId=${encodeURIComponent(idStr)}`);
      return;
    }

    const path = ticketPathForNotification(hasRole, tid);
    if (path) navigate(path);
  };

  const showBadge = unread > 0;

  const bellBtn = isEnterprise
    ? "relative flex h-10 w-10 items-center justify-center rounded-xl border-0 text-slate-600 transition-[background-color,color,transform] duration-150 ease-out hover:bg-slate-900/[0.06] active:scale-[0.98]"
    : [
        "relative flex h-8 w-8 items-center justify-center rounded-md border-0 transition-[background-color,color] duration-150",
        dark
          ? isAgent
            ? "text-slate-400 hover:bg-slate-800/85 hover:text-white"
            : "text-white/70 hover:bg-white/[0.09] hover:text-white"
          : "text-destrova-inkSoft hover:border-destrova-border hover:bg-white hover:text-destrova-ink",
      ].join(" ");

  const panelChrome = isEnterprise
    ? "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_48px_-12px_rgba(15,23,42,0.18)]"
    : [
        "flex min-h-0 flex-col overflow-hidden rounded-xl border shadow-[0_24px_48px_-12px_rgba(15,14,71,0.32)]",
        dark
          ? isAgent
            ? "border-slate-600/80 bg-slate-900 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.55)]"
            : "border-[#35356d] bg-[#0F0E47]"
          : "border-[#E1E4F2] bg-white",
      ].join(" ");

  const portalTarget = typeof document !== "undefined" ? document.body : null;

  const headerText = isEnterprise
    ? "text-sm font-semibold text-slate-900"
    : dark
      ? "text-sm font-semibold text-white"
      : "text-sm font-semibold text-[#272757]";

  const subText = isEnterprise ? "text-xs text-slate-500" : dark ? "text-xs text-slate-400" : "text-xs text-[#8686AC]";

  /** Bildirim iki satır: başlık altındaki açıklama (||| sonrası), mevcut subText ile uyumlu tonlar */
  const notificationBodyLine = isEnterprise
    ? "mt-0.5 line-clamp-3 text-xs text-slate-500"
    : dark
      ? isAgent
        ? "mt-0.5 line-clamp-3 text-xs text-slate-400"
        : "mt-0.5 line-clamp-3 text-xs text-white/55"
      : "mt-0.5 line-clamp-3 text-xs text-[#8686AC]";

  const rowBase = isEnterprise
    ? "w-full border-0 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
    : [
        "w-full border-0 px-3 py-2.5 text-left transition-colors",
        dark ? "hover:bg-white/[0.07]" : "hover:bg-[#F6F7FC]",
      ].join(" ");

  const rowUnread = isEnterprise ? "bg-sky-50/80" : dark ? "bg-white/[0.06]" : "bg-[#F0F2FB]";

  const iconSize = isEnterprise ? "h-[19px] w-[19px]" : "h-[17px] w-[17px]";

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={bellRef}
        type="button"
        className={bellBtn}
        title="Notifications"
        aria-expanded={open}
        onClick={onBellClick}
      >
        <IconBell className={iconSize} />
        {showBadge ? (
          <span
            className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white"
            aria-label={`${unread} unread notifications`}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open && panelCoords && portalTarget
        ? createPortal(
            <div
              ref={panelRef}
              className={panelChrome}
              style={{
                position: "fixed",
                top: panelCoords.top,
                left: panelCoords.left,
                width: panelCoords.width,
                maxHeight: panelCoords.maxHeight,
                zIndex: 200,
              }}
            >
              <div
                className={
                  isEnterprise
                    ? "flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5"
                    : [
                        "flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2.5",
                        dark ? (isAgent ? "border-slate-700/80" : "border-white/[0.08]") : "border-[#EEF1F7]",
                      ].join(" ")
                }
              >
                <span className={headerText}>Notifications</span>
                <button
                  type="button"
                  onClick={() => void onMarkAll()}
                  className={
                    isEnterprise
                      ? "text-xs font-semibold text-blue-600 hover:text-blue-700"
                      : dark
                        ? "text-xs font-semibold text-sky-300 hover:text-sky-200"
                        : "text-xs font-semibold text-[#505081] hover:text-[#272757]"
                  }
                >
                  Mark all read
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
                {listLoading ? <p className={`px-3 py-6 text-center ${subText}`}>Loading…</p> : null}
                {!listLoading && items.length === 0 ? (
                  <p className={`px-3 py-6 text-center ${subText}`}>No notifications</p>
                ) : null}
                {!listLoading &&
                  items.map((row) => {
                    const parts = (row.message || "").split("|||");
                    const title = (parts[0] || "").trim();
                    const detail = (parts[1] || "").trim();
                    const messageTitleClass = isEnterprise
                      ? ["text-sm font-semibold leading-snug", row.read ? "text-slate-600" : "text-slate-900"].join(" ")
                      : [
                          "text-sm font-semibold leading-snug",
                          dark ? (row.read ? "text-white/70" : "text-white") : row.read ? "text-[#505081]" : "text-[#272757]",
                        ].join(" ");
                    return (
                    <button
                      key={row.id}
                      type="button"
                      className={[rowBase, row.read ? "" : rowUnread].join(" ")}
                      onClick={() => void onRowClick(row)}
                    >
                      <div className="flex flex-col text-left">
                        <span className={messageTitleClass}>{title || row.message}</span>
                        {detail ? <span className={notificationBodyLine}>{detail}</span> : null}
                      </div>
                    
                    </button>
                  );
                  })}
              </div>
            </div>,
            portalTarget,
          )
        : null}
    </div>
  );
}
