import { Children, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation, Trans } from "react-i18next";
import {
  assignTicket,
  getAgentCapacities,
  getTeams,
  getTicketById,
  addComment,
  getAttachments,
  downloadAttachment,
  uploadAttachment,
  deleteAttachment,
  buildExpectedProjection,
  executeTicketAction,
  getDestrovaApiErrorMessage,
  ProjectionTimeoutError,
  statusToAction,
  waitForTicketProjection,
} from "../api/api";
import { formatAttachmentUploadFailures } from "../../../../services/api";
import { ATTACHMENT_POLICY, validateTicketAttachments, countOwnServerAttachments } from "../../../../utils/attachmentPolicy";
import { useKeycloak } from "../../../../context/KeycloakContext";
import DataLoadErrorPanel from "../../../shared/DataLoadErrorPanel";
import { DestrovaTicketDetailSkeleton } from "../../../shared/DestrovaLoading";
import { normalizeTicketForManagerTable } from "../hooks/useManagerTicketsData";
import {
  MANAGER_CHROME,
  MANAGER_COLORS,
  MANAGER_GHOST_BUTTON,
  MANAGER_PAGE,
  MANAGER_STATUS,
  SAAS_BUTTON,
} from "../managerTokens";
import { IconSearch } from "../../shared/DestrovaIcons";
import { enterpriseSearchField } from "../../shell/enterpriseShellTheme";
import ManagerCard, { ManagerCardHeader } from "./ManagerCard";
import ManagerStatusPill, { priorityKind } from "./ManagerStatusPill";
import ManagerSurface from "./ManagerSurface";
import { useManagerWorkspace } from "./ManagerWorkspaceContext";
import { listInvolvedMentionPeopleFromTicket } from "../../agent/data/workspaceModel";
import {
  closureReasonOptions,
  formatClosureReasonI18n,
  MANAGER_FORCE_CLOSE_REASONS,
} from "../../shared/constants/closureReasons";
import {
  isResolutionNoteValid,
  RESOLUTION_NOTE_MIN_LENGTH,
} from "../../shared/constants/resolutionNote";
import { formatApiErrorWithCapacityHint } from "../../shared/utils/agentCapacityMessages";
import { formatMessageToHtml, messageProseClass } from "../../shared/storedRichHtml";
import DestrovaComposer from "../../shared/DestrovaComposer";
import TicketContextBar from "../../shared/TicketContextBar";
import { ComposerResizeHandle, useResizableComposerEditor } from "../../shared/composerResize.jsx";
import {
  ConversationActivityFilterButton,
  isManagerActivityEntry,
} from "../../shared/timelineActivityFilter.jsx";
import { htmlToPlainText } from "../../shared/htmlPlainText";
import DOMPurify from "dompurify";
import {
  formatManagerSlaDueLabel,
  translateManagerActivityActor,
} from "../utils/managerDashboardFormat";
import { translateManagerSlaCode } from "../utils/managerFilterI18n";
import {
  buildManagerClosureReasonOptions,
  buildManagerDetailPriorityOptions,
  buildManagerDetailStatusOptions,
  formatManagerTicketDetailAt,
  managerTimelineBadgeLabel,
  translateManagerDetailPriorityLabel,
  translateManagerTimelineKind,
  translateManagerTimelineMeta,
  classifyManagerSystemCommentType,
  dedupeSystemTimelineEvents,
  formatManagerSystemTimelineCompact,
} from "../utils/managerTicketDetailI18n";

