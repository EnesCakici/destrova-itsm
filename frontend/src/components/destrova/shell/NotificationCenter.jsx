import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useKeycloak } from "../../../context/KeycloakContext";
import { ROLES } from "../../../constants/roles";
import { useFormatter } from "../../../hooks/useFormatter";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATIONS_BUMP_EVENT,
} from "../../../services/api";
import { AGENT_COLORS, AGENT_SEMANTIC } from "../agent/agentTokens";
import { IconBell } from "../shared/DestrovaIcons";
import { enterpriseTopbarControl, topbarControlClass } from "./enterpriseShellTheme";
import { useAgentShell } from "./AgentShellContext";
import {
  getNotificationVisualKind,
  parseNotificationMessage,
  translateNotificationDetail,
  translateNotificationHeadline,
} from "../../../utils/notificationI18n";

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

/** Five semantic tones for notification rows — no purple/violet/cyan one-offs. */
const NOTIFICATION_VISUAL = {
  danger: { dot: AGENT_SEMANTIC.danger, unreadBg: "rgba(239,68,68,0.06)" },
  warning: { dot: AGENT_SEMANTIC.warning, unreadBg: "rgba(245,158,11,0.06)" },
  success: { dot: AGENT_SEMANTIC.success, unreadBg: "rgba(34,197,94,0.06)" },
  primary: { dot: AGENT_COLORS.primary, unreadBg: "rgba(37,99,235,0.06)" },
  neutral: { dot: "#6B7280", unreadBg: "rgba(107,114,128,0.05)" },
};

function getNotificationVisual(type, headline) {
  const kind = getNotificationVisualKind(type, headline);
  return NOTIFICATION_VISUAL[kind] || NOTIFICATION_VISUAL.neutral;
}

