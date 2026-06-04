import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  getAgentCapacities,
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
import { MANAGER_CHROME, MANAGER_COLORS, MANAGER_STATUS, SAAS_BUTTON } from "../managerTokens";
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
import { formatApiErrorWithCapacityHint } from "../../shared/utils/agentCapacityMessages";

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

/* ── Timeline event styling ───────────────────────────────────────────── */
function timelineTone(type, internal) {
  if (internal) return { fg: "#92400e", bg: "rgba(245,158,11,0.12)" };
  switch (type) {
    case "agent_reply":    return { fg: MANAGER_COLORS.primary, bg: "rgba(37,99,235,0.10)" };
    case "customer_reply": return { fg: "#334155", bg: "rgba(15,23,42,0.06)" };
    case "sla_warning":    return { fg: MANAGER_STATUS.atRisk.fg, bg: MANAGER_STATUS.atRisk.bg };
    case "worklog":
    case "assignment":
    case "status_change":
      return { fg: MANAGER_COLORS.support, bg: "rgba(15,23,42,0.05)" };
    default:
      return { fg: MANAGER_COLORS.support, bg: MANAGER_CHROME.pillTray };
  }
}

/** Left border accent — semantic separation per kind (no violet). */
function timelineLeftAccent(type, internal) {
  if (internal) return "rgba(245,158,11,0.55)";
  switch (type) {
    case "customer_reply":
      return "rgba(15,23,42,0.28)";
    case "agent_reply":
      return "rgba(37,99,235,0.55)";
    case "internal_note":
      return "rgba(245,158,11,0.55)";
    case "sla_warning":
      return "rgba(245,158,11,0.65)";
    case "worklog":
    case "status_change":
    case "assignment":
      return "rgba(100,116,139,0.45)";
    default:
      return "rgba(15,23,42,0.18)";
  }
}

function timelineKindLabel(entry) {
  const t = entry.type;
  if (t === "worklog") return "Worklog";
  if (t === "status_change") return "System";
  if (t === "customer_reply") return "Customer";
  if (t === "internal_note") return "Internal";
  if (t === "agent_reply") return "Public reply";
  if (t === "sla_warning") return "SLA";
  if (t === "assignment") return "Assignment";
  return "Activity";
}