/* ── Icons (small, inline) ─────────────────────────────────────────────── */
function IconArrow({ className }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconDownload({ className }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <path d="M8 3v8m0 0l-3-3m3 3l3-3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconPaperclip({ className }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <path d="M11.5 7.5l-4 4a2.5 2.5 0 11-3.5-3.5l5-5a3.5 3.5 0 115 5L9.5 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconLockSm({ className }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <rect x="3.5" y="7" width="9" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 7V5.2a2.5 2.5 0 015 0V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function IconExternalSm({ className }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <path d="M2.5 4.5h11v6h-5l-3 2.5v-2.5h-3v-6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
function IconWarn({ className }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <path d="M8 2.5L1.5 13.5h13L8 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 6.5v3.5M8 11.6v.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
/* ── Status / priority option lists ───────────────────────────────────── */
const STATUS_OPTIONS   = ["New", "In Progress", "Waiting for Customer", "Resolved", "Closed"];
const PRIORITY_OPTIONS = ["High", "Medium", "Low"];

const STATUS_TO_API = {
  New: "NEW",
  "In Progress": "IN_PROGRESS",
  "Waiting for Customer": "WAITING_FOR_CUSTOMER",
  Resolved: "RESOLVED",
  Closed: "CLOSED",
};

const PRIORITY_TO_API = {
  High: "HIGH",
  Medium: "MEDIUM",
  Low: "LOW",
};

const CLOSURE_REASON_OPTIONS = closureReasonOptions(MANAGER_FORCE_CLOSE_REASONS);

function formatClosureReasonForDisplay(raw, translateFn) {
  if (raw == null || raw === "") return null;
  const formatted = formatClosureReasonI18n(raw, translateFn);
  return formatted || null;
}

/* ── Conversation thread (customer enterprise SaaS pattern, manager roles) ─ */
function shouldShowTimelineMeta(entry) {
  if (!entry.meta || entry.type === "worklog") return false;
  if (["customer_reply", "agent_reply", "internal_note"].includes(entry.type)) return false;
  return true;
}

function managerMessageVisuals(entry, tm) {
  const badgeLabel = managerTimelineBadgeLabel(entry, tm);
  switch (entry.type) {
    case "customer_reply":
      return {
        rowBg: "bg-sky-50/30",
        avatar: "bg-sky-100 text-sky-800 ring-sky-200/90",
        name: "text-sky-900",
        badge: { label: badgeLabel, className: "bg-sky-100 text-sky-800 ring-sky-200/80" },
        bubble: "border-sky-500 ring-sky-200/45 text-slate-800",
      };
    case "agent_reply":
      return {
        rowBg: "bg-blue-50/25",
        avatar: "bg-blue-600 text-white ring-blue-200/60",
        name: "text-blue-900",
        badge: { label: badgeLabel, className: "bg-blue-100 text-blue-800 ring-blue-200/80" },
        bubble: "border-blue-600 ring-blue-200/40 text-slate-800",
      };
    case "internal_note":
      return {
        rowBg: "bg-amber-50/30",
        avatar: "bg-amber-100 text-amber-900 ring-amber-200/90",
        name: "text-amber-900",
        badge: { label: badgeLabel, className: "bg-amber-100 text-amber-900 ring-amber-200/80" },
        bubble: "border-amber-500 ring-amber-200/45 text-slate-800",
      };
    case "worklog":
      return {
        rowBg: "bg-slate-50/60",
        avatar: "bg-slate-200 text-slate-700 ring-slate-300/80",
        name: "text-slate-800",
        badge: { label: badgeLabel, className: "bg-slate-100 text-slate-700 ring-slate-200/80" },
        bubble: "border-slate-400 ring-slate-200/45 text-slate-800",
      };
    default:
      return {
        rowBg: "bg-slate-50/40",
        avatar: "bg-slate-200 text-slate-700 ring-slate-300/80",
        name: "text-slate-800",
        badge: { label: badgeLabel, className: "bg-slate-100 text-slate-700 ring-slate-200/80" },
        bubble: "border-slate-400 ring-slate-200/45 text-slate-800",
      };
  }
}

function initialsFromName(name) {
  const s = String(name || "").trim();
  if (!s || s.toLowerCase() === "system") return "S";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const MANAGER_COMPACT_SYSTEM_TYPES = new Set(["status_change", "assignment", "sla_warning", "priority_change"]);

function managerTimelineAccent(type) {
  if (type === "sla_warning") return MANAGER_STATUS.atRisk.fg;
  if (type === "assignment") return "#64748B";
  return MANAGER_COLORS.primary;
}

function TimelineEntry({ entry }) {
  const { t } = useTranslation("manager");
  const { t: tc } = useTranslation("common");
  const kind = translateManagerTimelineKind(entry, t);

  if (MANAGER_COMPACT_SYSTEM_TYPES.has(entry.type)) {
    const accent = managerTimelineAccent(entry.type);
    const compact = formatManagerSystemTimelineCompact(entry.body || entry.title, t, tc);
    const displayKind =
      compact.kindKey === "status"
        ? t("ticketDetail.timeline.kinds.status")
        : entry.type === "assignment"
          ? t("ticketDetail.timeline.kinds.assignment")
          : entry.type === "priority_change"
            ? t("ticketDetail.timeline.kinds.activity")
            : kind;
    return (
      <div className="relative flex items-center gap-2 py-0.5">
        <span
          className="relative z-[1] flex h-6 w-7 shrink-0 items-center justify-center self-center"
          aria-hidden
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full ring-2 ring-white"
            style={{ backgroundColor: accent, boxShadow: `0 0 0 2px ${accent}22` }}
          />
        </span>
        <p className="min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] leading-[1.35] text-slate-700 shadow-customer-card">
          <span className="font-semibold" style={{ color: accent }}>{displayKind}</span>
          <span className="text-slate-500"> · </span>
          <span>{compact.message}</span>
          <span className="ml-1 whitespace-nowrap text-[10px] font-medium text-slate-500" title={entry.at}>
            · {entry.at}
          </span>
        </p>
      </div>
    );
  }

  const visuals = managerMessageVisuals(entry, t);
  const displayName = translateManagerActivityActor(entry.title || t("ticketDetail.unknown"), t);

  return (
    <article className={["relative flex gap-2 rounded-lg py-2 pr-1", visuals.rowBg].join(" ")}>
      <span aria-hidden className="relative z-[1] flex w-7 shrink-0 justify-center">
        <span
          className={[
            "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ring-1 ring-inset",
            visuals.avatar,
          ].join(" ")}
        >
          {initialsFromName(displayName)}
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className={["text-sm font-semibold", visuals.name].join(" ")}>{displayName}</p>
          <span
            className={[
              "inline-flex items-center rounded-full px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-[0.06em] ring-1 ring-inset",
              visuals.badge.className,
            ].join(" ")}
          >
            {visuals.badge.label}
          </span>
          {shouldShowTimelineMeta(entry) ? (
            <span className="inline-flex items-center rounded-full bg-white/80 px-1.5 py-px text-[9.5px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200/90">
              {translateManagerTimelineMeta(entry.meta, t)}
            </span>
          ) : null}
          <span className="ml-auto text-[10.5px] text-slate-500" title={entry.at}>
            {entry.at}
          </span>
        </div>

        {entry.body ? (
          <div
            className={[
              "mt-1 rounded-lg border-l-[3px] bg-white p-4 shadow-customer-card ring-1 ring-inset",
              messageProseClass(entry.body),
              visuals.bubble,
            ].join(" ")}
            dangerouslySetInnerHTML={{ __html: formatMessageToHtml(entry.body) }}
          />
        ) : null}

        {entry.type === "worklog" && entry.meta ? (
          <p className="mt-1.5 text-[10.5px] font-medium text-slate-500">{translateManagerTimelineMeta(entry.meta, t)}</p>
        ) : null}
      </div>
    </article>
  );
}

/* ── Header ──────────────────────────────────────────────────────────── */
function DetailHeader({ ticket, onBack }) {
  const { t } = useTranslation("manager");
  const { t: tc } = useTranslation("common");
  const assigneeLabel = ticket.assigneeName?.trim() || ticket.assignee || t("ticketDetail.unassigned");
  const slaDue = formatManagerSlaDueLabel(ticket.sla?.due, t);
  const priorityLabel = translateManagerDetailPriorityLabel(ticket.priority, tc);

  return (
    <header className="mb-6 flex flex-col gap-3 md:mb-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-tight text-slate-500 transition-[background-color,color] duration-150 hover:bg-slate-100 hover:text-slate-800"
      >
        <IconArrow className="h-3.5 w-3.5" />
        {t("ticketDetail.back")}
      </button>
      <div className={MANAGER_PAGE.pageHeaderStrip}>
        <TicketContextBar portal="manager">
          <p className="font-mono text-[11px] font-semibold tracking-tight text-slate-500">
            {ticket.displayId || ticket.id}
          </p>
          <ManagerStatusPill kind={priorityKind(ticket.priority)}>{priorityLabel}</ManagerStatusPill>
          <ManagerStatusPill kind={ticket.sla.state}>
            {translateManagerSlaCode(ticket.sla.state, t)} · {slaDue}
          </ManagerStatusPill>
        </TicketContextBar>
        <div className="border-t border-slate-200/80 px-5 py-4 md:px-6 md:py-[1.125rem]">
          <div className="flex items-center gap-2">
            <span aria-hidden className={MANAGER_PAGE.pageHeaderAccent} />
            <p className={MANAGER_PAGE.pageHeaderEyebrow}>{t("ticketDetail.eyebrow")}</p>
          </div>
          <h1 className={MANAGER_PAGE.pageHeaderTitle}>{ticket.title}</h1>
          <p className={MANAGER_PAGE.pageHeaderDesc}>
            {ticket.customer} · {assigneeLabel} · {ticket.product} · {t("ticketDetail.opened")} {ticket.openedAt || t("ticketDetail.openedFallback")}
          </p>
        </div>
      </div>
    </header>
  );
}

/* ── Action toolbar (status, priority, reassign) ──────────────────── */
const MANAGER_FIELD_INPUT_CLASS =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(37,99,235,0.22)] disabled:cursor-not-allowed disabled:opacity-60";

function FieldSelect({ label, value, options, onChange, disabled = false }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs" style={{ color: MANAGER_COLORS.muted }}>
      <span className="font-semibold uppercase tracking-[0.14em]">{label}</span>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={MANAGER_FIELD_INPUT_CLASS}
        style={{
          color: MANAGER_COLORS.dark,
          boxShadow: MANAGER_CHROME.inputInset,
        }}
      >
        {options.map((opt) => (
          <option key={opt.value || "_unassigned"} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}

function teamCoversProduct(team, productId, productName) {
  const products = Array.isArray(team?.products) ? team.products : [];
  if (productId != null && !Number.isNaN(Number(productId))) {
    return products.some((p) => Number(p.id) === Number(productId));
  }
  if (productName && String(productName).trim()) {
    const name = String(productName).trim().toLowerCase();
    return products.some((p) => String(p.name || "").trim().toLowerCase() === name);
  }
  return false;
}

function buildAssigneeCatalog(teams, agents, productId, productName) {
  const capacityById = new Map();
  for (const agent of Array.isArray(agents) ? agents : []) {
    if (agent?.agentId == null) continue;
    capacityById.set(Number(agent.agentId), agent);
  }

  const matchingTeams = (Array.isArray(teams) ? teams : []).filter((team) =>
    teamCoversProduct(team, productId, productName),
  );

  const teamMemberMeta = new Map();
  for (const team of matchingTeams) {
    for (const member of team.members || []) {
      if (member?.id == null) continue;
      const agentId = Number(member.id);
      if (!teamMemberMeta.has(agentId)) {
        teamMemberMeta.set(agentId, { teamNames: new Set(), fallbackName: member.name });
      }
      const meta = teamMemberMeta.get(agentId);
      meta.teamNames.add(team.name);
      if (member.name) meta.fallbackName = member.name;
    }
  }

  const toRow = (agentId, extra = {}) => {
    const cap = capacityById.get(agentId);
    const active = cap?.activeTicketCount ?? 0;
    const max = cap?.maxTicketLimit ?? null;
    return {
      agentId,
      name: cap?.agentName ?? extra.fallbackName ?? `Agent #${agentId}`,
      active,
      max,
      teamNames: extra.teamNames ?? [],
    };
  };

  const teamRows = [...teamMemberMeta.entries()]
    .map(([agentId, meta]) => toRow(agentId, { teamNames: [...meta.teamNames], fallbackName: meta.fallbackName }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const teamIds = new Set(teamRows.map((r) => r.agentId));
  const otherRows = (Array.isArray(agents) ? agents : [])
    .filter((a) => a?.agentId != null && !teamIds.has(Number(a.agentId)))
    .map((a) => toRow(Number(a.agentId)))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { matchingTeams, teamRows, otherRows };
}

function AssigneeCapacityBadge({ active, max }) {
  if (max == null) return null;
  const pct = Math.round((active / max) * 100);
  const tone = pct >= 90 ? MANAGER_STATUS.breached : pct >= 70 ? MANAGER_STATUS.atRisk : MANAGER_STATUS.safe;
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-semibold tabular-nums"
      style={{ color: tone.fg, backgroundColor: tone.bg }}
    >
      {active}/{max}
    </span>
  );
}

function AssigneeModalSection({ title, hint, children }) {
  const items = Children.toArray(children);
  if (!items.length) return null;
  return (
    <section className="mb-5 last:mb-0">
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</h3>
        <span className="text-[10px] tabular-nums text-slate-400">{hint}</span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">{items}</ul>
    </section>
  );
}

function AssigneeModalRow({ row, selected, onSelect, otherAgentsLabel }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(row.agentId)}
        className={[
          "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors duration-150",
          selected
            ? "border-blue-200 bg-blue-50/70 ring-1 ring-inset ring-blue-200/80"
            : "border-gray-100 bg-white hover:border-gray-200 hover:bg-slate-50/80",
        ].join(" ")}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
          {row.name.trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{row.name}</p>
          <p className="truncate text-xs text-slate-500">
            {row.teamNames?.length ? row.teamNames.join(" · ") : otherAgentsLabel}
          </p>
        </div>
        <AssigneeCapacityBadge active={row.active} max={row.max} />
      </button>
    </li>
  );
}

function AssigneePickerModal({
  open,
  onClose,
  value,
  onSelect,
  teams,
  agents,
  productId,
  productName,
  ticketLabel,
}) {
  const { t } = useTranslation("manager");
  const [query, setQuery] = useState("");
  const [showAllAgents, setShowAllAgents] = useState(false);
  const searchRef = useRef(null);

  const catalog = useMemo(
    () => buildAssigneeCatalog(teams, agents, productId, productName),
    [teams, agents, productId, productName],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (row) =>
      !q ||
      row.name.toLowerCase().includes(q) ||
      (row.teamNames || []).some((t) => t.toLowerCase().includes(q));
    return {
      teamRows: catalog.teamRows.filter(match),
      otherRows: catalog.otherRows.filter(match),
    };
  }, [catalog, query]);

  const selectedOutsideTeam = useMemo(() => {
    if (!value) return false;
    const id = Number(value);
    if (Number.isNaN(id)) return false;
    const inTeam = catalog.teamRows.some((r) => r.agentId === id);
    const inOther = catalog.otherRows.some((r) => r.agentId === id);
    return inOther && !inTeam;
  }, [value, catalog]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setShowAllAgents(false);
      return undefined;
    }
    if (selectedOutsideTeam) setShowAllAgents(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose, selectedOutsideTeam]);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    if (filtered.otherRows.length > 0 && filtered.teamRows.length === 0) {
      setShowAllAgents(true);
    }
  }, [query, filtered.otherRows.length, filtered.teamRows.length]);

  if (!open || typeof document === "undefined") return null;

  const teamTitle =
    catalog.matchingTeams.length === 1
      ? catalog.matchingTeams[0].name
      : t("ticketDetail.assigneePicker.recommendedForProduct");
  const subtitle = [
    ticketLabel,
    productName ? `${t("ticketDetail.assigneePicker.productPrefix")} · ${productName}` : null,
    catalog.matchingTeams.length
      ? `${t("ticketDetail.assigneePicker.teamsPrefix")} · ${catalog.matchingTeams.map((team) => team.name).join(", ")}`
      : null,
  ].filter(Boolean).join(" · ");

  const handleSelect = (agentId) => {
    onSelect(String(agentId));
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manager-assignee-modal-title"
    >
      <button
        type="button"
        aria-label={t("ticketDetail.assigneePicker.closePicker")}
        className="absolute inset-0 cursor-default bg-slate-900/50"
        style={{ backdropFilter: "blur(3px)" }}
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[min(88vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_24px_64px_-12px_rgba(15,23,42,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 bg-slate-50/80 px-5 py-4 md:px-6">
          <div className="min-w-0 pr-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600">
              {t("ticketDetail.assigneePicker.eyebrow")}
            </p>
            <h2 id="manager-assignee-modal-title" className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
              {t("ticketDetail.assigneePicker.title")}
            </h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className={`manager-ghost-btn inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-slate-900 ${MANAGER_GHOST_BUTTON}`}
            onClick={onClose}
            aria-label={t("ticketDetail.assigneePicker.close")}
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden>
              <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="shrink-0 border-b border-gray-100 px-5 py-3 md:px-6">
          <div className={enterpriseSearchField}>
            <IconSearch className="h-[18px] w-[18px] shrink-0 text-slate-400" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("ticketDetail.assigneePicker.searchPlaceholder")}
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none ring-0"
            />
          </div>
        </div>

        <div className="destrova-manager-feed-scroll min-h-[280px] flex-1 overflow-y-auto px-5 py-4 md:px-6 md:py-5">
          {filtered.teamRows.length === 0 && filtered.otherRows.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              {query.trim()
                ? t("ticketDetail.assigneePicker.noMatch", { query: query.trim() })
                : t("ticketDetail.assigneePicker.empty")}
            </p>
          ) : (
            <>
              <AssigneeModalSection
                title={teamTitle}
                hint={t("ticketDetail.assigneePicker.agentCount", { count: filtered.teamRows.length })}
              >
                {filtered.teamRows.map((row) => (
                  <AssigneeModalRow
                    key={`team-${row.agentId}`}
                    row={row}
                    selected={String(row.agentId) === String(value)}
                    onSelect={handleSelect}
                    otherAgentsLabel={t("ticketDetail.assigneePicker.otherAgents")}
                  />
                ))}
              </AssigneeModalSection>
              {filtered.otherRows.length > 0 ? (
                <section className="mt-1 border-t border-gray-100 pt-4">
                  {!showAllAgents ? (
                    <button
                      type="button"
                      onClick={() => setShowAllAgents(true)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-dashed border-gray-200 bg-slate-50/80 px-3 py-3 text-left transition-colors duration-150 hover:border-blue-200 hover:bg-blue-50/40"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{t("ticketDetail.assigneePicker.browseAll")}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {t("ticketDetail.assigneePicker.outsideTeam", { count: filtered.otherRows.length })}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-blue-600 ring-1 ring-inset ring-blue-100">
                        {t("ticketDetail.assigneePicker.showList")}
                      </span>
                    </button>
                  ) : (
                    <>
                      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          {t("ticketDetail.assigneePicker.allAgents")}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] tabular-nums text-slate-400">
                            {t("ticketDetail.assigneePicker.agentCount", { count: filtered.otherRows.length })}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowAllAgents(false)}
                            className={`manager-ghost-btn rounded-md px-2 py-0.5 text-[10px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 ${MANAGER_GHOST_BUTTON}`}
                          >
                            {t("ticketDetail.assigneePicker.hide")}
                          </button>
                        </div>
                      </div>
                      <ul className="m-0 flex list-none flex-col gap-1 p-0">
                        {filtered.otherRows.map((row) => (
                          <AssigneeModalRow
                            key={`other-${row.agentId}`}
                            row={row}
                            selected={String(row.agentId) === String(value)}
                            onSelect={handleSelect}
                            otherAgentsLabel={t("ticketDetail.assigneePicker.otherAgents")}
                          />
                        ))}
                      </ul>
                    </>
                  )}
                </section>
              ) : null}
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-100 bg-slate-50/60 px-5 py-3 md:px-6">
          <p className="text-[11px] text-slate-500">
            <Trans
              i18nKey="ticketDetail.assigneePicker.footer"
              ns="manager"
              components={{ strong: <span className="font-semibold text-slate-700" /> }}
            />
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function AssigneeFieldTrigger({ label, displayName, capacity, onOpen, disabled, loading, isUnassigned }) {
  const { t } = useTranslation("manager");
  const capacitySuffix =
    capacity?.max != null ? ` · ${capacity.active ?? 0}/${capacity.max}` : "";
  const triggerText = loading
    ? t("ticketDetail.assigneePicker.loadingAgents")
    : isUnassigned
      ? t("ticketDetail.unassigned")
      : `${displayName}${capacitySuffix}`;

  return (
    <div className="flex min-w-0 flex-col gap-1.5 text-xs" style={{ color: MANAGER_COLORS.muted }}>
      <span className="font-semibold uppercase tracking-[0.14em]">{label}</span>
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled || loading}
        aria-haspopup="dialog"
        aria-label={t("ticketDetail.assigneePicker.openPicker", { name: triggerText })}
        className={`${MANAGER_FIELD_INPUT_CLASS} flex min-w-0 items-center justify-between gap-2 text-left`}
        style={{ color: MANAGER_COLORS.dark, boxShadow: MANAGER_CHROME.inputInset }}
      >
        <span className="min-w-0 truncate">{triggerText}</span>
        <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-slate-400" fill="none" aria-hidden>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

/**
 * Plan manager apply chain: assign → status (incl. close) → priority.
 * @returns {{ action: string, body: object, expected: object }[]}
 */
function buildManagerApplySteps(ticketRow, apiTicket, draft, tm) {
  const steps = [];
  const fromStatusApi = STATUS_TO_API[ticketRow.status];
  const toStatusApi = STATUS_TO_API[draft.status];
  const fromPriorityApi = PRIORITY_TO_API[ticketRow.priority];
  const toPriorityApi = PRIORITY_TO_API[draft.priority];
  const currentAssigneeKey =
    ticketRow.assigneeId != null && ticketRow.assigneeId !== ""
      ? String(ticketRow.assigneeId)
      : null;
  const draftAssigneeKey =
    draft.assignee != null && draft.assignee !== "" ? String(draft.assignee) : null;

  const assigneeChanged = draftAssigneeKey !== currentAssigneeKey;
  const statusChanged = Boolean(toStatusApi && fromStatusApi && toStatusApi !== fromStatusApi);
  const priorityChanged = Boolean(toPriorityApi && fromPriorityApi && toPriorityApi !== fromPriorityApi);

  if (assigneeChanged) {
    if (draftAssigneeKey) {
      const assigneeId = Number(draftAssigneeKey);
      const isFirstAssignFromNew = fromStatusApi === "NEW" && !currentAssigneeKey;
      if (isFirstAssignFromNew) {
        steps.push({
          kind: "action",
          action: "assign",
          body: { assigneeId },
          expected: buildExpectedProjection("assign", { assigneeId, status: "IN_PROGRESS" }),
        });
      } else {
        // JBPM ASSIGNED yalnizca NEW task'ta dinlenir; mevcut assignee degisimi senkron API ile yapilir.
        steps.push({ kind: "sync-assign", assigneeId });
      }
    } else {
      throw new Error(tm("ticketDetail.errors.unassignNotSupported"));
    }
  }

  const assignAlreadyMovesToInProgress =
    assigneeChanged &&
    Boolean(draftAssigneeKey) &&
    fromStatusApi === "NEW" &&
    toStatusApi === "IN_PROGRESS";

  if (statusChanged && !assignAlreadyMovesToInProgress) {
    if (toStatusApi === "CLOSED") {
      const closureReason = draft.closureReason || apiTicket?.closureReason;
      steps.push({
        kind: "action",
        action: "close",
        body: { closureReason },
        expected: buildExpectedProjection("close", { status: "CLOSED", closureReason }),
      });
    } else {
      let action = statusToAction(fromStatusApi, toStatusApi);
      if (!action && fromStatusApi === "NEW" && toStatusApi === "IN_PROGRESS") {
        const assigneeId = Number(draftAssigneeKey || currentAssigneeKey);
        if (!assigneeId || Number.isNaN(assigneeId)) {
          throw new Error(tm("ticketDetail.errors.assignBeforeProgress"));
        }
        action = "assign";
        steps.push({
          kind: "action",
          action: "assign",
          body: { assigneeId },
          expected: buildExpectedProjection("assign", { assigneeId, status: "IN_PROGRESS" }),
        });
      } else if (!action) {
        throw new Error(tm("ticketDetail.errors.unsupportedTransition", { from: fromStatusApi, to: toStatusApi }));
      } else if (action === "resolve") {
        const resolutionNote = String(draft.resolutionNote || "").trim();
        steps.push({
          kind: "action",
          action,
          body: { resolutionNote },
          expected: buildExpectedProjection(action, { status: toStatusApi }),
        });
      } else {
        steps.push({
          kind: "action",
          action,
          body: {},
          expected: buildExpectedProjection(action, { status: toStatusApi }),
        });
      }
    }
  }

  if (priorityChanged) {
    steps.push({
      kind: "action",
      action: "change-priority",
      body: { priority: toPriorityApi },
      expected: buildExpectedProjection("change-priority", { priority: toPriorityApi }),
    });
  }

  return steps;
}

function ManagerActions({
  ticket,
  draft,
  setDraft,
  onApply,
  saving,
  applyProgress,
  error,
  success,
  agents,
  agentsLoading,
  teams,
  productId,
  productName,
}) {
  const { t, i18n } = useTranslation("manager");
  const { t: tc } = useTranslation("common");
  const { t: tv } = useTranslation("validation");
  const translateGlobal = useCallback((key, opts) => i18n.t(key, opts), [i18n]);
  const [assigneeModalOpen, setAssigneeModalOpen] = useState(false);
  const statusOptions = useMemo(() => buildManagerDetailStatusOptions(tc), [tc]);
  const priorityOptions = useMemo(() => buildManagerDetailPriorityOptions(tc), [tc]);
  const closureOptions = useMemo(
    () => [{ value: "", label: t("ticketDetail.actions.selectReason") }, ...buildManagerClosureReasonOptions(MANAGER_FORCE_CLOSE_REASONS, translateGlobal)],
    [t, translateGlobal],
  );

  const catalog = useMemo(
    () => buildAssigneeCatalog(teams, agents, productId, productName),
    [teams, agents, productId, productName],
  );

  const selectedAssignee = useMemo(() => {
    if (!draft.assignee) return null;
    const id = Number(draft.assignee);
    const fromCatalog = [...catalog.teamRows, ...catalog.otherRows].find((r) => r.agentId === id);
    if (fromCatalog) return fromCatalog;
    const fromAgents = (Array.isArray(agents) ? agents : []).find((a) => Number(a.agentId) === id);
    if (fromAgents) {
      return {
        agentId: id,
        name: fromAgents.agentName ?? `Agent #${id}`,
        active: fromAgents.activeTicketCount ?? 0,
        max: fromAgents.maxTicketLimit ?? null,
        teamNames: [],
      };
    }
    return {
      agentId: id,
      name: ticket.assigneeName?.trim() || ticket.assignee || `Agent #${id}`,
      active: null,
      max: null,
      teamNames: [],
    };
  }, [draft.assignee, catalog, agents, ticket.assignee, ticket.assigneeName]);

  const assigneeDisplayName = selectedAssignee?.name
    ?? (ticket.assigneeId != null ? (ticket.assigneeName?.trim() || ticket.assignee || t("ticketDetail.assigned")) : t("ticketDetail.unassigned"));

  const currentAssigneeKey =
    ticket.assigneeId != null && ticket.assigneeId !== "" ? String(ticket.assigneeId) : "";
  const dirty = (
    draft.status !== ticket.status ||
    draft.priority !== ticket.priority ||
    (draft.assignee || "") !== currentAssigneeKey
  );

  const isTransitioningToClosed = draft.status === "Closed" && ticket.status !== "Closed";
  const isTransitioningToResolved = draft.status === "Resolved" && ticket.status !== "Resolved";
  const needsClosurePick = isTransitioningToClosed && !draft.closureReason;
  const needsResolutionNote =
    isTransitioningToResolved && !isResolutionNoteValid(draft.resolutionNote);

  return (
    <ManagerCard padding="p-5 md:p-6" tone="muted" topAccent={false}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-3 md:flex-1">
          <FieldSelect
            label={t("ticketDetail.actions.status")}
            value={draft.status}
            options={statusOptions}
            onChange={(v) => setDraft((d) => ({
              ...d,
              status: v,
              closureReason: v === "Closed" ? d.closureReason : null,
              resolutionNote: v === "Resolved" ? d.resolutionNote : null,
            }))}
          />
          <FieldSelect
            label={t("ticketDetail.actions.priority")}
            value={draft.priority}
            options={priorityOptions}
            onChange={(v) => setDraft((d) => ({ ...d, priority: v }))}
          />
          <AssigneeFieldTrigger
            label={t("ticketDetail.actions.assignee")}
            displayName={assigneeDisplayName}
            capacity={selectedAssignee?.max != null ? { active: selectedAssignee.active, max: selectedAssignee.max } : null}
            onOpen={() => setAssigneeModalOpen(true)}
            disabled={saving}
            loading={agentsLoading}
            isUnassigned={!draft.assignee && !ticket.assigneeId}
          />
        </div>
        <button
          type="button"
          onClick={onApply}
          disabled={!dirty || saving || needsClosurePick || needsResolutionNote}
          className={
            dirty && !saving && !needsClosurePick && !needsResolutionNote
              ? `${SAAS_BUTTON.primaryMd} shrink-0 tracking-tight`
              : "inline-flex h-10 shrink-0 cursor-not-allowed items-center justify-center rounded-xl bg-slate-100 px-4 text-sm font-semibold text-gray-400 opacity-70"
          }
        >
          {saving && applyProgress
            ? t("ticketDetail.actions.applying", { current: applyProgress.current, total: applyProgress.total })
            : saving
              ? t("ticketDetail.actions.saving")
              : t("ticketDetail.actions.applyChanges")}
        </button>
      </div>
      {isTransitioningToClosed ? (
        <div className="mt-4 max-w-md">
          <FieldSelect
            label={t("ticketDetail.actions.closureReason")}
            value={draft.closureReason || ""}
            options={closureOptions}
            onChange={(v) => setDraft((d) => ({ ...d, closureReason: v || null }))}
          />
        </div>
      ) : null}
      {isTransitioningToResolved ? (
        <div className="mt-4 max-w-xl">
          <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: MANAGER_COLORS.muted }}>
            {t("ticketDetail.actions.solutionSummary")}
            <span style={{ color: "#B42318" }}> *</span>
          </label>
          <textarea
            rows={4}
            value={draft.resolutionNote || ""}
            onChange={(e) => setDraft((d) => ({ ...d, resolutionNote: e.target.value }))}
            disabled={saving}
            placeholder={t("ticketDetail.actions.solutionPlaceholder")}
            className={`${MANAGER_FIELD_INPUT_CLASS} mt-1.5 resize-y`}
            style={{ color: MANAGER_COLORS.dark, boxShadow: MANAGER_CHROME.inputInset }}
          />
          <p className="mt-1.5 text-[11px]" style={{ color: MANAGER_COLORS.muted }}>
            {t("ticketDetail.actions.solutionHint", { min: RESOLUTION_NOTE_MIN_LENGTH })}
          </p>
        </div>
      ) : null}
      {error ? (
        <p className="mt-2 text-[11px] font-medium" style={{ color: "#B42318" }}>
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          className="mt-2 text-[11px] font-semibold"
          style={{ color: MANAGER_STATUS.safe.fg, backgroundColor: MANAGER_STATUS.safe.bg, padding: "6px 10px", borderRadius: "8px", display: "inline-block" }}
        >
          {t("ticketDetail.actions.changesSaved")}
        </p>
      ) : null}
      <p className="mt-3 text-[11px]" style={{ color: MANAGER_COLORS.muted }}>
        {t("ticketDetail.actions.hint")}
      </p>
      <AssigneePickerModal
        open={assigneeModalOpen}
        onClose={() => setAssigneeModalOpen(false)}
        value={draft.assignee || ""}
        onSelect={(v) => setDraft((d) => ({ ...d, assignee: v }))}
        teams={teams}
        agents={agents}
        productId={productId}
        productName={productName}
        ticketLabel={ticket.displayId || ticket.id}
      />
    </ManagerCard>
  );
}

/* ── Composer (internal note / customer reply) ───────────────────────── */
function getComposerModes(t) {
  return {
    internal: {
      id: "internal",
      label: t("ticketDetail.composer.internalNote"),
      icon: IconLockSm,
      placeholder: t("ticketDetail.composer.internalPlaceholder"),
      button: t("ticketDetail.composer.addInternalNote"),
      helper: t("ticketDetail.composer.internalHelper"),
      helperTone: { fg: "#92400e", bg: "rgba(245,158,11,0.12)" },
    },
    external: {
      id: "external",
      label: t("ticketDetail.composer.replyToCustomer"),
      icon: IconExternalSm,
      placeholder: t("ticketDetail.composer.externalPlaceholder"),
      button: t("ticketDetail.composer.sendCustomerReply"),
      helper: t("ticketDetail.composer.externalHelper"),
      helperTone: { fg: MANAGER_STATUS.atRisk.fg, bg: MANAGER_STATUS.atRisk.bg },
    },
  };
}

function ComposerModeSwitch({ modeId, onSelect, onActivate, modes, messageTypeAria }) {
  return (
    <div
      className="grid w-full min-w-0 grid-cols-2 gap-0.5 rounded-lg border border-slate-200 bg-slate-50/90 p-0.5 sm:w-auto"
      role="tablist"
      aria-label={messageTypeAria}
    >
      {Object.values(modes).map((mode) => {
        const Icon = mode.icon;
        const active = modeId === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              onSelect(mode.id);
              onActivate?.();
            }}
            className={[
              MANAGER_GHOST_BUTTON,
              "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold tracking-tight transition-colors duration-150 sm:px-3 sm:text-xs",
              active
                ? mode.id === "internal"
                  ? "bg-white text-amber-900 shadow-sm ring-1 ring-amber-200/80"
                  : "bg-white text-blue-900 shadow-sm ring-1 ring-blue-200/80"
                : "text-slate-600 hover:bg-white/80 hover:text-slate-900",
            ].join(" ")}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function hasMeaningfulComposerHtml(html) {
  return htmlToPlainText(DOMPurify.sanitize(html || "")).trim().length > 0;
}

function formatFileSize(bytes) {
  if (bytes == null || Number.isNaN(bytes)) return "—";
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function ManagerComposer({
  onSubmit,
  onActivate,
  saving = false,
  busyStep = "idle",
  error = null,
  className: composerClass = "",
  canUploadAttachment = false,
  existingServerAttachmentCount = 0,
  attachmentUploadError = null,
}) {
  const { t } = useTranslation("manager");
  const { t: tv } = useTranslation("validation");
  const composerModes = useMemo(() => getComposerModes(t), [t]);
  const [modeId, setModeId] = useState("internal");
  const [commentHtml, setCommentHtml] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const [attachError, setAttachError] = useState("");
  const fileInputRef = useRef(null);
  const {
    editorHeight,
    manualResize,
    minHeight,
    autoGrowMax,
    onEditorAutoHeight,
    onResizePointerDown,
    resetEditorHeight,
  } = useResizableComposerEditor();

  const mode = composerModes[modeId];
  const canSubmit = hasMeaningfulComposerHtml(commentHtml) || pendingFiles.length > 0;
  const isInternal = modeId === "internal";

  const onPickFiles = useCallback(
    (e) => {
      const incoming = Array.from(e.target?.files || []);
      if (e.target) e.target.value = "";
      if (!incoming.length) return;
      if (!canUploadAttachment) return;

      setAttachError("");
      setPendingFiles((prev) => {
        const { valid, errors } = validateTicketAttachments(incoming, {
          pendingFiles: prev,
          existingServerCount: existingServerAttachmentCount,
          t: tv,
        });
        if (errors.length > 0) {
          setAttachError(errors.join(" "));
        }
        if (valid.length === 0) return prev;
        const existing = new Set(prev.map((f) => `${f.name}\0${f.size}\0${f.lastModified}`));
        const appended = valid.filter((f) => !existing.has(`${f.name}\0${f.size}\0${f.lastModified}`));
        if (appended.length === 0 && errors.length === 0) {
          setAttachError(tv("attachments.duplicate"));
        }
        return [...prev, ...appended];
      });
    },
    [canUploadAttachment, existingServerAttachmentCount, tv],
  );

  const removePendingFile = useCallback((index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setAttachError("");
  }, []);

  const activateComposer = useCallback(() => {
    onActivate?.();
  }, [onActivate]);

  const handleResizePointerDown = useCallback((e) => {
    onResizePointerDown(e);
    activateComposer();
  }, [onResizePointerDown, activateComposer]);

  const submit = async () => {
    if (!canSubmit || saving) return;
    const html = DOMPurify.sanitize(commentHtml || "");
    const files = [...pendingFiles];
    try {
      const ok = await onSubmit({ internal: isInternal, body: html, files });
      if (ok !== false) {
        setCommentHtml("");
        setPendingFiles([]);
        setAttachError("");
        resetEditorHeight();
      }
    } catch (err) {
      console.error("[ManagerComposer] submit failed", err);
    }
  };

  const composerShellClass = isInternal
    ? "!rounded-b-none !shadow-none ring-1 ring-amber-200/80 focus-within:ring-2 focus-within:ring-amber-300/40"
    : "!rounded-b-none !shadow-none ring-1 ring-gray-200 focus-within:ring-2 focus-within:ring-blue-600/20";

  return (
    <div
      className={[
        "flex min-w-0 flex-col rounded-xl border p-3",
        isInternal ? "border-amber-200/60 bg-amber-50/20" : "border-gray-200 bg-white",
        composerClass,
      ].join(" ").trim()}
      onFocusCapture={activateComposer}
    >
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <ComposerModeSwitch
          modeId={modeId}
          onSelect={setModeId}
          onActivate={activateComposer}
          modes={composerModes}
          messageTypeAria={t("ticketDetail.composer.messageType")}
        />
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {isInternal ? t("ticketDetail.composer.teamOnly") : t("ticketDetail.composer.customerVisible")}
        </span>
      </div>

      <p
        className={[
          "mt-2 shrink-0 text-[11px] font-medium leading-snug",
          isInternal ? "text-amber-800/90" : "text-blue-800/90",
        ].join(" ")}
      >
        {mode.helper}
      </p>

      <div className="mt-2 min-w-0 shrink-0 overflow-hidden rounded-lg border border-slate-200/80 bg-white">
        <DestrovaComposer
          key={modeId}
          editorName="managerComment"
          editorValue={commentHtml}
          onEditorChange={(e) => setCommentHtml(e.target.value)}
          editorPlaceholder={mode.placeholder}
          disabled={saving}
          className={composerShellClass}
          editorBodyHeightPx={editorHeight}
          editorAutoGrow={!manualResize}
          editorAutoGrowMinPx={minHeight}
          editorAutoGrowMaxPx={autoGrowMax}
          onEditorAutoHeight={onEditorAutoHeight}
        />
        <ComposerResizeHandle onPointerDown={handleResizePointerDown} />
      </div>

      {pendingFiles.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label={t("ticketDetail.composer.pendingAttachments")}>
          {pendingFiles.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-gray-200 bg-white py-1 pl-2.5 pr-1 text-[11px] font-semibold text-gray-900 shadow-sm"
            >
              <span className="min-w-0 truncate" title={file.name}>{file.name}</span>
              <span className="shrink-0 tabular-nums text-slate-500">
                {formatFileSize(file.size)}
              </span>
              <button
                type="button"
                onClick={() => removePendingFile(index)}
                disabled={saving}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold leading-none text-gray-600 transition-colors duration-150 hover:bg-slate-200 disabled:opacity-40"
                aria-label={t("ticketDetail.composer.removeFile", { name: file.name })}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-2.5 flex shrink-0 flex-col gap-2 border-t border-gray-100 pt-2.5">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ATTACHMENT_POLICY.acceptInput}
          className="hidden"
          disabled={saving || !canUploadAttachment}
          onChange={onPickFiles}
        />
        <div className="flex min-w-0 items-center justify-between gap-2">
          {canUploadAttachment ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-[11px] font-semibold text-gray-600 transition-colors duration-150 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-75"
            >
              <IconPaperclip className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              {t("ticketDetail.composer.attach")}
            </button>
          ) : (
            <span className="min-w-0 flex-1" />
          )}
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || saving}
            className={[
              "ml-auto inline-flex h-8 shrink-0 items-center justify-center rounded-lg px-3.5 text-xs font-semibold tracking-tight transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:px-4 sm:text-sm",
              canSubmit && !saving
                ? isInternal
                  ? "bg-amber-700 text-white shadow-sm hover:bg-amber-800 focus-visible:ring-amber-500/35"
                  : "bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus-visible:ring-blue-500/35"
                : isInternal
                  ? "cursor-not-allowed border border-amber-300 bg-amber-100 text-amber-900"
                  : "cursor-not-allowed border border-blue-300 bg-blue-100 text-blue-900",
            ].join(" ")}
          >
            {saving
              ? (busyStep === "uploading" ? t("ticketDetail.composer.uploading") : t("ticketDetail.composer.sending"))
              : mode.button}
          </button>
        </div>
        {error ? (
          <p className="text-[11px] font-medium leading-snug text-rose-700">{error}</p>
        ) : null}
        {attachError ? (
          <p className="text-[11px] font-medium leading-snug text-rose-700" role="alert">
            {attachError}
          </p>
        ) : null}
        {attachmentUploadError ? (
          <p className="text-[11px] font-medium leading-snug text-rose-700" role="alert">
            {attachmentUploadError}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function formatApiDetailAt(iso, lang) {
  return formatManagerTicketDetailAt(iso, lang);
}

/** Timeline + worklog rail from API ticket; attachments left empty until API exposes them. */
function buildApiDetail(ticket, lang, tm) {
  const comments = Array.isArray(ticket.comments) ? ticket.comments : [];
  const worklogs = Array.isArray(ticket.worklogs) ? ticket.worklogs : [];

  const fromComments = comments.map((comment) => {
    const at = formatApiDetailAt(comment.createdAt, lang);
    const authorType = String(comment.authorType || "").toUpperCase();
    let type;
    let meta;
    let internal = false;
    if (authorType === "USER") {
      type = "customer_reply";
      meta = null;
    } else if (authorType === "AGENT") {
      internal = Boolean(comment.isInternal);
      if (internal) {
        type = "internal_note";
        meta = null;
      } else {
        type = "agent_reply";
        meta = null;
      }
    } else if (authorType === "SYSTEM") {
      type = classifyManagerSystemCommentType(comment.message);
      meta = null;
    } else {
      type = "agent_reply";
      meta = null;
    }
    return {
      type,
      at,
      title: comment.authorName || tm("ticketDetail.system"),
      body: comment.message,
      meta,
      internal,
      _ts: Date.parse(comment.createdAt) || 0,
    };
  });

  const fromWorklogs = worklogs.map((w) => {
    const durationMinutes = w.durationMinutes ?? 0;
    return {
      type: "worklog",
      at: formatApiDetailAt(w.workDate, lang),
      title: w.agentName || `Agent #${w.agentId}`,
      body: w.description,
      meta: tm("ticketDetail.timeline.worklogMeta", { minutes: durationMinutes }),
      internal: true,
      _ts: Date.parse(w.workDate) || 0,
    };
  });

  const merged = dedupeSystemTimelineEvents(
    [...fromComments, ...fromWorklogs].sort((a, b) => a._ts - b._ts),
  );

  const timeline = merged.map(({ _ts, ...rest }) => rest);

  return {
    timeline,
    attachments: [],
    worklog: worklogs.map((w) => ({
      at: formatApiDetailAt(w.workDate, lang),
      agent: w.agentName || `Agent #${w.agentId}`,
      duration: `${w.durationMinutes ?? 0}m`,
      note: w.description,
    })),
  };
}

/* ── View ────────────────────────────────────────────────────────────── */
export default function ManagerTicketDetailView({ ticketId }) {
  const { t, i18n } = useTranslation("manager");
  const { t: tc } = useTranslation("common");
  const { closeTicket } = useManagerWorkspace();
  const { keycloak } = useKeycloak();
  const [apiTicket, setApiTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentUploadError, setAttachmentUploadError] = useState(null);
  const [attachmentListError, setAttachmentListError] = useState(null);
  const [composerBusyStep, setComposerBusyStep] = useState("idle");
  const [downloadUi, setDownloadUi] = useState({ id: null, status: "idle" });
  const [deletingAttachmentId, setDeletingAttachmentId] = useState(null);
  const [activityLogOnly, setActivityLogOnly] = useState(false);

  useEffect(() => {
    setActivityLogOnly(false);
    setAttachmentUploadError(null);
  }, [ticketId]);

  const fetchTicketDetail = useCallback(async () => {
    const cleanId = String(ticketId || "").replace(/^#/, "");
    if (!/^\d+$/.test(cleanId)) {
      return { data: null, error: null, invalidId: true };
    }
    try {
      const data = await getTicketById(cleanId);
      return { data, error: null, invalidId: false };
    } catch (err) {
      return { data: null, error: err, invalidId: false };
    }
  }, [ticketId]);

  const reloadTicket = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setApiTicket(null);
    const { data, error, invalidId } = await fetchTicketDetail();
    if (invalidId) {
      setApiTicket(null);
      setLoadError(null);
    } else if (error) {
      setApiTicket(null);
      setLoadError(error);
    } else {
      setApiTicket(data);
      setLoadError(null);
    }
    setLoading(false);
  }, [fetchTicketDetail]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setApiTicket(null);
    setLoadError(null);

    (async () => {
      const { data, error, invalidId } = await fetchTicketDetail();
      if (cancelled) return;
      if (invalidId) {
        setApiTicket(null);
        setLoadError(null);
      } else if (error) {
        setApiTicket(null);
        setLoadError(error);
      } else {
        setApiTicket(data);
        setLoadError(null);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [ticketId, fetchTicketDetail]);

  const ticket = useMemo(() => {
    if (apiTicket) return normalizeTicketForManagerTable(apiTicket);
    return null;
  }, [apiTicket]);

  const detail = useMemo(() => {
    if (apiTicket) return buildApiDetail(apiTicket, i18n.language, t);
    return { timeline: [], attachments: [], worklog: [] };
  }, [apiTicket, i18n.language, t]);

  const involvedPeople = useMemo(() => listInvolvedMentionPeopleFromTicket(apiTicket), [apiTicket]);

  const sanitizedTicketId = useMemo(
    () => String(ticketId || "").replace(/^#/, ""),
    [ticketId],
  );

  const ownUploadedCount = useMemo(
    () => countOwnServerAttachments(attachments, keycloak?.tokenParsed?.sub),
    [attachments, keycloak?.tokenParsed?.sub],
  );

  const formatUploadOrDeleteErr = useCallback((err) => {
    const d = err?.response?.data;
    if (d == null) return err?.message || t("ticketDetail.errors.requestFailed");
    if (typeof d === "string") return d;
    if (typeof d === "object" && d != null && d.message) return String(d.message);
    try {
      return JSON.stringify(d);
    } catch {
      return t("ticketDetail.errors.requestFailed");
    }
  }, [t]);

  const loadAttachments = useCallback(async () => {
    if (!/^\d+$/.test(sanitizedTicketId)) return;
    setAttachmentsLoading(true);
    setAttachmentListError(null);
    try {
      const data = await getAttachments(sanitizedTicketId);
      setAttachments(Array.isArray(data) ? data : []);
    } catch (e) {
      setAttachments([]);
      setAttachmentListError(formatUploadOrDeleteErr(e));
    } finally {
      setAttachmentsLoading(false);
    }
  }, [sanitizedTicketId, formatUploadOrDeleteErr]);

  useEffect(() => {
    if (!apiTicket) return;
    if (!/^\d+$/.test(sanitizedTicketId)) return;
    loadAttachments();
  }, [apiTicket, sanitizedTicketId, loadAttachments]);

  const [draft, setDraft] = useState({
    status: null,
    priority: null,
    assignee: null,
    closureReason: null,
    resolutionNote: null,
  });
  const [saving, setSaving] = useState(false);
  const [applyProgress, setApplyProgress] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [agents, setAgents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [agentsLoading, setAgentsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAgentsLoading(true);
    Promise.all([getAgentCapacities(), getTeams()])
      .then(([agentsData, teamsData]) => {
        if (cancelled) return;
        setAgents(Array.isArray(agentsData) ? agentsData : []);
        setTeams(Array.isArray(teamsData) ? teamsData : []);
      })
      .catch(() => {
        if (!cancelled) {
          setAgents([]);
          setTeams([]);
        }
      })
      .finally(() => {
        if (!cancelled) setAgentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!saveSuccess) return;
    const t = window.setTimeout(() => setSaveSuccess(false), 2000);
    return () => window.clearTimeout(t);
  }, [saveSuccess]);

  useEffect(() => {
    if (!ticket) return;
    setDraft({
      status: ticket.status,
      priority: ticket.priority,
      assignee:
        ticket.assigneeId != null && ticket.assigneeId !== ""
          ? String(ticket.assigneeId)
          : null,
      closureReason: null,
      resolutionNote: null,
    });
  }, [ticket]);

  const runActionWithPoll = useCallback(async (ticketId, action, body, expectedProjection) => {
    const accepted = await executeTicketAction(ticketId, action, body);
    const expected =
      expectedProjection ??
      accepted?.expectedProjection ??
      buildExpectedProjection(action, body ?? {});
    return waitForTicketProjection(ticketId, expected, accepted?.poll, () => getTicketById(ticketId));
  }, []);

  const handleApplyChanges = async () => {
    setSaveSuccess(false);
    if (!apiTicket || !ticket) {
      setSaveError(t("ticketDetail.errors.serverOnlySave"));
      return;
    }
    const id = String(ticket.rawId ?? ticket.id).replace(/^#/, "");
    if (!/^\d+$/.test(id)) {
      setSaveError(t("ticketDetail.errors.invalidTicketId"));
      return;
    }
    const transitioningToClosed = draft.status === "Closed" && ticket.status !== "Closed";
    if (transitioningToClosed && !draft.closureReason) {
      setSaveError(t("ticketDetail.errors.closureRequired"));
      return;
    }
    const transitioningToResolved = draft.status === "Resolved" && ticket.status !== "Resolved";
    if (transitioningToResolved && !isResolutionNoteValid(draft.resolutionNote)) {
      setSaveError(tv("resolution.required", { min: RESOLUTION_NOTE_MIN_LENGTH }));
      return;
    }
    if (!STATUS_TO_API[draft.status] || !PRIORITY_TO_API[draft.priority]) {
      setSaveError(t("ticketDetail.errors.invalidSelection"));
      return;
    }

    let steps;
    try {
      steps = buildManagerApplySteps(ticket, apiTicket, draft, t);
    } catch (e) {
      setSaveError(e?.message || t("ticketDetail.errors.invalidChanges"));
      return;
    }
    if (steps.length === 0) return;

    setSaving(true);
    setSaveError(null);
    setApplyProgress({ current: 0, total: steps.length });
    try {
      let latest = apiTicket;
      for (let i = 0; i < steps.length; i += 1) {
        setApplyProgress({ current: i + 1, total: steps.length });
        const step = steps[i];
        if (step.kind === "sync-assign") {
          latest = await assignTicket(id, step.assigneeId);
          setApiTicket(latest);
        } else {
          const { action, body, expected } = step;
          latest = await runActionWithPoll(id, action, body, expected);
          setApiTicket(latest);
        }
      }
      setSaveSuccess(true);
    } catch (e) {
      if (e instanceof ProjectionTimeoutError) {
        setSaveError(t("ticketDetail.errors.syncPending"));
        const fresh = await fetchTicketDetail();
        if (fresh != null) setApiTicket(fresh);
      } else {
        setSaveError(
          formatApiErrorWithCapacityHint(
            e,
            e?.message || t("ticketDetail.errors.saveFailed"),
            "manager",
            getDestrovaApiErrorMessage,
          ),
        );
        const fresh = await fetchTicketDetail();
        if (fresh != null) setApiTicket(fresh);
      }
    } finally {
      setSaving(false);
      setApplyProgress(null);
    }
  };

  const [composerSaving, setComposerSaving] = useState(false);
  const [composerError, setComposerError] = useState(null);

  const handleComposerSubmit = async ({ internal, body, files = [] }) => {
    if (!apiTicket) {
      setComposerError(t("ticketDetail.errors.commentServerOnly"));
      return false;
    }

    const id = String(ticket?.rawId ?? ticket?.id ?? ticketId).replace(/^#/, "");
    if (!/^\d+$/.test(id)) {
      setComposerError(t("ticketDetail.errors.invalidTicketId"));
      return false;
    }

    const filesSnapshot = Array.isArray(files) ? [...files] : [];
    const hasBody = hasMeaningfulComposerHtml(body);

    if (!hasBody && filesSnapshot.length === 0) {
      setComposerError(t("ticketDetail.errors.commentOrAttachmentRequired"));
      return false;
    }

    setComposerSaving(true);
    setComposerError(null);
    setAttachmentUploadError(null);
    setComposerBusyStep("sending");

    if (hasBody) {
      try {
        await addComment(id, {
          message: body,
          isInternal: Boolean(internal),
        });
      } catch (e) {
        const msg = e?.response?.data?.message ?? e?.message ?? t("ticketDetail.errors.commentSaveFailed");
        setComposerError(typeof msg === "string" ? msg : t("ticketDetail.errors.commentSaveFailed"));
        setComposerBusyStep("idle");
        setComposerSaving(false);
        return false;
      }
    }

    try {
      if (filesSnapshot.length > 0) {
        setComposerBusyStep("uploading");
        let fail = 0;
        const uploadFailures = [];
        for (const file of filesSnapshot) {
          try {
            await uploadAttachment(id, file, () => {}, { internal: Boolean(internal) });
          } catch (uploadError) {
            fail += 1;
            uploadFailures.push({ fileName: file.name, error: uploadError });
          }
        }
        if (fail > 0) {
          const failureDetails = formatAttachmentUploadFailures(uploadFailures);
          const uploaded = filesSnapshot.length - fail;
          setAttachmentUploadError(
            fail === filesSnapshot.length
              ? t("ticketDetail.errors.attachmentsUploadAllFailed", { details: failureDetails })
              : t("ticketDetail.errors.attachmentsUploadPartial", {
                  uploaded,
                  failed: fail,
                  details: failureDetails,
                }),
          );
        }
      }
      const fresh = await fetchTicketDetail();
      if (fresh != null) {
        setApiTicket(fresh);
      }
      await loadAttachments();
      return true;
    } catch (e) {
      setAttachmentUploadError(formatUploadOrDeleteErr(e));
      return false;
    } finally {
      setComposerBusyStep("idle");
      setComposerSaving(false);
    }
  };

  const canUseAttachmentApi = Boolean(apiTicket && /^\d+$/.test(sanitizedTicketId));

  const handleDeleteRailAttachment = useCallback(
    async (att) => {
      if (!/^\d+$/.test(sanitizedTicketId)) return;
      if (!window.confirm(t("ticketDetail.errors.deleteAttachmentConfirm"))) return;
      setAttachmentListError(null);
      setDeletingAttachmentId(att.id);
      try {
        await deleteAttachment(sanitizedTicketId, att.id);
        await loadAttachments();
      } catch (e) {
        setAttachmentListError(formatUploadOrDeleteErr(e));
      } finally {
        setDeletingAttachmentId(null);
      }
    },
    [sanitizedTicketId, loadAttachments, formatUploadOrDeleteErr, t],
  );

  const handleDownloadAttachment = useCallback(
    async (att, fileName) => {
      if (!/^\d+$/.test(sanitizedTicketId)) return;
      setDownloadUi({ id: att.id, status: "downloading" });
      try {
        await downloadAttachment(sanitizedTicketId, att.id, fileName);
        setDownloadUi({ id: att.id, status: "downloaded" });
        window.setTimeout(() => {
          setDownloadUi((prev) =>
            prev.id === att.id && prev.status === "downloaded"
              ? { id: null, status: "idle" }
              : prev,
          );
        }, 1800);
      } catch {
        setDownloadUi({ id: null, status: "idle" });
      }
    },
    [sanitizedTicketId],
  );

  const timeline = useMemo(
    () => detail?.timeline || [],
    [detail],
  );

  const activityTimeline = useMemo(
    () => timeline.filter(isManagerActivityEntry),
    [timeline],
  );

  const visibleTimeline = useMemo(
    () => (activityLogOnly ? activityTimeline : timeline),
    [activityLogOnly, activityTimeline, timeline],
  );

  const timelineScrollRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  const scrollTimelineToLatest = useCallback(() => {
    const el = timelineScrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(() => {
    scrollTimelineToLatest();
  }, [visibleTimeline.length, activityLogOnly, scrollTimelineToLatest]);

  if (loading) {
    return (
      <ManagerSurface eyebrow={t("ticketDetail.eyebrow")} title={t("ticketDetail.loading")}>
        <DestrovaTicketDetailSkeleton />
      </ManagerSurface>
    );
  }

  if (loadError) {
    return (
      <ManagerSurface eyebrow={t("ticketDetail.eyebrow")} title={t("ticketDetail.title")}>
        <DataLoadErrorPanel
          message={t("ticketDetail.loadFailed")}
          error={loadError}
          onRetry={reloadTicket}
        />
      </ManagerSurface>
    );
  }

  if (!ticket) {
    return (
      <ManagerSurface eyebrow={t("ticketDetail.notFound.eyebrow")} title={t("ticketDetail.notFound.title")}>
        <ManagerCard padding="p-6">
          <p className="text-sm" style={{ color: MANAGER_COLORS.support }}>
            {t("ticketDetail.notFound.body")}
          </p>
          <button
            type="button"
            onClick={closeTicket}
            className={`mt-4 gap-1.5 rounded-full px-3 py-1.5 ${SAAS_BUTTON.primarySm}`}
          >
            <IconArrow className="h-3.5 w-3.5" />
            {t("ticketDetail.notFound.back")}
          </button>
        </ManagerCard>
      </ManagerSurface>
    );
  }

  return (
    <ManagerSurface
      eyebrow={null}
      title={null}
      description={null}
    >
      <DetailHeader ticket={ticket} onBack={closeTicket} />

      <ManagerActions
        ticket={ticket}
        draft={draft}
        setDraft={setDraft}
        onApply={handleApplyChanges}
        saving={saving}
        applyProgress={applyProgress}
        error={saveError}
        success={saveSuccess}
        agents={agents}
        agentsLoading={agentsLoading}
        teams={teams}
        productId={apiTicket?.product?.id ?? null}
        productName={ticket.product ?? apiTicket?.product?.name ?? null}
      />

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: timeline + composer docked to card bottom (scroll is timeline only) */}
        <ManagerCard
          className="flex h-full min-h-[16rem] flex-col self-stretch border border-gray-200 bg-white lg:col-span-8 lg:max-h-[min(88vh,56rem)] !overflow-visible"
          padding="p-0"
          tone="default"
          elevated
        >
          <header className="shrink-0 border-b border-gray-100 bg-slate-50/80">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 md:px-6">
              <p className="shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {t("ticketDetail.timeline.title")}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <ConversationActivityFilterButton
                  active={activityLogOnly}
                  onToggle={() => setActivityLogOnly((v) => !v)}
                  activityCount={activityTimeline.length}
                  label={t("ticketDetail.timeline.activityLog")}
                  titleActive={t("ticketDetail.timeline.showFullConversation")}
                  titleInactive={t("ticketDetail.timeline.showActivityOnly")}
                />
                <span className="text-[10.5px] font-semibold tabular-nums text-slate-500">
                  {visibleTimeline.length}{" "}
                  {activityLogOnly
                    ? t("ticketDetail.timeline.activity", { count: visibleTimeline.length })
                    : t("ticketDetail.timeline.entry", { count: visibleTimeline.length })}
                </span>
              </div>
            </div>
          </header>
          <div
            ref={timelineScrollRef}
            className="timeline-scroll-area relative min-h-[min(38vh,22rem)] max-h-[min(50vh,26rem)] min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain scroll-smooth px-4 py-4 md:px-6 md:py-4"
          >
            <div
              className="pointer-events-none absolute bottom-2 left-[calc(1rem+0.875rem)] top-2 w-px -translate-x-1/2 bg-slate-200 md:left-[calc(1.25rem+0.875rem)]"
              aria-hidden
            />
            <div className="relative space-y-2.5">
              {visibleTimeline.length > 0 ? (
                visibleTimeline.map((entry, i) => (
                  <TimelineEntry key={`${entry.type}-${entry.at}-${i}`} entry={entry} />
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-slate-700">{t("ticketDetail.timeline.noActivity")}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {t("ticketDetail.timeline.noActivityDesc")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActivityLogOnly(false)}
                    className={`${MANAGER_GHOST_BUTTON} mt-3 text-xs font-semibold text-blue-700 hover:text-blue-800`}
                  >
                    {t("ticketDetail.timeline.showFullConversationBtn")}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div
            className="relative z-[1] shrink-0 border-t border-gray-100 bg-gradient-to-b from-white to-slate-50/80 px-3 pb-4 pt-3 md:px-5 md:pb-5"
          >
            <ManagerComposer
              key={sanitizedTicketId}
              onSubmit={handleComposerSubmit}
              onActivate={scrollTimelineToLatest}
              saving={composerSaving}
              busyStep={composerBusyStep}
              error={composerError}
              canUploadAttachment={canUseAttachmentApi}
              existingServerAttachmentCount={ownUploadedCount}
              attachmentUploadError={attachmentUploadError}
              className="!mt-0 shadow-[0_-4px_16px_rgba(15,23,42,0.04)]"
            />
          </div>
        </ManagerCard>

        {/* Right rail */}
        <div className="grid gap-6 lg:col-span-4">
          <ManagerCard padding="p-6" tone="default" className="border border-gray-200 bg-white">
            <ManagerCardHeader title={t("ticketDetail.context.title")} hint={t("ticketDetail.context.hint")} />
            <dl className="mt-4 grid grid-cols-1 gap-4 text-sm">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>{t("ticketDetail.context.customer")}</dt>
                <dd className="mt-1 font-semibold" style={{ color: MANAGER_COLORS.dark }}>{ticket.customer}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>{t("ticketDetail.context.assignee")}</dt>
                <dd className="mt-1" style={{ color: MANAGER_COLORS.dark }}>{ticket.assigneeName || ticket.assignee || t("ticketDetail.unassigned")}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>{t("ticketDetail.context.product")}</dt>
                <dd className="mt-1" style={{ color: MANAGER_COLORS.dark }}>{ticket.product}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>{t("ticketDetail.context.requester")}</dt>
                <dd className="mt-1" style={{ color: MANAGER_COLORS.dark }}>{ticket.creatorName?.trim() || ticket.requester || "—"}</dd>
                <dd className="text-xs" style={{ color: MANAGER_COLORS.support }}>{ticket.customerEmail?.trim() ? ticket.customerEmail : t("ticketDetail.context.noEmail")}</dd>
              </div>
            </dl>
            {ticket.status === "Closed" && ticket.closureReason != null && ticket.closureReason !== "" ? (
              <div
                className="mt-4 rounded-lg border border-gray-200 bg-slate-50 px-3 py-2.5"
                style={{ color: MANAGER_COLORS.support }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>{t("ticketDetail.context.closureReason")}</p>
                <p className="mt-0.5 text-sm font-semibold" style={{ color: MANAGER_COLORS.dark }}>{formatClosureReasonForDisplay(ticket.closureReason, (key) => i18n.t(key))}</p>
              </div>
            ) : null}
            {involvedPeople.length > 0 ? (
              <div
                className="mt-4 border-t border-gray-200 pt-4"
              >
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: MANAGER_COLORS.muted }}
                >
                  {t("ticketDetail.context.involved")}
                </p>
                <ul className="mt-2 flex flex-col gap-2">
                  {involvedPeople.map((p) => (
                    <li
                      key={p.email}
                      className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2"
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-gray-800"
                      >
                        {(() => {
                          const s = String(p.displayName || "").trim();
                          if (!s) return "?";
                          const parts = s.split(/\s+/).filter(Boolean);
                          if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
                          return s.slice(0, 2).toUpperCase();
                        })()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold" style={{ color: MANAGER_COLORS.dark }}>
                          {p.displayName}
                        </p>
                        <p className="truncate text-xs" style={{ color: MANAGER_COLORS.support }}>{p.email}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </ManagerCard>
          <ManagerCard padding="p-6" tone="neutral" className="border border-gray-200 bg-white">
          <ManagerCardHeader
            title={t("ticketDetail.attachments.title")}
            hint={
              attachmentsLoading
                ? t("ticketDetail.attachments.loadingHint")
                : t("ticketDetail.attachments.fileCount", { count: attachments.length })
            }
          />
          {attachmentListError ? (
            <p className="mt-2 text-xs font-medium leading-snug" style={{ color: "#B42318" }} role="alert">
              {attachmentListError}
            </p>
          ) : null}

          {attachments.length === 0 ? (
            <p className="mt-4 text-sm" style={{ color: MANAGER_COLORS.muted }}>
              {attachmentsLoading ? t("ticketDetail.attachments.loading") : t("ticketDetail.attachments.empty")}
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {attachments.map((att) => {
                const fileName = att.fileName || t("ticketDetail.attachments.defaultFileName");
                const sizeKb = att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : "—";
                const uploadedAt = att.uploadedAt
                  ? new Date(att.uploadedAt).toLocaleString(i18n.language?.startsWith("tr") ? "tr-TR" : undefined)
                  : "—";
                const isRowDl = downloadUi.id === att.id;
                const downloadLabel =
                  isRowDl && downloadUi.status === "downloading"
                    ? t("ticketDetail.attachments.downloading")
                    : isRowDl && downloadUi.status === "downloaded"
                      ? t("ticketDetail.attachments.downloaded")
                      : t("ticketDetail.attachments.download");

                return (
                  <li
                    key={att.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-slate-50 px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <IconPaperclip
                        className="h-4 w-4 shrink-0"
                        style={{ color: MANAGER_COLORS.support }}
                      />
                      <div className="min-w-0">
                        <p
                          className="truncate text-sm font-semibold"
                          style={{ color: MANAGER_COLORS.dark }}
                        >
                          {fileName}
                          {att.isInternal ? (
                            <span className="ml-1.5 inline-flex rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                              {t("ticketDetail.timeline.badges.internal")}
                            </span>
                          ) : null}
                        </p>
                        <p
                          className="truncate text-[11px]"
                          style={{ color: MANAGER_COLORS.muted }}
                        >
                          {sizeKb} · {uploadedAt}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(att, fileName)}
                        title={t("ticketDetail.attachments.downloadTitle", { name: fileName })}
                        disabled={isRowDl && downloadUi.status === "downloading"}
                        className={`min-w-[6.5rem] shrink-0 gap-1.5 px-2.5 ${SAAS_BUTTON.primarySm} disabled:cursor-wait disabled:opacity-70`}
                      >
                        <IconDownload className="h-4 w-4" />
                        {downloadLabel}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRailAttachment(att)}
                        disabled={deletingAttachmentId === att.id}
                        className="appearance-none inline-flex h-8 min-w-[4.5rem] shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 shadow-none outline-none transition-colors duration-150 hover:bg-slate-50 disabled:opacity-50"
                        title={t("ticketDetail.attachments.deleteTitle", { name: fileName })}
                      >
                        {deletingAttachmentId === att.id ? "…" : t("ticketDetail.attachments.delete")}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          </ManagerCard>

          <ManagerCard padding="p-6" tone="default" className="border border-gray-200 bg-white">
            <ManagerCardHeader title={t("ticketDetail.worklog.title")} hint={t("ticketDetail.worklog.hint")} />
            {detail.worklog.length === 0 ? (
              <p className="mt-4 text-sm" style={{ color: MANAGER_COLORS.muted }}>{t("ticketDetail.worklog.empty")}</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {detail.worklog.map((w, i) => (
                  <li key={i} className="text-sm">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-semibold" style={{ color: MANAGER_COLORS.dark }}>{w.agent}</p>
                      <span className="text-[11px] tabular-nums" style={{ color: MANAGER_COLORS.muted }}>{w.duration}</span>
                    </div>
                    <p className="mt-1" style={{ color: MANAGER_COLORS.support }}>{w.note}</p>
                    <p className="mt-1 text-[11px]" style={{ color: MANAGER_COLORS.muted }}>{w.at}</p>
                  </li>
                ))}
              </ul>
            )}
          </ManagerCard>
        </div>
      </section>
    </ManagerSurface>
  );
}
