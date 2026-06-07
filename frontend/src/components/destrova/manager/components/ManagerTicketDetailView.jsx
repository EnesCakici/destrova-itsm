import { Children, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import {
  MANAGER_TICKETS,
  getManagerTicketDetail,
} from "../data/managerMock";
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
  formatClosureReason,
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

function formatClosureReasonForDisplay(raw) {
  if (raw == null || raw === "") return null;
  const formatted = formatClosureReason(raw);
  return formatted || null;
}

/* ── Conversation thread (customer enterprise SaaS pattern, manager roles) ─ */
function timelineKindLabel(entry) {
  const t = entry.type;
  if (t === "worklog") return "Worklog";
  if (t === "status_change") return "Status";
  if (t === "customer_reply") return "Customer";
  if (t === "internal_note") return "Internal";
  if (t === "agent_reply") return "Agent";
  if (t === "sla_warning") return "SLA";
  if (t === "assignment") return "Assignment";
  return "Activity";
}

function initialsFromName(name) {
  const s = String(name || "").trim();
  if (!s || s.toLowerCase() === "system") return "S";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const MANAGER_COMPACT_SYSTEM_TYPES = new Set(["status_change", "assignment", "sla_warning"]);

function managerTimelineAccent(type) {
  if (type === "sla_warning") return MANAGER_STATUS.atRisk.fg;
  if (type === "assignment") return "#64748B";
  return MANAGER_COLORS.primary;
}

function shouldShowTimelineMeta(entry) {
  if (!entry.meta || entry.type === "worklog") return false;
  const badgeLabel = managerMessageVisuals(entry).badge.label;
  const meta = String(entry.meta).trim();
  if (meta === badgeLabel) return false;
  if (meta === "Internal note" && badgeLabel === "Internal") return false;
  if (meta === "Public reply" && badgeLabel === "Public reply") return false;
  if (meta === "External" && badgeLabel === "Customer") return false;
  return true;
}

function managerMessageVisuals(entry) {
  switch (entry.type) {
    case "customer_reply":
      return {
        rowBg: "bg-sky-50/30",
        avatar: "bg-sky-100 text-sky-800 ring-sky-200/90",
        name: "text-sky-900",
        badge: { label: "Customer", className: "bg-sky-100 text-sky-800 ring-sky-200/80" },
        bubble: "border-sky-500 ring-sky-200/45 text-slate-800",
      };
    case "agent_reply":
      return {
        rowBg: "bg-blue-50/25",
        avatar: "bg-blue-600 text-white ring-blue-200/60",
        name: "text-blue-900",
        badge: { label: "Public reply", className: "bg-blue-100 text-blue-800 ring-blue-200/80" },
        bubble: "border-blue-600 ring-blue-200/40 text-slate-800",
      };
    case "internal_note":
      return {
        rowBg: "bg-amber-50/30",
        avatar: "bg-amber-100 text-amber-900 ring-amber-200/90",
        name: "text-amber-900",
        badge: { label: "Internal", className: "bg-amber-100 text-amber-900 ring-amber-200/80" },
        bubble: "border-amber-500 ring-amber-200/45 text-slate-800",
      };
    case "worklog":
      return {
        rowBg: "bg-slate-50/60",
        avatar: "bg-slate-200 text-slate-700 ring-slate-300/80",
        name: "text-slate-800",
        badge: { label: "Worklog", className: "bg-slate-100 text-slate-700 ring-slate-200/80" },
        bubble: "border-slate-400 ring-slate-200/45 text-slate-800",
      };
    default:
      return {
        rowBg: "bg-slate-50/40",
        avatar: "bg-slate-200 text-slate-700 ring-slate-300/80",
        name: "text-slate-800",
        badge: { label: timelineKindLabel(entry), className: "bg-slate-100 text-slate-700 ring-slate-200/80" },
        bubble: "border-slate-400 ring-slate-200/45 text-slate-800",
      };
  }
}

function TimelineEntry({ entry }) {
  const kind = timelineKindLabel(entry);

  if (MANAGER_COMPACT_SYSTEM_TYPES.has(entry.type)) {
    const accent = managerTimelineAccent(entry.type);
    const message = entry.body || entry.title || "";
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
          <span className="font-semibold" style={{ color: accent }}>{kind}</span>
          <span className="text-slate-500"> · </span>
          <span>{message}</span>
          <span className="ml-1 whitespace-nowrap text-[10px] font-medium text-slate-500" title={entry.at}>
            · {entry.at}
          </span>
        </p>
      </div>
    );
  }

  const visuals = managerMessageVisuals(entry);
  const displayName = entry.title || "Unknown";

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
              {entry.meta}
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
          <p className="mt-1.5 text-[10.5px] font-medium text-slate-500">{entry.meta}</p>
        ) : null}
      </div>
    </article>
  );
}