function timelineIcon(type) {
  const stroke = "currentColor";
  switch (type) {
    case "customer_reply":
    case "agent_reply":
      return (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
          <path d="M2.5 4.5h11v6h-5l-3 2.5v-2.5h-3v-6z" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      );
    case "internal_note":
      return (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
          <path d="M3 3h10v10H3z" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M5.5 6.5h5M5.5 9h3" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case "worklog":
      return (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
          <circle cx="8" cy="8" r="5.5" stroke={stroke} strokeWidth="1.4" />
          <path d="M8 5v3.5l2 1.5" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case "sla_warning":
      return (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
          <path d="M8 2.5L1.5 13.5h13L8 2.5z" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M8 6.5v3.5M8 11.5v.5" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case "assignment":
      return (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
          <circle cx="6" cy="6" r="2.4" stroke={stroke} strokeWidth="1.4" />
          <path d="M2 13c.8-2 2.4-3 4-3M11 7l2 2 3-3" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "status_change":
      return (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
          <path d="M3 8a5 5 0 018.3-3.7M13 8a5 5 0 01-8.3 3.7" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    default:
      return <span aria-hidden>•</span>;
  }
}

function TimelineEntry({ entry }) {
  const tone = timelineTone(entry.type, entry.internal);
  const borderLeft = timelineLeftAccent(entry.type, entry.internal);
  const kind = timelineKindLabel(entry);
  return (
    <li className="relative pl-9">
      <span
        className="absolute left-0 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-white"
        style={{ color: tone.fg, backgroundColor: tone.bg, boxShadow: MANAGER_CHROME.hairlineInset }}
      >
        {timelineIcon(entry.type)}
      </span>
      <div
        className="rounded-xl border border-gray-200 border-l-[3px] bg-white py-3 pl-4 pr-3 shadow-sm"
        style={{ borderLeftColor: borderLeft }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1 ring-inset ring-slate-200/80"
            style={{ color: tone.fg, backgroundColor: tone.bg }}
          >
            {kind}
          </span>
          <p className="text-[11px] tabular-nums" style={{ color: MANAGER_COLORS.muted }}>{entry.at}</p>
        </div>
        <p className="mt-2 text-sm font-semibold" style={{ color: MANAGER_COLORS.dark }}>{entry.title}</p>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: MANAGER_COLORS.support }}>{entry.body}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: MANAGER_COLORS.muted }}>{entry.meta}</span>
          {entry.internal ? (
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: tone.fg, backgroundColor: tone.bg }}
            >
              Internal
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/* ── Header ──────────────────────────────────────────────────────────── */
function DetailHeader({ ticket, onBack }) {
  return (
    <header className="mb-8 flex flex-col gap-4 md:mb-10">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-tight transition-[background-color,color] duration-150 hover:bg-slate-100"
        style={{ color: MANAGER_COLORS.support }}
      >
        <IconArrow className="h-3.5 w-3.5" />
        Back
      </button>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-[11px] font-semibold tracking-tight" style={{ color: MANAGER_COLORS.muted }}>{ticket.displayId || ticket.id}</p>
            <ManagerStatusPill kind={priorityKind(ticket.priority)}>{ticket.priority}</ManagerStatusPill>
            <ManagerStatusPill kind={ticket.sla.state}>{ticket.sla.label} · {ticket.sla.due}</ManagerStatusPill>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-[1.75rem]" style={{ color: MANAGER_COLORS.dark }}>
            {ticket.title}
          </h1>
          <p className="mt-2 text-sm" style={{ color: MANAGER_COLORS.support }}>
            {ticket.customer} · {ticket.assigneeName?.trim() || ticket.assignee || "Unassigned"} · {ticket.product} · Opened {ticket.openedAt || "this week"}
          </p>
        </div>
      </div>
    </header>
  );
}

/* ── Action toolbar (status, priority, reassign) ──────────────────── */
function FieldSelect({ label, value, options, onChange, disabled = false }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs" style={{ color: MANAGER_COLORS.muted }}>
      <span className="font-semibold uppercase tracking-[0.14em]">{label}</span>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(37,99,235,0.22)]"
        style={{
          color: MANAGER_COLORS.dark,
          boxShadow: MANAGER_CHROME.inputInset,
        }}
      >
        {options.map((opt) => (
          <option key={opt.value || "_unassigned"} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}

/**
 * Plan manager apply chain: assign/unassign → status (incl. close) → priority.
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
      const overrides = { assigneeId };
      if (fromStatusApi === "NEW") overrides.status = "IN_PROGRESS";
      steps.push({
        action: "assign",
        body: { assigneeId },
        expected: buildExpectedProjection("assign", overrides),
      });
    } else {
      steps.push({
        action: "unassign",
        body: {},
        expected: buildExpectedProjection("unassign", { assigneeId: null }),
      });
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
          action: "assign",
          body: { assigneeId },
          expected: buildExpectedProjection("assign", { assigneeId, status: "IN_PROGRESS" }),
        });
      } else if (!action) {
        throw new Error(`Unsupported status transition: ${fromStatusApi} → ${toStatusApi}`);
      } else {
        steps.push({
          action,
          body: {},
          expected: buildExpectedProjection(action, { status: toStatusApi }),
        });
      }
    }
  }

  if (priorityChanged) {
    steps.push({
      action: "change-priority",
      body: { priority: toPriorityApi },
      expected: buildExpectedProjection("change-priority", { priority: toPriorityApi }),
    });
  }

  return steps;
}

function ManagerActions({ ticket, draft, setDraft, onApply, saving, applyProgress, error, success, agents, agentsLoading }) {
  const assigneeOptions = useMemo(() => {
    const list = Array.isArray(agents) ? agents : [];
    return [
      { value: "", label: "— Unassigned —" },
      ...list.map((a) => ({
        value: String(a.agentId),
        label: `${a.agentName} · ${a.activeTicketCount ?? 0}/${a.maxTicketLimit ?? "—"}`,
      })),
    ];
  }, [agents]);

  const currentAssigneeKey =
    ticket.assigneeId != null && ticket.assigneeId !== "" ? String(ticket.assigneeId) : "";
  const dirty = (
    draft.status !== ticket.status ||
    draft.priority !== ticket.priority ||
    (draft.assignee || "") !== currentAssigneeKey
  );

  const isTransitioningToClosed = draft.status === "Closed" && ticket.status !== "Closed";
  const needsClosurePick = isTransitioningToClosed && !draft.closureReason;

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
            }))}
          />
          <FieldSelect
            label="Priority"
            value={draft.priority}
            options={PRIORITY_OPTIONS.map((p) => ({ value: p, label: p }))}
            onChange={(v) => setDraft((d) => ({ ...d, priority: v }))}
          />
          <FieldSelect
            label="Assignee"
            value={draft.assignee || ""}
            options={assigneeOptions}
            onChange={(v) => setDraft((d) => ({ ...d, assignee: v ? String(v) : null }))}
            disabled={!!agentsLoading}
          />
        </div>
        <button
          type="button"
          onClick={onApply}
          disabled={!dirty || saving || needsClosurePick}
          className={
            dirty && !saving && !needsClosurePick
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
        Changes are saved to the backend. Closing a ticket requires a closure reason. Assignee changes are saved when a target agent is selected.
      </p>
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

function ModePill({ mode, active, onSelect }) {
  const Icon = mode.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(mode.id)}
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold tracking-tight transition-colors duration-150",
        active
          ? "bg-[#2563EB] text-white shadow-[0_1px_2px_rgba(37,99,235,0.28)] outline-none"
          : "bg-slate-100 text-gray-600 hover:bg-slate-200/80 outline-none",
      ].join(" ")}
      aria-pressed={active}
    >
      <Icon className="h-3.5 w-3.5" />
      {mode.label}
    </button>
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
  const [text, setText] = useState("");
  const mode = COMPOSER_MODES[modeId];
  const canSubmit = text.trim().length > 0;
  const isInternal = modeId === "internal";

  const submit = async () => {
    if (!canSubmit || saving) return;
    const ok = await onSubmit({ internal: isInternal, body: text.trim() });
    if (ok !== false) {
      setText("");
    }
  };

  return (
    <div
      className={[
        "mt-6 rounded-2xl border p-4 md:p-5",
        isInternal ? "border-amber-200/80 bg-amber-50/40" : "border-gray-200 bg-white",
        composerClass,
      ].join(" ").trim()}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ModePill mode={COMPOSER_MODES.internal} active={modeId === "internal"} onSelect={setModeId} />
          <ModePill mode={COMPOSER_MODES.external} active={modeId === "external"} onSelect={setModeId} />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>
          {isInternal ? "Internal · team only" : "External · customer-visible"}
        </span>
      </div>

      {!isInternal ? (
        <div
          className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2"
          style={{
            color: mode.helperTone.fg,
            backgroundColor: mode.helperTone.bg,
          }}
        >
          <IconWarn className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p className="text-xs font-semibold tracking-tight">
            {mode.helper}
          </p>
        </div>
      ) : null}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={mode.placeholder}
        rows={4}
        className="mt-3 block w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm leading-relaxed outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(37,99,235,0.22)]"
        style={{
          color: MANAGER_COLORS.dark,
          boxShadow: MANAGER_CHROME.inputInset,
        }}
      />

      {pendingAttachments.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Pending attachments">
          {pendingAttachments.map((p) => (
            <li
              key={p.id}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-gray-200 bg-white py-1 pl-2.5 pr-1 text-[11px] font-semibold text-gray-900"
            >
              <span className="min-w-0 truncate" title={p.file.name}>{p.file.name}</span>
              <span className="shrink-0 tabular-nums" style={{ color: MANAGER_COLORS.muted }}>
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

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-end justify-between gap-2 sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
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
                    className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-600 transition-colors duration-150 hover:bg-slate-50 disabled:opacity-75"
                    style={{
                      pointerEvents: saving ? "none" : "auto",
                      opacity: saving ? 0.75 : 1,
                    }}
                  >
                    <IconPaperclip className="h-3.5 w-3.5 shrink-0" style={{ color: MANAGER_COLORS.support }} />
                    Attach file
                  </label>
                </>
              ) : null}
              <p className="min-w-0 flex-1 text-[11px] leading-relaxed" style={{ color: MANAGER_COLORS.muted }}>
                {isInternal ? mode.helper : "This reply will be visible to the customer."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || saving}
            className={
              canSubmit
                ? isInternal
                  ? "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-amber-700 px-3.5 text-sm font-semibold tracking-tight text-white shadow-[0_1px_2px_rgba(180,83,9,0.28)] outline-none transition-[background-color,box-shadow] duration-150 hover:bg-amber-800 focus-visible:ring-2 focus-visible:ring-amber-500/35 focus-visible:ring-offset-2"
                  : `${SAAS_BUTTON.primarySm} shrink-0 tracking-tight`
                : "inline-flex h-9 shrink-0 cursor-not-allowed items-center justify-center rounded-lg bg-slate-100 px-3.5 text-sm font-semibold text-gray-400 opacity-70"
            }
          >
            {saving
              ? (busyStep === "uploading" ? "Uploading…" : "Sending…")
              : mode.button}
          </button>
        </div>
        {error ? (
          <p className="text-[11px] font-medium leading-snug" style={{ color: "#B42318" }}>
            {error}
          </p>
        ) : null}
        {attachmentUploadError ? (
          <p className="text-[11px] font-medium leading-snug" style={{ color: "#B42318" }} role="alert">
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
      meta = "External";
    } else if (authorType === "AGENT") {
      internal = Boolean(comment.isInternal);
      if (internal) {
        type = "internal_note";
        meta = "Internal note";
      } else {
        type = "agent_reply";
        meta = "Public reply";
      }
    } else if (authorType === "SYSTEM") {
      type = "status_change";
      meta = "System";
    } else {
      type = "agent_reply";
      meta = "External";
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
  const attachmentFileInputId = useId();

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
  });
  const [saving, setSaving] = useState(false);
  const [applyProgress, setApplyProgress] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [agents, setAgents] = useState([]);
  const [agentsLoading, setAgentsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAgentsLoading(true);
    getAgentCapacities()
      .then((data) => {
        if (cancelled) return;
        setAgents(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setAgents([]);
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
        const { action, body, expected } = steps[i];
        latest = await runActionWithPoll(id, action, body, expected);
        setApiTicket(latest);
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
      />

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: timeline + composer docked to card bottom (scroll is timeline only) */}
        <ManagerCard
          className="flex h-full min-h-[16rem] flex-col self-stretch border border-gray-200 bg-white lg:col-span-8 lg:max-h-[min(88vh,56rem)]"
          padding="p-0"
          tone="default"
          elevated
        >
          <div className="shrink-0 px-6 pt-6 md:px-7 md:pt-7">
            <ManagerCardHeader
              title="Conversation & activity"
              hint="Customer messages, agent replies, internal notes, worklog — managers see everything."
            />
          </div>
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-1 md:px-7">
            <ol className="flex flex-col gap-4 pb-2">
              {timeline.map((entry, i) => (
                <TimelineEntry key={i} entry={entry} />
              ))}
            </ol>
          </div>
          <div
            className="shrink-0 border-t border-gray-200 bg-gradient-to-b from-white to-slate-50/80 px-4 pb-5 pt-4 md:px-6 md:pb-6"
          >
            <ManagerComposer
              onSubmit={handleComposerSubmit}
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
