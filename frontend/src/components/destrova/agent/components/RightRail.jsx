import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { getAgentStatusOptionsForSelect, PRIORITY_API_VALUES } from "../data/ticketStatusGraph";
import { mapPriorityToAgentLabel, mapTicketStatusToAgentLabel } from "../mappers/agentTicketMappers";
import { SyncStateChip } from "../../shared/StatusBadge";
import { getAgentPeerCapacities, getApiErrorMessage } from "../../../../services/api";
import {
  AGENT_FORCE_CLOSE_REASONS,
  closureReasonOptions,
  formatClosureReason,
} from "../../shared/constants/closureReasons";
import { getAgentCapacityLimitMessage } from "../../shared/utils/agentCapacityMessages";
import {
  getAgentPriorityClasses,
  getAgentSlaBarClasses,
  getAgentStatusClasses,
} from "../agentTokens.js";
import { WorkspacePanelToggleButton } from "./workspacePanelToggle.jsx";
import {
  isResolutionNoteValid,
  RESOLUTION_NOTE_MIN_LENGTH,
} from "../../shared/constants/resolutionNote";

const FORCE_CLOSE_OPTIONS = closureReasonOptions(AGENT_FORCE_CLOSE_REASONS);

const SECTION_TOGGLE =
  "appearance-none border-0 bg-transparent p-0 shadow-none outline-none " +
  "flex w-full cursor-pointer items-center justify-between gap-6 text-left " +
  "focus-visible:outline-none focus-visible:ring-0";

const PROPERTIES_SECTIONS_BTN =
  "appearance-none border-0 bg-transparent p-0 shadow-none outline-none " +
  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 " +
  "transition-colors hover:bg-slate-100 hover:text-slate-600 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/25";

const SectionRegistryContext = createContext(null);

function SectionRegistryProvider({ children }) {
  const sectionsRef = useRef(new Map());
  const [revision, setRevision] = useState(0);
  const syncRevision = useCallback(() => setRevision((r) => r + 1), []);

  const register = useCallback((sectionId, getIsOpen, applyOpen) => {
    sectionsRef.current.set(sectionId, { getIsOpen, applyOpen });
    return () => {
      sectionsRef.current.delete(sectionId);
    };
  }, []);

  const expandAll = useCallback(() => {
    sectionsRef.current.forEach(({ applyOpen }) => applyOpen(true));
    syncRevision();
  }, [syncRevision]);

  const collapseAll = useCallback(() => {
    sectionsRef.current.forEach(({ applyOpen }) => applyOpen(false));
    syncRevision();
  }, [syncRevision]);

  const allExpanded = useCallback(() => {
    const items = [...sectionsRef.current.values()];
    return items.length > 0 && items.every(({ getIsOpen }) => getIsOpen());
  }, []);

  const value = useMemo(
    () => ({ register, expandAll, collapseAll, allExpanded, syncRevision, revision }),
    [register, expandAll, collapseAll, allExpanded, syncRevision, revision],
  );

  return (
    <SectionRegistryContext.Provider value={value}>{children}</SectionRegistryContext.Provider>
  );
}