/* ── Header ──────────────────────────────────────────────────────────── */
function DetailHeader({ ticket, onBack }) {
  return (
    <header className="mb-6 flex flex-col gap-3 md:mb-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-tight text-slate-500 transition-[background-color,color] duration-150 hover:bg-slate-100 hover:text-slate-800"
      >
        <IconArrow className="h-3.5 w-3.5" />
        Back
      </button>
      <div className={MANAGER_PAGE.pageHeaderStrip}>
        <TicketContextBar portal="manager">
          <p className="font-mono text-[11px] font-semibold tracking-tight text-slate-500">
            {ticket.displayId || ticket.id}
          </p>
          <ManagerStatusPill kind={priorityKind(ticket.priority)}>{ticket.priority}</ManagerStatusPill>
          <ManagerStatusPill kind={ticket.sla.state}>{ticket.sla.label} · {ticket.sla.due}</ManagerStatusPill>
        </TicketContextBar>
        <div className="border-t border-slate-200/80 px-5 py-4 md:px-6 md:py-[1.125rem]">
          <div className="flex items-center gap-2">
            <span aria-hidden className={MANAGER_PAGE.pageHeaderAccent} />
            <p className={MANAGER_PAGE.pageHeaderEyebrow}>Ticket detail</p>
          </div>
          <h1 className={MANAGER_PAGE.pageHeaderTitle}>{ticket.title}</h1>
          <p className={MANAGER_PAGE.pageHeaderDesc}>
            {ticket.customer} · {ticket.assigneeName?.trim() || ticket.assignee || "Unassigned"} · {ticket.product} · Opened {ticket.openedAt || "this week"}
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

function AssigneeModalRow({ row, selected, onSelect }) {
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
            {row.teamNames?.length ? row.teamNames.join(" · ") : "Other agents"}
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
      : "Recommended for this product";
  const subtitle = [
    ticketLabel,
    productName ? `Product · ${productName}` : null,
    catalog.matchingTeams.length
      ? `Teams · ${catalog.matchingTeams.map((t) => t.name).join(", ")}`
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
        aria-label="Close assignee picker"
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
              Assignee
            </p>
            <h2 id="manager-assignee-modal-title" className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
              Choose an agent
            </h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className={`manager-ghost-btn inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-slate-900 ${MANAGER_GHOST_BUTTON}`}
            onClick={onClose}
            aria-label="Close"
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
              placeholder="Search agents or teams…"
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none ring-0"
            />
          </div>
        </div>

        <div className="destrova-manager-feed-scroll min-h-[280px] flex-1 overflow-y-auto px-5 py-4 md:px-6 md:py-5">
          {filtered.teamRows.length === 0 && filtered.otherRows.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              {query.trim() ? `No agents match "${query}"` : "No agents available"}
            </p>
          ) : (
            <>
              <AssigneeModalSection
                title={teamTitle}
                hint={`${filtered.teamRows.length} agent${filtered.teamRows.length === 1 ? "" : "s"}`}
              >
                {filtered.teamRows.map((row) => (
                  <AssigneeModalRow
                    key={`team-${row.agentId}`}
                    row={row}
                    selected={String(row.agentId) === String(value)}
                    onSelect={handleSelect}
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
                        <p className="text-sm font-semibold text-slate-800">Browse all agents</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Outside product team · {filtered.otherRows.length} available
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-blue-600 ring-1 ring-inset ring-blue-100">
                        Show list
                      </span>
                    </button>
                  ) : (
                    <>
                      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          All agents
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] tabular-nums text-slate-400">
                            {filtered.otherRows.length} agent{filtered.otherRows.length === 1 ? "" : "s"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowAllAgents(false)}
                            className={`manager-ghost-btn rounded-md px-2 py-0.5 text-[10px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 ${MANAGER_GHOST_BUTTON}`}
                          >
                            Hide
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
            Pick an agent, then click <span className="font-semibold text-slate-700">Apply changes</span> on the ticket to save.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function AssigneeFieldTrigger({ label, displayName, capacity, onOpen, disabled, loading, isUnassigned }) {
  const capacitySuffix =
    capacity?.max != null ? ` · ${capacity.active ?? 0}/${capacity.max}` : "";
  const triggerText = loading
    ? "Loading agents…"
    : isUnassigned
      ? "Unassigned"
      : `${displayName}${capacitySuffix}`;

  return (
    <div className="flex min-w-0 flex-col gap-1.5 text-xs" style={{ color: MANAGER_COLORS.muted }}>
      <span className="font-semibold uppercase tracking-[0.14em]">{label}</span>
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled || loading}
        aria-haspopup="dialog"
        aria-label={`Assignee: ${triggerText}. Open picker`}
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
function buildManagerApplySteps(ticketRow, apiTicket, draft) {
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
      throw new Error("Unassign is not supported. Select an agent to assign or reassign.");
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
          throw new Error("Select an assignee before moving New to In Progress.");
        }
        action = "assign";
        steps.push({
          kind: "action",
          action: "assign",
          body: { assigneeId },
          expected: buildExpectedProjection("assign", { assigneeId, status: "IN_PROGRESS" }),
        });
      } else if (!action) {
        throw new Error(`Unsupported status transition: ${fromStatusApi} → ${toStatusApi}`);
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
  const [assigneeModalOpen, setAssigneeModalOpen] = useState(false);

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
    ?? (ticket.assigneeId != null ? (ticket.assigneeName?.trim() || ticket.assignee || "Assigned") : "Unassigned");

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
            label="Status"
            value={draft.status}
            options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
            onChange={(v) => setDraft((d) => ({
              ...d,
              status: v,
              closureReason: v === "Closed" ? d.closureReason : null,
              resolutionNote: v === "Resolved" ? d.resolutionNote : null,
            }))}
          />
          <FieldSelect
            label="Priority"
            value={draft.priority}
            options={PRIORITY_OPTIONS.map((p) => ({ value: p, label: p }))}
            onChange={(v) => setDraft((d) => ({ ...d, priority: v }))}
          />
          <AssigneeFieldTrigger
            label="Assignee"
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
            ? `Applying (${applyProgress.current}/${applyProgress.total})…`
            : saving
              ? "Saving…"
              : "Apply changes"}
        </button>
      </div>
      {isTransitioningToClosed ? (
        <div className="mt-4 max-w-md">
          <FieldSelect
            label="Closure reason"
            value={draft.closureReason || ""}
            options={[{ value: "", label: "Select reason…" }, ...CLOSURE_REASON_OPTIONS]}
            onChange={(v) => setDraft((d) => ({ ...d, closureReason: v || null }))}
          />
        </div>
      ) : null}
      {isTransitioningToResolved ? (
        <div className="mt-4 max-w-xl">
          <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: MANAGER_COLORS.muted }}>
            Solution summary
            <span style={{ color: "#B42318" }}> *</span>
          </label>
          <textarea
            rows={4}
            value={draft.resolutionNote || ""}
            onChange={(e) => setDraft((d) => ({ ...d, resolutionNote: e.target.value }))}
            disabled={saving}
            placeholder="Describe what was done — the customer will review this before closing."
            className={`${MANAGER_FIELD_INPUT_CLASS} mt-1.5 resize-y`}
            style={{ color: MANAGER_COLORS.dark, boxShadow: MANAGER_CHROME.inputInset }}
          />
          <p className="mt-1.5 text-[11px]" style={{ color: MANAGER_COLORS.muted }}>
            Customer-visible. At least {RESOLUTION_NOTE_MIN_LENGTH} characters.
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
          Changes saved.
        </p>
      ) : null}
      <p className="mt-3 text-[11px]" style={{ color: MANAGER_COLORS.muted }}>
        Changes are saved to the backend. Closing a ticket requires a closure reason. Assignee opens a picker — product team first, all agents on demand.
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
const COMPOSER_MODES = {
  internal: {
    id: "internal",
    label: "Internal note",
    icon: IconLockSm,
    placeholder: "Add an internal note for the team. Use @mentions to notify agents.",
    button: "Add internal note",
    helper: "Visible only to agents, managers and admins. The customer cannot see this.",
    helperTone: { fg: "#92400e", bg: "rgba(245,158,11,0.12)" },
  },
  external: {
    id: "external",
    label: "Reply to customer",
    icon: IconExternalSm,
    placeholder: "Write a reply that will be sent to the customer.",
    button: "Send customer reply",
    helper: "This reply will be visible to the customer.",
    helperTone: { fg: MANAGER_STATUS.atRisk.fg, bg: MANAGER_STATUS.atRisk.bg },
  },
};

function hasMeaningfulComposerHtml(html) {
  return htmlToPlainText(DOMPurify.sanitize(html || "")).trim().length > 0;
}

function ComposerModeSwitch({ modeId, onSelect, onActivate }) {
  return (
    <div
      className="grid w-full min-w-0 grid-cols-2 gap-0.5 rounded-lg border border-slate-200 bg-slate-50/90 p-0.5 sm:w-auto"
      role="tablist"
      aria-label="Message type"
    >
      {Object.values(COMPOSER_MODES).map((mode) => {
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
  attachmentFileInputId = "manager-attachment-file",
  attachmentUploadError = null,
  pendingAttachments = [],
  onAddPendingFiles = () => {},
  onRemovePending = () => {},
}) {
  const [modeId, setModeId] = useState("internal");
  const [commentHtml, setCommentHtml] = useState("");
  const {
    editorHeight,
    manualResize,
    minHeight,
    autoGrowMax,
    onEditorAutoHeight,
    onResizePointerDown,
    resetEditorHeight,
  } = useResizableComposerEditor();

  const mode = COMPOSER_MODES[modeId];
  const canSubmit = hasMeaningfulComposerHtml(commentHtml);
  const isInternal = modeId === "internal";

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
    const ok = await onSubmit({ internal: isInternal, body: html });
    if (ok !== false) {
      setCommentHtml("");
      resetEditorHeight();
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
        />
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {isInternal ? "Team only" : "Customer-visible"}
        </span>
      </div>

      {!isInternal ? (
        <p className="mt-2 shrink-0 text-[11px] font-medium leading-snug text-amber-800/90">
          {mode.helper}
        </p>
      ) : null}

      <div className="mt-2 min-w-0 shrink-0 overflow-hidden rounded-lg border border-slate-200/80 bg-white">
        <DestrovaComposer
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

      {pendingAttachments.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Pending attachments">
          {pendingAttachments.map((p) => (
            <li
              key={p.id}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-gray-200 bg-white py-1 pl-2.5 pr-1 text-[11px] font-semibold text-gray-900 shadow-sm"
            >
              <span className="min-w-0 truncate" title={p.file.name}>{p.file.name}</span>
              <span className="shrink-0 tabular-nums text-slate-500">
                {formatFileSize(p.file.size)}
              </span>
              <button
                type="button"
                onClick={() => onRemovePending(p.id)}
                disabled={saving}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold leading-none text-gray-600 transition-colors duration-150 hover:bg-slate-200 disabled:opacity-40"
                aria-label={`Remove ${p.file.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-2.5 flex shrink-0 flex-col gap-2 border-t border-gray-100 pt-2.5">
        <div className="flex min-w-0 items-center justify-between gap-2">
          {canUploadAttachment ? (
            <>
              <input
                id={attachmentFileInputId}
                type="file"
                multiple
                className="sr-only"
                disabled={saving}
                onChange={onAddPendingFiles}
              />
              <label
                htmlFor={attachmentFileInputId}
                className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-[11px] font-semibold text-gray-600 transition-colors duration-150 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-75"
                style={{
                  pointerEvents: saving ? "none" : "auto",
                  opacity: saving ? 0.75 : 1,
                }}
              >
                <IconPaperclip className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                Attach
              </label>
            </>
          ) : (
            <span className="min-w-0 flex-1" />
          )}
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || saving}
            className={[
              MANAGER_GHOST_BUTTON,
              "ml-auto inline-flex h-8 shrink-0 items-center justify-center rounded-lg px-3.5 text-xs font-semibold tracking-tight transition-colors duration-150 sm:px-4 sm:text-sm",
              canSubmit && !saving
                ? isInternal
                  ? "bg-amber-700 text-white shadow-sm hover:bg-amber-800"
                  : `${SAAS_BUTTON.primarySm} !px-3.5 sm:!px-4`
                : isInternal
                  ? "cursor-not-allowed border border-amber-200 bg-amber-50 text-amber-900/75"
                  : "cursor-not-allowed border border-blue-200 bg-blue-50 text-blue-800/80",
            ].join(" ")}
          >
            {saving
              ? (busyStep === "uploading" ? "Uploading…" : "Sending…")
              : mode.button}
          </button>
        </div>
        {error ? (
          <p className="text-[11px] font-medium leading-snug text-rose-700">{error}</p>
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

function formatApiDetailAt(iso) {
  if (iso == null) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

/** Timeline + worklog rail from API ticket; attachments left empty until API exposes them. */
function buildApiDetail(ticket) {
  const comments = Array.isArray(ticket.comments) ? ticket.comments : [];
  const worklogs = Array.isArray(ticket.worklogs) ? ticket.worklogs : [];

  const fromComments = comments.map((comment) => {
    const at = formatApiDetailAt(comment.createdAt);
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
      type = "status_change";
      meta = null;
    } else {
      type = "agent_reply";
      meta = null;
    }
    return {
      type,
      at,
      title: comment.authorName || "System",
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
      at: formatApiDetailAt(w.workDate),
      title: w.agentName || `Agent #${w.agentId}`,
      body: w.description,
      meta: `Worklog · ${durationMinutes}m`,
      internal: true,
      _ts: Date.parse(w.workDate) || 0,
    };
  });

  const timeline = [...fromComments, ...fromWorklogs]
    .sort((a, b) => a._ts - b._ts)
    .map(({ _ts, ...rest }) => rest);

  return {
    timeline,
    attachments: [],
    worklog: worklogs.map((w) => ({
      at: formatApiDetailAt(w.workDate),
      agent: w.agentName || `Agent #${w.agentId}`,
      duration: `${w.durationMinutes ?? 0}m`,
      note: w.description,
    })),
  };
}

/* ── View ────────────────────────────────────────────────────────────── */
export default function ManagerTicketDetailView({ ticketId }) {
  const { closeTicket } = useManagerWorkspace();
  const [apiTicket, setApiTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentUploadError, setAttachmentUploadError] = useState(null);
  const [attachmentListError, setAttachmentListError] = useState(null);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [composerBusyStep, setComposerBusyStep] = useState("idle");
  const [downloadUi, setDownloadUi] = useState({ id: null, status: "idle" });
  const [deletingAttachmentId, setDeletingAttachmentId] = useState(null);
  const [activityLogOnly, setActivityLogOnly] = useState(false);
  const attachmentFileInputId = useId();

  useEffect(() => {
    setActivityLogOnly(false);
  }, [ticketId]);

  const fetchTicketDetail = useCallback(async () => {
    const cleanId = String(ticketId || "").replace(/^#/, "");
    if (!/^\d+$/.test(cleanId)) {
      return null;
    }
    try {
      return await getTicketById(cleanId);
    } catch {
      return null;
    }
  }, [ticketId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setApiTicket(null);

    (async () => {
      const data = await fetchTicketDetail();
      if (cancelled) return;
      setApiTicket(data);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [ticketId, fetchTicketDetail]);

  const ticket = useMemo(() => {
    if (apiTicket) return normalizeTicketForManagerTable(apiTicket);
    return MANAGER_TICKETS.find((t) => t.id === ticketId) ?? null;
  }, [apiTicket, ticketId]);

  const detail = useMemo(() => {
    if (apiTicket) return buildApiDetail(apiTicket);
    return getManagerTicketDetail(ticketId);
  }, [apiTicket, ticketId]);

  const involvedPeople = useMemo(() => listInvolvedMentionPeopleFromTicket(apiTicket), [apiTicket]);

  const sanitizedTicketId = useMemo(
    () => String(ticketId || "").replace(/^#/, ""),
    [ticketId],
  );

  const loadAttachments = useCallback(async () => {
    if (!/^\d+$/.test(sanitizedTicketId)) return;
    setAttachmentsLoading(true);
    try {
      const data = await getAttachments(sanitizedTicketId);
      setAttachments(Array.isArray(data) ? data : []);
    } catch {
      setAttachments([]);
    } finally {
      setAttachmentsLoading(false);
    }
  }, [sanitizedTicketId]);

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
      setSaveError("Save is only available for tickets loaded from the server.");
      return;
    }
    const id = String(ticket.rawId ?? ticket.id).replace(/^#/, "");
    if (!/^\d+$/.test(id)) {
      setSaveError("Invalid ticket id.");
      return;
    }
    const transitioningToClosed = draft.status === "Closed" && ticket.status !== "Closed";
    if (transitioningToClosed && !draft.closureReason) {
      setSaveError("Select a closure reason to close the ticket.");
      return;
    }
    const transitioningToResolved = draft.status === "Resolved" && ticket.status !== "Resolved";
    if (transitioningToResolved && !isResolutionNoteValid(draft.resolutionNote)) {
      setSaveError(`Add a solution summary (at least ${RESOLUTION_NOTE_MIN_LENGTH} characters).`);
      return;
    }
    if (!STATUS_TO_API[draft.status] || !PRIORITY_TO_API[draft.priority]) {
      setSaveError("Invalid status or priority selection.");
      return;
    }

    let steps;
    try {
      steps = buildManagerApplySteps(ticket, apiTicket, draft);
    } catch (e) {
      setSaveError(e?.message || "Invalid changes.");
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
        setSaveError(
          "Changes were sent — still syncing. Refresh if status, assignee, or priority looks unchanged.",
        );
        const fresh = await fetchTicketDetail();
        if (fresh != null) setApiTicket(fresh);
      } else {
        setSaveError(
          formatApiErrorWithCapacityHint(
            e,
            e?.message || "Save failed",
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

  function formatUploadOrDeleteErr(err) {
    const d = err?.response?.data;
    if (d == null) return err?.message || "Request failed";
    if (typeof d === "string") return d;
    if (typeof d === "object" && d != null && d.message) return String(d.message);
    try {
      return JSON.stringify(d);
    } catch {
      return "Request failed";
    }
  }

  const handleComposerSubmit = async ({ internal, body }) => {
    if (!apiTicket) {
      setComposerError("Comment can only be added for tickets loaded from the server.");
      return false;
    }

    const id = String(ticket?.rawId ?? ticket?.id ?? ticketId).replace(/^#/, "");
    if (!/^\d+$/.test(id)) {
      setComposerError("Invalid ticket id.");
      return false;
    }

    const filesSnapshot = pendingAttachments.map((p) => ({ ...p }));

    setComposerSaving(true);
    setComposerError(null);
    setAttachmentUploadError(null);
    setComposerBusyStep("sending");

    try {
      await addComment(id, {
        message: body,
        isInternal: Boolean(internal),
      });
    } catch (e) {
      const msg = e?.response?.data?.message ?? e?.message ?? "Comment could not be saved.";
      setComposerError(typeof msg === "string" ? msg : "Comment could not be saved.");
      setComposerBusyStep("idle");
      setComposerSaving(false);
      return false;
    }

    try {
      if (filesSnapshot.length > 0) {
        setComposerBusyStep("uploading");
        for (const p of filesSnapshot) {
          await uploadAttachment(sanitizedTicketId, p.file, () => {});
        }
      }
      setPendingAttachments([]);
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

  const handleAddPendingFiles = useCallback(
    (e) => {
      const input = e.target;
      const list = input?.files;
      if (input) input.value = "";
      if (!list?.length) return;
      if (!/^\d+$/.test(sanitizedTicketId)) return;
      setAttachmentUploadError(null);
      setPendingAttachments((prev) => {
        const next = [...prev];
        for (let i = 0; i < list.length; i += 1) {
          const file = list[i];
          const sig = `${file.name}\0${file.size}\0${file.lastModified}`;
          if (next.some((p) => `${p.file.name}\0${p.file.size}\0${p.file.lastModified}` === sig)) {
            continue;
          }
          const id = `pending-${sig}-${i}`;
          next.push({ id, file });
        }
        return next;
      });
    },
    [sanitizedTicketId],
  );

  const handleRemovePending = useCallback((id) => {
    setPendingAttachments((p) => p.filter((x) => x.id !== id));
  }, []);

  const handleDeleteRailAttachment = useCallback(
    async (att) => {
      if (!/^\d+$/.test(sanitizedTicketId)) return;
      if (!window.confirm("Are you sure you want to delete this attachment?")) return;
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
    [sanitizedTicketId, loadAttachments],
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
    return <ManagerSurface title="Loading..." />;
  }

  if (!ticket) {
    return (
      <ManagerSurface eyebrow="Ticket" title="Ticket not found">
        <ManagerCard padding="p-6">
          <p className="text-sm" style={{ color: MANAGER_COLORS.support }}>
            That ticket is no longer in the queue. Go back to where you came from.
          </p>
          <button
            type="button"
            onClick={closeTicket}
            className={`mt-4 gap-1.5 rounded-full px-3 py-1.5 ${SAAS_BUTTON.primarySm}`}
          >
            <IconArrow className="h-3.5 w-3.5" />
            Back
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
                Conversation & activity
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <ConversationActivityFilterButton
                  active={activityLogOnly}
                  onToggle={() => setActivityLogOnly((v) => !v)}
                  activityCount={activityTimeline.length}
                />
                <span className="text-[10.5px] font-semibold tabular-nums text-slate-500">
                  {visibleTimeline.length}{" "}
                  {activityLogOnly
                    ? visibleTimeline.length === 1
                      ? "activity"
                      : "activities"
                    : visibleTimeline.length === 1
                      ? "entry"
                      : "entries"}
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
                  <p className="text-sm font-semibold text-slate-700">No activity recorded yet</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Status changes, assignments, SLA events, and worklogs will appear here.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActivityLogOnly(false)}
                    className={`${MANAGER_GHOST_BUTTON} mt-3 text-xs font-semibold text-blue-700 hover:text-blue-800`}
                  >
                    Show full conversation
                  </button>
                </div>
              )}
            </div>
          </div>
          <div
            className="relative z-[1] shrink-0 border-t border-gray-100 bg-gradient-to-b from-white to-slate-50/80 px-3 pb-4 pt-3 md:px-5 md:pb-5"
          >
            <ManagerComposer
              onSubmit={handleComposerSubmit}
              onActivate={scrollTimelineToLatest}
              saving={composerSaving}
              busyStep={composerBusyStep}
              error={composerError}
              canUploadAttachment={canUseAttachmentApi}
              attachmentFileInputId={attachmentFileInputId}
              attachmentUploadError={attachmentUploadError}
              pendingAttachments={pendingAttachments}
              onAddPendingFiles={handleAddPendingFiles}
              onRemovePending={handleRemovePending}
              className="!mt-0 shadow-[0_-4px_16px_rgba(15,23,42,0.04)]"
            />
          </div>
        </ManagerCard>

        {/* Right rail */}
        <div className="grid gap-6 lg:col-span-4">
          <ManagerCard padding="p-6" tone="default" className="border border-gray-200 bg-white">
            <ManagerCardHeader title="Ticket context" hint="Customer, assignee & contact" />
            <dl className="mt-4 grid grid-cols-1 gap-4 text-sm">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>Customer</dt>
                <dd className="mt-1 font-semibold" style={{ color: MANAGER_COLORS.dark }}>{ticket.customer}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>Assigned agent</dt>
                <dd className="mt-1" style={{ color: MANAGER_COLORS.dark }}>{ticket.assigneeName || ticket.assignee || "Unassigned"}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>Product</dt>
                <dd className="mt-1" style={{ color: MANAGER_COLORS.dark }}>{ticket.product}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>Requester / contact</dt>
                <dd className="mt-1" style={{ color: MANAGER_COLORS.dark }}>{ticket.creatorName?.trim() || ticket.requester || "—"}</dd>
                <dd className="text-xs" style={{ color: MANAGER_COLORS.support }}>{ticket.customerEmail?.trim() ? ticket.customerEmail : "No email on record"}</dd>
              </div>
            </dl>
            {ticket.status === "Closed" && ticket.closureReason != null && ticket.closureReason !== "" ? (
              <div
                className="mt-4 rounded-lg border border-gray-200 bg-slate-50 px-3 py-2.5"
                style={{ color: MANAGER_COLORS.support }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>Closure reason</p>
                <p className="mt-0.5 text-sm font-semibold" style={{ color: MANAGER_COLORS.dark }}>{formatClosureReasonForDisplay(ticket.closureReason)}</p>
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
                  Involved (mentions)
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
            title="Attachments"
            hint={
              attachmentsLoading
                ? "Loading files..."
                : `${attachments.length} file${attachments.length === 1 ? "" : "s"}`
            }
          />
          {attachmentListError ? (
            <p className="mt-2 text-xs font-medium leading-snug" style={{ color: "#B42318" }} role="alert">
              {attachmentListError}
            </p>
          ) : null}

          {attachments.length === 0 ? (
            <p className="mt-4 text-sm" style={{ color: MANAGER_COLORS.muted }}>
              {attachmentsLoading ? "Loading attachments..." : "No attachments on this ticket."}
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {attachments.map((att) => {
                const fileName = att.fileName || "dosya";
                const sizeKb = att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : "—";
                const uploadedAt = att.uploadedAt
                  ? new Date(att.uploadedAt).toLocaleString()
                  : "—";
                const isRowDl = downloadUi.id === att.id;
                const downloadLabel =
                  isRowDl && downloadUi.status === "downloading"
                    ? "Downloading…"
                    : isRowDl && downloadUi.status === "downloaded"
                      ? "Downloaded"
                      : "Download";

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
                        title={`Download ${fileName}`}
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
                        className="inline-flex h-8 min-w-[4.5rem] shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 transition-colors duration-150 hover:bg-slate-50 disabled:opacity-50"
                        title={`Delete ${fileName}`}
                      >
                        {deletingAttachmentId === att.id ? "…" : "Delete"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          </ManagerCard>

          <ManagerCard padding="p-6" tone="default" className="border border-gray-200 bg-white">
            <ManagerCardHeader title="Worklog" hint="Time logged on this ticket" />
            {detail.worklog.length === 0 ? (
              <p className="mt-4 text-sm" style={{ color: MANAGER_COLORS.muted }}>No worklog entries yet.</p>
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