function extractTicketId(title, relatedTicketId) {
  if (relatedTicketId != null && relatedTicketId !== "") {
    return String(relatedTicketId);
  }
  const match = (title || "").match(/#(\d+)/);
  return match ? match[1] : null;
}

/**
 * Topbar bildirim zili + dropdown (REST API; 15s poll + bump event ile güncellenir).
 * @param {{ variant?: "shell" | "enterprise"; dark?: boolean; isAgent?: boolean }} props
 */
export default function NotificationCenter({ variant = "shell", dark = false, isAgent = false }) {
  const { t } = useTranslation("notifications");
  const { formatRelativeTime } = useFormatter();
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
    void loadList();
  }, [refreshUnread, loadList]);

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
    const pollMs = 15_000;
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

  const visibleBadgeCount = open ? 0 : unread;
  const showBadge = visibleBadgeCount > 0;

  const bellBtn = isEnterprise
    ? topbarControlClass({ active: open })
    : [
        "relative flex h-8 w-8 items-center justify-center rounded-md border-0 transition-[background-color,color] duration-150",
        dark
          ? isAgent
            ? "text-slate-400 hover:bg-slate-800/85 hover:text-white"
            : "text-white/70 hover:bg-white/[0.09] hover:text-white"
          : "text-destrova-inkSoft hover:border-destrova-border hover:bg-white hover:text-destrova-ink",
      ].join(" ");

  const iconSize = isEnterprise ? "h-[19px] w-[19px]" : "h-[17px] w-[17px]";

  const portalTarget = typeof document !== "undefined" ? document.body : null;

  // Section split
  const unreadItems = items.filter((r) => !r.read);
  const readItems = items.filter((r) => r.read);
  const hasBoth = unreadItems.length > 0 && readItems.length > 0;

  // Theme helpers
  const isDark = dark;
  const panelBg = isDark
    ? isAgent
      ? "bg-slate-900 border-slate-700/60"
      : "bg-[#0d0c40] border-[#2b2968]"
    : "bg-white border-slate-200/70";

  const muted = isDark ? "text-white/35" : "text-slate-400";
  const bodyMuted = isDark ? "text-white/45" : "text-slate-400";

  const renderRow = (row) => {
    const parsed = parseNotificationMessage(row.message || "");
    const title = translateNotificationHeadline(parsed.headline, t);
    const detail = translateNotificationDetail(parsed.detail, t);
    const visual = getNotificationVisual(row.type, parsed.headline);
    const ticketId = extractTicketId(row.message, row.relatedTicketId);
    const timeStr = formatRelativeTime(row.createdAt);
    const isUnread = !row.read;

    const detailParts = [];
    if (detail) detailParts.push(detail);
    if (ticketId) detailParts.push(t("ticketRef", { id: ticketId }));
    const detailLine = detailParts.join(" · ");

    return (
      <button
        key={row.id}
        type="button"
        onClick={() => void onRowClick(row)}
        className={[
          "group relative w-full border-0 bg-transparent text-left transition-colors duration-100",
          isDark ? "hover:bg-white/[0.04]" : "hover:bg-slate-50/80",
          isUnread ? "pl-[14px]" : "pl-4",
        ].join(" ")}
        style={isUnread && !isDark ? { backgroundColor: visual.unreadBg } : undefined}
      >
        {isUnread ? (
          <span
            className="absolute bottom-2 left-0 top-2 w-[3px] rounded-full"
            style={{ backgroundColor: visual.dot }}
            aria-hidden
          />
        ) : null}

        <div className="flex items-start gap-2.5 py-2.5 pr-4">
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: visual.dot }}
            aria-hidden
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={[
                  "min-w-0 flex-1 line-clamp-1 text-sm leading-snug",
                  isUnread
                    ? isDark
                      ? "font-semibold text-white/90"
                      : "font-semibold text-gray-900"
                    : isDark
                      ? "font-normal text-white/45"
                      : "font-normal text-gray-500",
                ].join(" ")}
              >
                {title || row.message}
              </span>
              {timeStr ? (
                <span
                  className={[
                    "shrink-0 text-xs tabular-nums",
                    isDark ? muted : "text-gray-400",
                  ].join(" ")}
                >
                  {timeStr}
                </span>
              ) : null}
            </div>

            {detailLine ? (
              <p
                className={[
                  "mt-0.5 line-clamp-1 text-xs leading-snug",
                  isDark ? bodyMuted : "text-gray-500",
                ].join(" ")}
              >
                {detailLine}
              </p>
            ) : null}
          </div>

          {isUnread ? (
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: visual.dot }}
              aria-hidden
            />
          ) : null}
        </div>
      </button>
    );
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={bellRef}
        type="button"
        className={bellBtn}
        title={t("title")}
        aria-expanded={open}
        onClick={onBellClick}
      >
        <IconBell
          className={[
            iconSize,
            isEnterprise
              ? open
                ? enterpriseTopbarControl.iconActive
                : enterpriseTopbarControl.iconInactive
              : "",
          ].join(" ")}
        />
        {showBadge ? (
          <span
            className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white"
            style={{ backgroundColor: AGENT_COLORS.primary }}
            aria-label={t("unreadBadge", { count: visibleBadgeCount })}
          >
            {visibleBadgeCount > 99 ? "99+" : visibleBadgeCount}
          </span>
        ) : null}
      </button>

      {open && panelCoords && portalTarget
        ? createPortal(
            <div
              ref={panelRef}
              className={[
                "flex min-h-0 flex-col overflow-hidden rounded-2xl border",
                panelBg,
                isDark
                  ? "shadow-[0_20px_60px_-10px_rgba(0,0,0,0.55)]"
                  : "shadow-[0_12px_40px_-6px_rgba(15,23,42,0.10),0_2px_10px_-2px_rgba(15,23,42,0.05)]",
              ].join(" ")}
              style={{
                position: "fixed",
                top: panelCoords.top,
                left: panelCoords.left,
                width: panelCoords.width,
                maxHeight: panelCoords.maxHeight,
                zIndex: 200,
              }}
            >
              {/* ── Header ── */}
              <div
                className={[
                  "flex shrink-0 items-center justify-between gap-2 px-4 py-3",
                  isDark ? "border-b border-white/[0.06]" : "border-b border-slate-100",
                ].join(" ")}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-[13px] font-bold tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>
                    {t("title")}
                  </span>
                  {unread > 0 && (
                    <span
                      className={[
                        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                        isDark ? "bg-white/[0.12] text-white/70" : "bg-blue-50 text-blue-700",
                      ].join(" ")}
                    >
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void onMarkAll()}
                  className={[
                    "border-0 bg-transparent px-0 text-[11px] font-medium transition-colors duration-100",
                    isDark ? "text-white/30 hover:text-white/60" : "text-slate-400 hover:text-slate-600",
                  ].join(" ")}
                >
                  {t("markAllRead")}
                </button>
              </div>

              {/* ── Body ── */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
                {/* Loading */}
                {listLoading ? (
                  <div className="flex items-center justify-center gap-2.5 py-10">
                    <div
                      className={[
                        "h-4 w-4 animate-spin rounded-full border-2",
                        isDark ? "border-white/20 border-t-white/60" : "border-slate-200 border-t-blue-600",
                      ].join(" ")}
                    />
                    <span className={`text-[12px] ${muted}`}>{t("loading")}</span>
                  </div>
                ) : null}

                {/* Empty */}
                {!listLoading && items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 px-6 py-12">
                    <div
                      className={[
                        "flex h-11 w-11 items-center justify-center rounded-2xl",
                        isDark ? "bg-white/[0.07] text-white/50" : "bg-slate-50 text-slate-400 ring-1 ring-slate-100",
                      ].join(" ")}
                    >
                      <IconBell className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="text-center">
                      <p className={`text-[13px] font-semibold ${isDark ? "text-white/60" : "text-slate-600"}`}>
                        {t("emptyTitle")}
                      </p>
                      <p className={`mt-0.5 text-[11px] ${muted}`}>
                        {t("emptyDescription")}
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Unread section */}
                {!listLoading && unreadItems.length > 0 && (
                  <div>
                    {hasBoth && (
                      <p className={`px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest ${muted}`}>
                        {t("sectionNew")}
                      </p>
                    )}
                    {unreadItems.map(renderRow)}
                  </div>
                )}

                {/* Divider between sections */}
                {!listLoading && hasBoth && (
                  <div className={[
                    "mx-4 my-0.5 h-px",
                    isDark ? "bg-white/[0.06]" : "bg-slate-100",
                  ].join(" ")} />
                )}

                {/* Read section */}
                {!listLoading && readItems.length > 0 && (
                  <div>
                    {hasBoth && (
                      <p className={`px-4 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-widest ${muted}`}>
                        {t("sectionEarlier")}
                      </p>
                    )}
                    {readItems.map(renderRow)}
                  </div>
                )}
              </div>
            </div>,
            portalTarget,
          )
        : null}
    </div>
  );
}