function PropertiesSectionsToggle() {
  const registry = useContext(SectionRegistryContext);
  if (!registry) return null;

  void registry.revision;
  const expanded = registry.allExpanded();
  const label = expanded ? "Collapse all sections" : "Expand all sections";

  return (
    <button
      type="button"
      onClick={() => (expanded ? registry.collapseAll() : registry.expandAll())}
      className={PROPERTIES_SECTIONS_BTN}
      title={label}
      aria-label={label}
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M3 5.25h10M3 8h10"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d={expanded ? "M8 11.75l2.25-2.25M8 11.75l-2.25-2.25" : "M8 11.75l2.25 2.25M8 11.75l-2.25 2.25"}
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

const META_SELECT_CLASS =
  "mt-1.5 w-full cursor-pointer rounded-agent-button border border-destrova-agent-border bg-white py-2 pl-3 pr-9 text-sm font-medium text-slate-900 shadow-sm transition hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-50";

const FORM_TEXTAREA_CLASS =
  "mt-1.5 w-full resize-none rounded-agent-button border border-destrova-agent-border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15 disabled:opacity-50";

function SectionToggleIcon({ open }) {
  return (
    <svg
      className={[
        "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
        open ? "rotate-0" : "-rotate-90",
      ].join(" ")}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Section({ title, children, defaultOpen = true }) {
  const registry = useContext(SectionRegistryContext);
  const registryRef = useRef(registry);
  registryRef.current = registry;
  const [open, setOpen] = useState(defaultOpen);
  const sectionId = useId();
  const panelId = useId();
  const openRef = useRef(open);
  openRef.current = open;
  const titleText = typeof title === "string" ? title : "section";

  useEffect(() => {
    const api = registryRef.current;
    if (!api) return undefined;
    return api.register(sectionId, () => openRef.current, setOpen);
  }, [sectionId]);

  const skipOpenSyncRef = useRef(true);
  useEffect(() => {
    if (skipOpenSyncRef.current) {
      skipOpenSyncRef.current = false;
      return;
    }
    registryRef.current?.syncRevision?.();
  }, [open]);

  return (
    <section className={open ? "pb-4" : "pb-3.5"}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={SECTION_TOGGLE}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? `Collapse ${titleText}` : `Expand ${titleText}`}
      >
        <span className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {title}
        </span>
        <SectionToggleIcon open={open} />
      </button>
      {open ? (
        <div id={panelId} className="mt-2">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function SlaMeter({ state, dueLabel }) {
  const sla = getAgentSlaBarClasses(state);

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-semibold ${sla.text}`}>{state}</span>
        <span className="text-right text-xs font-medium text-slate-500">{dueLabel}</span>
      </div>
      <div className={`mt-3 h-1.5 overflow-hidden rounded-full ${sla.track}`}>
        <div className={`h-full rounded-full ${sla.fill}`} style={{ width: `${sla.width}%` }} />
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Resolution target is from ticket creation. Paused = clock stopped while waiting on the customer.
      </p>
    </div>
  );
}

function involvedInitials(name) {
  const s = String(name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return s.slice(0, 2).toUpperCase();
}

const TRANSFER_REASONS = [
  { value: "VACATION", label: "Vacation / time off" },
  { value: "OVERLOAD", label: "Workload overload" },
  { value: "EXPERTISE", label: "Specialist expertise needed" },
  { value: "KNOWLEDGE_GAP", label: "Knowledge gap on my side" },
];

function agentLoadLabel(agent) {
  const load = agent?.activeTicketCount ?? 0;
  const max = agent?.maxTicketLimit ?? "?";
  return `${agent?.agentName || "Agent"} (${load}/${max})`;
}

export default function RightRail({
  detail,
  rawTicket = null,
  attachments,
  people,
  involvedPeople = [],
  onDownloadAttachment,
  canEditMeta = false,
  /** When user confirms draft status & priority (single save). */
  onApplyMeta,
  statusSaving = false,
  prioritySaving = false,
  /** 'syncing' | 'timeout' | null — projection poll after action API */
  metaSyncState = null,
  onRequestCollapse,
  currentUserId = null,
  onTransfer,
  transferBusy = false,
  transferError = "",
  onApproveTransfer,
  onRejectTransfer,
  transferApprovalBusy = false,
  transferApprovalError = "",
  onForceClose,
  forceCloseBusy = false,
  forceCloseError = "",
  ticketMetaError = "",
}) {
  const statusCode = rawTicket?.status != null ? String(rawTicket.status) : "NEW";
  const priorityCode = rawTicket?.priority != null ? String(rawTicket.priority) : "MEDIUM";

  const [draftStatus, setDraftStatus] = useState(statusCode);
  const [draftPriority, setDraftPriority] = useState(priorityCode);

  const [transferOpen, setTransferOpen] = useState(false);
  const [toAgentId, setToAgentId] = useState("");
  const [transferReason, setTransferReason] = useState("EXPERTISE");
  const [transferNote, setTransferNote] = useState("");
  const [internalMessage, setInternalMessage] = useState("");
  const [peerAgents, setPeerAgents] = useState([]);
  const [peerAgentsLoading, setPeerAgentsLoading] = useState(false);
  const [peerAgentsError, setPeerAgentsError] = useState("");
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeReason, setCloseReason] = useState(AGENT_FORCE_CLOSE_REASONS[0]);
  const [resolutionNote, setResolutionNote] = useState("");
  const [resolveNoteError, setResolveNoteError] = useState("");
  const transferBusyPrevRef = useRef(false);
  const forceCloseBusyPrevRef = useRef(false);

  useEffect(() => {
    setDraftStatus(statusCode);
    setDraftPriority(priorityCode);
  }, [statusCode, priorityCode, rawTicket?.id, detail?.id]);

  useEffect(() => {
    setTransferOpen(false);
    setToAgentId("");
    setTransferReason("EXPERTISE");
    setTransferNote("");
    setInternalMessage("");
    setPeerAgentsError("");
    setCloseOpen(false);
    setCloseReason(AGENT_FORCE_CLOSE_REASONS[0]);
    setResolutionNote("");
    setResolveNoteError("");
  }, [rawTicket?.id, detail?.id]);

  useEffect(() => {
    if (forceCloseBusyPrevRef.current && !forceCloseBusy && !forceCloseError) {
      setCloseOpen(false);
    }
    forceCloseBusyPrevRef.current = forceCloseBusy;
  }, [forceCloseBusy, forceCloseError]);

  useEffect(() => {
    if (transferBusyPrevRef.current && !transferBusy && !transferError) {
      setTransferOpen(false);
      setToAgentId("");
      setTransferNote("");
      setInternalMessage("");
    }
    transferBusyPrevRef.current = transferBusy;
  }, [transferBusy, transferError]);

  const canForceClose =
    canEditMeta &&
    statusCode !== "CLOSED" &&
    typeof onForceClose === "function";

  const canTransfer =
    canEditMeta &&
    statusCode !== "CLOSED" &&
    !rawTicket?.pendingTransferToAgentId &&
    typeof onTransfer === "function";

  const pendingToMe =
    rawTicket?.pendingTransferToAgentId != null &&
    currentUserId != null &&
    Number(rawTicket.pendingTransferToAgentId) === Number(currentUserId);

  useEffect(() => {
    if (!canTransfer || !transferOpen) return undefined;

    let cancelled = false;
    setPeerAgentsLoading(true);
    setPeerAgentsError("");

    getAgentPeerCapacities()
      .then((agentData) => {
        if (cancelled) return;
        const rows = Array.isArray(agentData) ? agentData : [];
        const uid = currentUserId != null ? Number(currentUserId) : null;
        setPeerAgents(rows.filter((a) => uid == null || Number(a.agentId) !== uid));
      })
      .catch((err) => {
        if (cancelled) return;
        setPeerAgents([]);
        setPeerAgentsError(getApiErrorMessage(err, "Could not load agents."));
      })
      .finally(() => {
        if (!cancelled) setPeerAgentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canTransfer, transferOpen, currentUserId]);

  if (!detail) {
    return (
      <aside className="flex h-full min-h-0 w-[340px] shrink-0 flex-col border-l border-destrova-agent-border bg-destrova-agent-canvas">
        <p className="p-6 text-sm text-slate-500">Select a ticket</p>
      </aside>
    );
  }

  const statusOptions = getAgentStatusOptionsForSelect(draftStatus);
  const saving = statusSaving || prioritySaving;
  const syncing = metaSyncState === "syncing" || saving;
  const isTransitioningToResolved =
    draftStatus === "RESOLVED" && draftStatus !== statusCode;
  const needsResolutionNote =
    isTransitioningToResolved && !isResolutionNoteValid(resolutionNote);
  const isDirty = draftStatus !== statusCode || draftPriority !== priorityCode;
  const confirmLabel =
    metaSyncState === "syncing" ? "Syncing…" : saving ? "Saving…" : "Confirm changes";

  const resetDraft = () => {
    setDraftStatus(statusCode);
    setDraftPriority(priorityCode);
    setResolutionNote("");
    setResolveNoteError("");
  };

  const applyChanges = () => {
    if (!onApplyMeta || !isDirty) return;
    if (isTransitioningToResolved) {
      const note = resolutionNote.trim();
      if (!isResolutionNoteValid(note)) {
        setResolveNoteError(
          `Add at least ${RESOLUTION_NOTE_MIN_LENGTH} characters describing the solution.`,
        );
        return;
      }
    }
    setResolveNoteError("");
    onApplyMeta({
      status: draftStatus,
      priority: draftPriority,
      resolutionNote: isTransitioningToResolved ? resolutionNote.trim() : undefined,
    });
  };

  const submitTransfer = () => {
    if (!onTransfer || !toAgentId || !transferReason || transferBusy) return;
    onTransfer({
      toAgentId: Number(toAgentId),
      transferReason,
      transferNote,
      internalMessage,
    });
  };

  const submitForceClose = () => {
    if (!onForceClose || !closeReason || forceCloseBusy) return;
    onForceClose(closeReason);
  };

  const selectedPeer = peerAgents.find((a) => String(a.agentId) === String(toAgentId));
  const selectedAtCapacity =
    selectedPeer != null &&
    selectedPeer.maxTicketLimit != null &&
    (selectedPeer.activeTicketCount ?? 0) >= selectedPeer.maxTicketLimit;

  const slaDue =
    detail.slaState === "Breached"
      ? "Breached"
      : detail.slaState === "Paused"
        ? "Paused"
        : detail.slaDue || "—";

  const product = detail.productName ?? "—";
  const customer =
    detail.requesterName && String(detail.requesterName).trim() !== "" && detail.requesterName !== "—"
      ? detail.requesterName
      : detail.requesterEmail && String(detail.requesterEmail).trim() !== ""
        ? detail.requesterEmail
        : "—";

  const attachmentCount = Array.isArray(attachments) ? attachments.length : 0;

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-white">
      <SectionRegistryProvider>
      <div
        id="agent-properties-panel"
        className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4 pb-2 pt-2.5"
      >
        <div className="flex min-w-0 items-center gap-1">
          <h2 className="text-[15px] font-bold leading-none tracking-tight text-slate-800">Properties</h2>
          <PropertiesSectionsToggle />
        </div>
        {onRequestCollapse ? (
          <WorkspacePanelToggleButton side="right" open onToggle={onRequestCollapse} compact />
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-3 pt-1">
      <Section title="Status &amp; priority">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[12px] leading-relaxed text-slate-600">
            Change selections below, then confirm to save. Transitions follow your workflow rules.
          </p>
          <SyncStateChip state={metaSyncState} />
        </div>
        {!canEditMeta ? (
          <p className="mt-2 rounded-agent-button border border-amber-100 bg-amber-50/80 px-2.5 py-2 text-xs text-amber-900">
            Assign this ticket to yourself to change status and priority.
          </p>
        ) : null}

        <div className="mt-3 space-y-3">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Status</span>
            {canEditMeta ? (
              <select
                value={draftStatus}
                onChange={(e) => {
                  const next = e.target.value;
                  setDraftStatus(next);
                  if (next !== "RESOLVED" || next === statusCode) {
                    setResolutionNote("");
                    setResolveNoteError("");
                  }
                }}
                disabled={syncing}
                className={META_SELECT_CLASS}
                aria-label="Change ticket status"
              >
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <span
                className={`mt-1.5 inline-flex w-full max-w-full items-center justify-center rounded-full px-2 py-1.5 text-sm font-medium ${getAgentStatusClasses(statusCode)}`}
              >
                {mapTicketStatusToAgentLabel(statusCode)}
              </span>
            )}
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Priority</span>
            {canEditMeta ? (
              <select
                value={draftPriority}
                onChange={(e) => setDraftPriority(e.target.value)}
                disabled={syncing}
                className={META_SELECT_CLASS}
                aria-label="Change ticket priority"
              >
                {PRIORITY_API_VALUES.map((p) => (
                  <option key={p} value={p}>
                    {mapPriorityToAgentLabel(p)}
                  </option>
                ))}
              </select>
            ) : (
              <span
                className={`mt-1.5 inline-flex w-full max-w-full items-center justify-center rounded-full px-2 py-1.5 text-sm font-medium ${getAgentPriorityClasses(priorityCode)}`}
              >
                {mapPriorityToAgentLabel(priorityCode)}
              </span>
            )}
          </div>
          {canEditMeta && isTransitioningToResolved ? (
            <div className="rounded-agent-button border border-emerald-200/80 bg-emerald-50/60 px-3 py-3">
              <label
                htmlFor="agent-resolution-note"
                className="text-[10px] font-semibold uppercase tracking-wide text-emerald-900/90"
              >
                Solution summary
                <span className="text-rose-600"> *</span>
              </label>
              <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600">
                Customer-visible. They will review this before closing the request.
              </p>
              <textarea
                id="agent-resolution-note"
                rows={4}
                value={resolutionNote}
                onChange={(e) => {
                  setResolutionNote(e.target.value);
                  if (resolveNoteError) setResolveNoteError("");
                }}
                disabled={syncing}
                placeholder="e.g. VPN profile updated and connection verified on your device."
                className={FORM_TEXTAREA_CLASS}
              />
              {resolveNoteError ? (
                <p className="mt-1 text-[11.5px] font-medium text-rose-600" role="alert">
                  {resolveNoteError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {ticketMetaError ? (
          <p
            className="mt-3 rounded-lg border border-red-100 bg-red-50 px-2.5 py-2 text-[11.5px] text-red-800"
            role="alert"
          >
            {ticketMetaError}
          </p>
        ) : null}
        {canEditMeta && isDirty ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-destrova-agent-border pt-3">
            <button
              type="button"
              onClick={applyChanges}
              disabled={syncing || needsResolutionNote}
              className="inline-flex h-9 min-w-[7.5rem] items-center justify-center gap-1.5 rounded-agent-button bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {metaSyncState === "syncing" ? (
                <span
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  aria-hidden
                />
              ) : null}
              {confirmLabel}
            </button>
            <button
              type="button"
              onClick={resetDraft}
              disabled={syncing}
              className="inline-flex h-9 items-center rounded-agent-button border border-destrova-agent-border bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        ) : syncing && !isDirty ? (
          <p className="mt-2 text-xs font-medium text-blue-600">{confirmLabel}</p>
        ) : null}
      </Section>

      <Section title="Details">
        <dl className="divide-y divide-slate-100/90 text-sm">
          <div className="flex items-start justify-between gap-4 py-3 first:pt-0">
            <dt className="shrink-0 font-medium text-slate-500">Customer</dt>
            <dd className="max-w-[190px] text-right font-semibold text-slate-900">{customer}</dd>
          </div>
          <div className="flex items-start justify-between gap-4 py-3">
            <dt className="shrink-0 font-medium text-slate-500">Product</dt>
            <dd className="max-w-[190px] text-right font-semibold text-slate-900">{product}</dd>
          </div>
          <div className="flex justify-between gap-3 py-3 last:pb-0">
            <dt className="font-medium text-slate-500">Assignee</dt>
            <dd className="max-w-[190px] text-right font-semibold text-slate-900">
              {detail.assignee || "Unassigned"}
            </dd>
          </div>
          {statusCode === "RESOLVED" && rawTicket?.resolutionNote ? (
            <div className="flex flex-col gap-1 border-t border-slate-100 py-3">
              <dt className="font-medium text-slate-500">Solution summary</dt>
              <dd className="text-[12px] font-medium leading-relaxed text-slate-800">
                {rawTicket.resolutionNote}
              </dd>
            </div>
          ) : null}
          {statusCode === "CLOSED" && rawTicket?.closureReason ? (
            <div className="flex justify-between gap-3 border-t border-slate-100 py-3">
              <dt className="font-medium text-slate-500">Closure reason</dt>
              <dd className="max-w-[190px] text-right font-semibold text-slate-900">
                {formatClosureReason(rawTicket.closureReason)}
              </dd>
            </div>
          ) : null}
        </dl>
      </Section>

      {canForceClose ? (
        <Section title="Close request">
          {!closeOpen ? (
            <div>
              <p className="text-[12px] leading-relaxed text-slate-600">
                Close without customer approval for invalid, duplicate, or no-response cases.
              </p>
              <button
                type="button"
                onClick={() => setCloseOpen(true)}
                disabled={forceCloseBusy}
                className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-agent-button border border-destrova-agent-border bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
              >
                Close request
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[12px] leading-relaxed text-slate-600">
                Select why you are closing this request. This cannot be undone.
              </p>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Closure reason
                </span>
                <select
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  disabled={forceCloseBusy}
                  className={META_SELECT_CLASS}
                  aria-label="Closure reason"
                >
                  {FORCE_CLOSE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {forceCloseError ? (
                <p
                  className="rounded-lg border border-red-100 bg-red-50 px-2.5 py-2 text-[11.5px] text-red-800"
                  role="alert"
                >
                  {forceCloseError}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2 border-t border-destrova-agent-border pt-3">
                <button
                  type="button"
                  onClick={submitForceClose}
                  disabled={forceCloseBusy || !closeReason}
                  className="inline-flex h-9 min-w-[7.5rem] flex-1 items-center justify-center gap-1.5 rounded-agent-button bg-slate-800 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {forceCloseBusy ? (
                    <>
                      <span
                        className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                        aria-hidden
                      />
                      Closing…
                    </>
                  ) : (
                    "Confirm close"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setCloseOpen(false)}
                  disabled={forceCloseBusy}
                  className="inline-flex h-9 items-center rounded-agent-button border border-destrova-agent-border bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Section>
      ) : null}

      {canTransfer ? (
        <Section title="Transfer ticket">
          {!transferOpen ? (
            <div>
              <p className="text-[12px] leading-relaxed text-slate-600">
                Request handoff to another agent. They must accept before the ticket moves.
              </p>
              <button
                type="button"
                onClick={() => setTransferOpen(true)}
                disabled={transferBusy}
                className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-agent-button border border-destrova-agent-border bg-blue-50 px-3 text-sm font-semibold text-blue-900 transition hover:border-blue-200 hover:bg-blue-100/90 disabled:opacity-50"
              >
                Transfer to another agent
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[12px] leading-relaxed text-slate-600">
                Choose an agent and reason. They will be notified immediately.
              </p>

              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Transfer to</span>
                <select
                  value={toAgentId}
                  onChange={(e) => setToAgentId(e.target.value)}
                  disabled={transferBusy || peerAgentsLoading}
                  className={META_SELECT_CLASS}
                  aria-label="Transfer to agent"
                >
                  <option value="">
                    {peerAgentsLoading ? "Loading agents…" : "Select an agent"}
                  </option>
                  {peerAgents.map((a) => {
                    const full =
                      a.maxTicketLimit != null && (a.activeTicketCount ?? 0) >= a.maxTicketLimit;
                    return (
                      <option key={a.agentId} value={a.agentId} disabled={full}>
                        {agentLoadLabel(a)}
                        {full ? " — at capacity" : ""}
                      </option>
                    );
                  })}
                </select>
                {peerAgentsError ? (
                  <p className="mt-1.5 text-[11px] text-red-600">{peerAgentsError}</p>
                ) : null}
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Reason</span>
                <select
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  disabled={transferBusy}
                  className={META_SELECT_CLASS}
                  aria-label="Transfer reason"
                >
                  {TRANSFER_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Note <span className="font-normal normal-case text-slate-400">(optional)</span>
                </span>
                <textarea
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  disabled={transferBusy}
                  rows={2}
                  maxLength={500}
                  placeholder="Short summary for the transfer request…"
                  className={FORM_TEXTAREA_CLASS}
                />
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Internal message <span className="font-normal normal-case text-slate-400">(optional)</span>
                </span>
                <textarea
                  value={internalMessage}
                  onChange={(e) => setInternalMessage(e.target.value)}
                  disabled={transferBusy}
                  rows={3}
                  maxLength={2000}
                  placeholder="Extra internal note for the team — use @email to mention colleagues…"
                  className={FORM_TEXTAREA_CLASS}
                />
              </div>

              {selectedAtCapacity ? (
                <p className="rounded-lg border border-amber-100 bg-amber-50/90 px-2.5 py-2 text-[11.5px] text-amber-900">
                  {getAgentCapacityLimitMessage("peerWarning")}
                </p>
              ) : null}

              {transferError ? (
                <p className="rounded-lg border border-red-100 bg-red-50 px-2.5 py-2 text-[11.5px] text-red-800" role="alert">
                  {transferError}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 border-t border-destrova-agent-border pt-3">
                <button
                  type="button"
                  onClick={submitTransfer}
                  disabled={transferBusy || !toAgentId || selectedAtCapacity || peerAgentsLoading}
                  className="inline-flex h-9 min-w-[7.5rem] flex-1 items-center justify-center gap-1.5 rounded-agent-button bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {transferBusy ? (
                    <>
                      <span
                        className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                        aria-hidden
                      />
                      Transferring…
                    </>
                  ) : (
                    "Send transfer request"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTransferOpen(false);
                    setToAgentId("");
                    setTransferNote("");
                  }}
                  disabled={transferBusy}
                  className="inline-flex h-9 items-center rounded-agent-button border border-destrova-agent-border bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Section>
      ) : pendingToMe ? (
        <Section title="Transfer approval">
          <p className="text-[12px] leading-relaxed text-amber-950">
            <span className="font-semibold">{rawTicket?.pendingTransferFromAgentName || "A colleague"}</span>{" "}
            wants to transfer this ticket to you. Reason:{" "}
            <span className="font-medium">
              {(rawTicket?.pendingTransferReason || "—").replace(/_/g, " ")}
            </span>
            {rawTicket?.pendingTransferNote ? ` — ${rawTicket.pendingTransferNote}` : ""}.
          </p>
          <p className="mt-2 text-[11.5px] text-slate-600">
            Accept to take ownership, or decline to keep it with the current assignee.
          </p>
          {transferApprovalError ? (
            <p className="mt-2 rounded-lg border border-red-100 bg-red-50 px-2.5 py-2 text-[11.5px] text-red-800" role="alert">
              {transferApprovalError}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onApproveTransfer?.()}
              disabled={transferApprovalBusy}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-agent-button bg-emerald-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {transferApprovalBusy ? "Working…" : "Accept transfer"}
            </button>
            <button
              type="button"
              onClick={() => onRejectTransfer?.()}
              disabled={transferApprovalBusy}
              className="inline-flex h-9 items-center rounded-agent-button border border-destrova-agent-border bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </Section>
      ) : rawTicket?.pendingTransferToAgentId &&
        rawTicket?.pendingTransferFromAgentId != null &&
        currentUserId != null &&
        Number(rawTicket.pendingTransferFromAgentId) === Number(currentUserId) ? (
        <Section title="Transfer ticket">
          <p className="text-sm leading-relaxed text-blue-900">
            Waiting for{" "}
            <span className="font-semibold">
              {rawTicket.pendingTransferToAgentName || "the other agent"}
            </span>{" "}
            to accept your transfer request.
          </p>
        </Section>
      ) : null}

      <Section title="SLA">
        <SlaMeter state={detail.slaState} dueLabel={slaDue} />
      </Section>
      <Section title="People">
        <ul className="space-y-4">
          {(Array.isArray(people) && people.length > 0 ? people : []).map((p) => (
            <li key={`${p.role}-${p.name}`} className="text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {p.role}
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{p.name}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{p.email}</p>
            </li>
          ))}
        </ul>
        {Array.isArray(involvedPeople) && involvedPeople.length > 0 ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Involved (mentions)</p>
            <ul className="mt-2 flex flex-col gap-2">
              {involvedPeople.map((p) => (
                <li
                  key={p.email}
                  className="flex items-center gap-2.5 rounded-agent-button border border-destrova-agent-border bg-slate-50 px-2.5 py-2"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">
                    {involvedInitials(p.displayName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{p.displayName}</p>
                    <p className="truncate text-xs text-slate-500">{p.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>
      <Section title={attachmentCount > 0 ? `Attachments (${attachmentCount})` : "Attachments"}>
        <ul className="space-y-2.5">
          {(Array.isArray(attachments) && attachments.length > 0 ? attachments : []).map((a) => (
            <li
              key={a.id ?? a.name}
              className="flex items-start justify-between gap-2 rounded-agent-button border border-destrova-agent-border bg-slate-50/80 px-3 py-2.5 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{a.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {a.size} · {a.who} · {a.when}
                </p>
              </div>
              {onDownloadAttachment && a.id != null ? (
                <button
                  type="button"
                  onClick={() => onDownloadAttachment(a.id, a.name)}
                  className="shrink-0 rounded-agent-button p-1.5 text-slate-500 transition hover:bg-white hover:text-blue-600"
                  title="Download"
                  aria-label={`Download ${a.name}`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M12 3v10m0 0l3.5-3.5M12 13L8.5 9.5M5 19h14"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {attachmentCount === 0 ? (
          <p className="text-sm text-slate-500">No attachments on this ticket.</p>
        ) : null}
      </Section>
      </div>
      </SectionRegistryProvider>
    </aside>
  );
}
