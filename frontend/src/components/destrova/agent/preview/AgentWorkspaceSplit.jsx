import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import AppShell from "../../shell/AppShell";
import TicketListPanel from "../components/TicketListPanel";
import WorkspaceDetailPane from "../components/WorkspaceDetailPane";
import { isTicketActive, isTicketInvolvedForAgent } from "../data/workspaceModel";
import { getRoleDefaultLanding, getRoleNavItem, SHELL_ROLES } from "../../shell/roleConfig";
import { useAgentShell } from "../../shell/AgentShellContext";
import { ticketMatchesGlobalSearch } from "../data/ticketSearch";
import WorklogSummaryView from "../components/WorklogSummaryView";
import KnowledgeBaseView from "../components/KnowledgeBaseView";
import { useTickets } from "../../../../hooks/useTickets";
import { useKeycloak } from "../../../../context/KeycloakContext";
import {
  mapBackendTicketToAgentRow,
  mapBackendTicketToWorkspaceDetail,
  mapBackendAttachmentsForRail,
  buildAgentTimelineEvents,
  buildAgentPeopleFromDetail,
} from "../mappers/agentTicketMappers";
import {
  getTicketById,
  getAttachments,
  addComment,
  addWorklog,
  downloadAttachment,
  uploadAttachment,
  getApiErrorMessage,
} from "../../../../services/api";
import {
  buildExpectedProjection,
  executeTicketAction,
  getDestrovaApiErrorMessage,
  ProjectionTimeoutError,
  waitForTicketProjection,
} from "../../shared/api/ticketActions";
import { getActionForStatusTransition } from "../data/ticketStatusGraph";

/** Narrow list column (master) — matches compact ticket rail reference */
const LEFT_MIN_WIDTH = 248;
const LEFT_MAX_WIDTH = 440;
const RIGHT_MIN_WIDTH = 420;
const SPLIT_STORAGE_KEY = "destrova.agent.split.leftWidth.v2";
/** @param {string|number} userId */
const agentSeenStorageKey = (userId) => `destrova.agent.seenUpdatedAtByTicket.v1.${userId ?? "anon"}`;

// TODO: replace local seen state with backend read-receipt / notification API when available.

/**
 * Inbox + split panes: must render under AgentShellProvider (inside AppShell main).
 */
export function AgentWorkspaceMain({ role, activeSection, initialTicketId }) {
  const { tickets, loading, error, reload } = useTickets();
  const { appUser, user: keycloakUser } = useKeycloak();
  const agentEmailForInvolved = appUser?.email || keycloakUser?.email || null;
  const [selectedId, setSelectedId] = useState(() => {
    if (initialTicketId == null || String(initialTicketId).trim() === "") {
      return null;
    }
    return String(initialTicketId);
  });
  const [composerTab, setComposerTab] = useState("external");
  const [savedView, setSavedView] = useState("mine");
  const { ticketSearchQuery, registerTicketOpener } = useAgentShell();

  useEffect(() => {
    return registerTicketOpener((id) => setSelectedId(id));
  }, [registerTicketOpener]);
  const [isDragging, setIsDragging] = useState(false);
  const [leftWidth, setLeftWidth] = useState(null);
  const containerRef = useRef(null);
  const dragRafRef = useRef(null);
  const pendingWidthRef = useRef(null);
  const metaInFlightRef = useRef(false);
  const composerInFlightRef = useRef(false);
  const assignInFlightRef = useRef(false);
  const lastDetailLoadIdRef = useRef(null);

  const [detailTicket, setDetailTicket] = useState(null);
  const [detailAttachments, setDetailAttachments] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [composerBusy, setComposerBusy] = useState(false);
  const [composerError, setComposerError] = useState("");
  const [ticketMetaError, setTicketMetaError] = useState("");
  const [ticketStatusSaving, setTicketStatusSaving] = useState(false);
  const [ticketPrioritySaving, setTicketPrioritySaving] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [optimisticOverlay, setOptimisticOverlay] = useState(null);
  const [syncState, setSyncState] = useState(null);
  const [seenUpdatedAtByTicket, setSeenUpdatedAtByTicket] = useState({});
  const detailSnapshotRef = useRef(null);

  const loadTicketDetail = useCallback(async (idStr) => {
    if (idStr == null || String(idStr).trim() === "") {
      lastDetailLoadIdRef.current = null;
      setDetailTicket(null);
      setDetailAttachments([]);
      setDetailError(null);
      return;
    }
    const idKey = String(idStr).trim();
    if (lastDetailLoadIdRef.current !== idKey) {
      setDetailTicket(null);
      setDetailAttachments([]);
      lastDetailLoadIdRef.current = idKey;
    }
    setDetailLoading(true);
    setDetailError(null);
    try {
      const tid = Number(idStr);
      const [t, atts] = await Promise.all([getTicketById(tid), getAttachments(tid)]);
      setDetailTicket(t);
      setDetailAttachments(Array.isArray(atts) ? atts : []);
      if (t?.id != null) {
        const uAt = t.updatedAt || t.createdAt;
        if (uAt) {
          setSeenUpdatedAtByTicket((prev) => ({ ...prev, [String(t.id)]: uAt }));
        }
      }
    } catch (e) {
      const msg = getApiErrorMessage(e, "Failed to load ticket");
      setDetailError(msg);
      if (import.meta.env.DEV) {
        console.error("[agent] loadTicketDetail", idKey, e?.response?.status, e?.response?.data);
      }
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (appUser?.id == null) return;
    try {
      const raw = window.localStorage.getItem(agentSeenStorageKey(appUser.id));
      if (!raw) return;
      const o = JSON.parse(raw);
      if (o && typeof o === "object" && !Array.isArray(o)) {
        setSeenUpdatedAtByTicket((prev) => ({ ...o, ...prev }));
      }
    } catch {
      /* ignore */
    }
  }, [appUser?.id]);

  useEffect(() => {
    if (appUser?.id == null) return;
    try {
      window.localStorage.setItem(agentSeenStorageKey(appUser.id), JSON.stringify(seenUpdatedAtByTicket));
    } catch {
      /* ignore */
    }
  }, [appUser?.id, seenUpdatedAtByTicket]);

  const clampLeftWidth = useCallback((width) => {
    const containerWidth = containerRef.current?.clientWidth || 0;
    const maxByViewport = Math.max(LEFT_MIN_WIDTH, containerWidth - RIGHT_MIN_WIDTH);
    const effectiveMax = Math.min(LEFT_MAX_WIDTH, maxByViewport);
    return Math.min(Math.max(width, LEFT_MIN_WIDTH), effectiveMax);
  }, []);

  useEffect(() => {
    const containerWidth = containerRef.current?.clientWidth;
    if (!containerWidth) return;
    const savedWidthRaw = window.localStorage.getItem(SPLIT_STORAGE_KEY);
    const savedWidth = savedWidthRaw ? Number(savedWidthRaw) : NaN;
    const defaultWidth = clampLeftWidth(containerWidth * 0.28);
    const initialWidth = Number.isFinite(savedWidth) ? clampLeftWidth(savedWidth) : defaultWidth;
    setLeftWidth(initialWidth);
  }, [clampLeftWidth]);

  useEffect(() => {
    if (!Number.isFinite(leftWidth)) return;
    window.localStorage.setItem(SPLIT_STORAGE_KEY, String(leftWidth));
  }, [leftWidth]);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const observer = new ResizeObserver(() => {
      setLeftWidth((current) => {
        if (!Number.isFinite(current)) return current;
        return clampLeftWidth(current);
      });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [clampLeftWidth]);

  useEffect(() => {
    if (!isDragging) return undefined;
    const onMouseMove = (event) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      pendingWidthRef.current = clampLeftWidth(event.clientX - rect.left);
      if (dragRafRef.current) return;
      dragRafRef.current = window.requestAnimationFrame(() => {
        dragRafRef.current = null;
        if (Number.isFinite(pendingWidthRef.current)) {
          setLeftWidth(pendingWidthRef.current);
        }
      });
    };
    const onMouseUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (dragRafRef.current) {
        window.cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
    };
  }, [isDragging, clampLeftWidth]);

  const agentRows = useMemo(
    () =>
      tickets.map((t) => {
        const row = mapBackendTicketToAgentRow(t, {
          currentUserId: appUser?.id,
          seenUpdatedAtByTicket,
        });
        return {
          ...row,
          mentionInvolved: isTicketInvolvedForAgent(t, { email: agentEmailForInvolved }),
        };
      }),
    [tickets, appUser?.id, appUser?.email, agentEmailForInvolved, seenUpdatedAtByTicket],
  );

  

  const listTickets = useMemo(
    () => agentRows.filter((t) => ticketMatchesGlobalSearch(t, ticketSearchQuery)),
    [agentRows, ticketSearchQuery],
  );

  const visibleQueueTickets = useMemo(() => {
    let rows = listTickets.filter(isTicketActive);
  
    if (savedView === "mine") {
      rows = rows.filter((t) => t.assignee === "You");
    }
  
    if (savedView === "unassigned") {
      rows = rows.filter((t) => !t.assignee);
    }
  
    return rows;
  }, [listTickets, savedView]);

  useEffect(() => {
    if (loading || error) {
      return;
    }

    const initial =
      initialTicketId != null && String(initialTicketId).trim() !== ""
        ? String(initialTicketId).trim()
        : null;

    const initialRow = initial ? listTickets.find((r) => String(r.id) === initial) : null;

    if (visibleQueueTickets.length === 0) {
      if (initialRow) {
        setSelectedId(initial);
        return;
      }
      setSelectedId(null);
      setDetailTicket(null);
      setDetailAttachments([]);
      setDetailError(null);
      return;
    }

    setSelectedId((prev) => {
      if (prev && listTickets.some((r) => String(r.id) === String(prev))) {
        return prev;
      }

      if (initialRow) {
        return String(initialRow.id);
      }

      const firstActive = visibleQueueTickets.find(isTicketActive);
      if (firstActive) {
        return String(firstActive.id);
      }

      return String(visibleQueueTickets[0].id);
    });
  }, [loading, error, visibleQueueTickets, listTickets, initialTicketId]);

  const selectedRow = useMemo(() => {
    if (selectedId == null) {
      return null;
    }
    return agentRows.find((t) => String(t.id) === String(selectedId)) || null;
  }, [agentRows, selectedId]);

  useEffect(() => {
    setComposerError("");
    setTicketMetaError("");
    setAssignError("");
    setOptimisticOverlay(null);
    setSyncState(null);
    loadTicketDetail(selectedId);
  }, [selectedId, loadTicketDetail]);

  const displayTicket = useMemo(() => {
    if (!detailTicket) return null;
    if (!optimisticOverlay) return detailTicket;
    return { ...detailTicket, ...optimisticOverlay };
  }, [detailTicket, optimisticOverlay]);

  const runActionWithPoll = useCallback(async (ticketId, action, body, expectedProjection) => {
    const accepted = await executeTicketAction(ticketId, action, body);
    const expected =
      expectedProjection ??
      accepted?.expectedProjection ??
      buildExpectedProjection(action, body ?? {});
    return waitForTicketProjection(ticketId, expected, accepted?.poll, () => getTicketById(ticketId));
  }, []);

  const handleAssignToMe = useCallback(async () => {
    if (selectedId == null || appUser?.id == null) return;
    if (assignInFlightRef.current) return;
    assignInFlightRef.current = true;
    detailSnapshotRef.current = detailTicket;
    setAssignBusy(true);
    setAssignError("");
    setTicketMetaError("");
    setSyncState("syncing");
    setOptimisticOverlay({
      assigneeId: Number(appUser.id),
      status: "IN_PROGRESS",
    });
    try {
      const assigneeId = Number(appUser.id);
      const confirmed = await runActionWithPoll(
        Number(selectedId),
        "assign",
        { assigneeId },
        buildExpectedProjection("assign", { assigneeId }),
      );
      setOptimisticOverlay(null);
      setSyncState(null);
      setDetailTicket(confirmed);
      await reload();
    } catch (e) {
      if (e instanceof ProjectionTimeoutError) {
        setSyncState("timeout");
        setAssignError("Assignment sent — still syncing. Refresh if the ticket looks unchanged.");
      } else {
        setOptimisticOverlay(null);
        setSyncState(null);
        if (detailSnapshotRef.current) setDetailTicket(detailSnapshotRef.current);
        setAssignError(getDestrovaApiErrorMessage(e, "Could not assign ticket."));
      }
    } finally {
      assignInFlightRef.current = false;
      setAssignBusy(false);
    }
  }, [selectedId, appUser?.id, detailTicket, runActionWithPoll, reload]);

  const canEditTicketMeta = Boolean(
    displayTicket &&
      appUser?.id != null &&
      displayTicket.assigneeId != null &&
      Number(displayTicket.assigneeId) === Number(appUser.id),
  );

  const involvedOnlyRestrictComposer = useMemo(() => {
    if (!detailTicket || appUser?.id == null) return false;
    const isAssignee =
      detailTicket.assigneeId != null && Number(detailTicket.assigneeId) === Number(appUser.id);
    if (isAssignee) return false;
    return isTicketInvolvedForAgent(detailTicket, { email: agentEmailForInvolved });
  }, [detailTicket, appUser?.id, agentEmailForInvolved]);

  useEffect(() => {
    if (involvedOnlyRestrictComposer && (composerTab === "external" || composerTab === "worklog")) {
      setComposerTab("internal");
    }
  }, [involvedOnlyRestrictComposer, composerTab, selectedId]);

  /** Right rail: status and/or priority via action API (sequential: status then priority). */
  const handleApplyRightRailMeta = useCallback(
    async ({ status, priority }) => {
      if (selectedId == null || !detailTicket) return;
      if (metaInFlightRef.current) return;

      const fromStatus = String(detailTicket.status ?? "NEW");
      const fromPriority = String(detailTicket.priority ?? "MEDIUM");
      const nextStatus = status != null ? String(status) : fromStatus;
      const nextPriority = priority != null ? String(priority) : fromPriority;

      if (nextStatus === "CLOSED") {
        setTicketMetaError("Only the customer can close a request after they confirm the solution.");
        return;
      }

      const statusChanged = nextStatus !== fromStatus;
      const priorityChanged = nextPriority !== fromPriority;
      if (!statusChanged && !priorityChanged) return;

      metaInFlightRef.current = true;
      detailSnapshotRef.current = detailTicket;
      setTicketStatusSaving(true);
      setTicketPrioritySaving(true);
      setTicketMetaError("");
      setSyncState("syncing");

      const overlay = {};
      if (statusChanged) overlay.status = nextStatus;
      if (priorityChanged) overlay.priority = nextPriority;
      setOptimisticOverlay(overlay);

      try {
        const ticketId = Number(selectedId);
        if (statusChanged) {
          let action = getActionForStatusTransition(fromStatus, nextStatus);
          let body = {};
          let expected;

          if (!action && fromStatus === "NEW" && nextStatus === "IN_PROGRESS") {
            const assigneeId = Number(appUser.id);
            action = "assign";
            body = { assigneeId };
            expected = buildExpectedProjection("assign", { assigneeId, status: "IN_PROGRESS" });
          } else if (!action) {
            throw new Error(`Unsupported status transition: ${fromStatus} → ${nextStatus}`);
          } else {
            expected = buildExpectedProjection(action, { status: nextStatus });
          }

          const afterStatus = await runActionWithPoll(ticketId, action, body, expected);
          setDetailTicket(afterStatus);
        }

        if (priorityChanged) {
          const expected = buildExpectedProjection("change-priority", { priority: nextPriority });
          const afterPriority = await runActionWithPoll(
            ticketId,
            "change-priority",
            { priority: nextPriority },
            expected,
          );
          setDetailTicket(afterPriority);
        }

        setOptimisticOverlay(null);
        setSyncState(null);
        await reload();
      } catch (e) {
        if (e instanceof ProjectionTimeoutError) {
          setSyncState("timeout");
          setTicketMetaError(
            "Changes were sent — still syncing. Refresh if status or priority looks unchanged.",
          );
          await reload();
        } else {
          setOptimisticOverlay(null);
          setSyncState(null);
          if (detailSnapshotRef.current) setDetailTicket(detailSnapshotRef.current);
          if (import.meta.env.DEV) {
            console.error("[agent] apply meta", e?.response?.status, e?.response?.data, e);
          }
          setTicketMetaError(
            getDestrovaApiErrorMessage(e, getApiErrorMessage(e, "Could not update ticket.")),
          );
        }
      } finally {
        metaInFlightRef.current = false;
        setTicketStatusSaving(false);
        setTicketPrioritySaving(false);
      }
    },
    [selectedId, detailTicket, appUser?.id, runActionWithPoll, reload],
  );

  const detail = useMemo(
    () => (selectedRow ? mapBackendTicketToWorkspaceDetail(displayTicket, { selectedRow, appUser }) : null),
    [displayTicket, selectedRow, appUser],
  );
  const extras = useMemo(() => {
    if (!selectedRow) {
      return { timeline: [], attachments: [], people: [], linked: false };
    }
    return {
      timeline: displayTicket ? buildAgentTimelineEvents(displayTicket, detailAttachments) : [],
      attachments: mapBackendAttachmentsForRail(detailAttachments),
      people: buildAgentPeopleFromDetail(detail),
      linked: false,
    };
  }, [selectedRow, displayTicket, detailAttachments, detail]);

  const handleSendExternal = useCallback(
    async (html, files = []) => {
      if (selectedId == null) return;
      if (composerInFlightRef.current) return;
      composerInFlightRef.current = true;
      setComposerBusy(true);
      setComposerError("");
      try {
        const message = DOMPurify.sanitize(html);
        if (!message.trim()) {
          return;
        }
        const tid = Number(selectedId);
        await addComment(tid, { message, isInternal: false });
        const toUpload = Array.isArray(files) ? files : [];
        let fail = 0;
        for (const file of toUpload) {
          try {
            await uploadAttachment(tid, file);
          } catch {
            fail += 1;
          }
        }
        if (fail > 0) {
          setComposerError(
            fail === toUpload.length
              ? "Message sent, but attachments could not be uploaded."
              : `Message sent. ${toUpload.length - fail} file(s) uploaded, ${fail} failed.`,
          );
        }
        await loadTicketDetail(selectedId);
        await reload();
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Could not send reply";
        setComposerError(msg);
        throw e;
      } finally {
        composerInFlightRef.current = false;
        setComposerBusy(false);
      }
    },
    [selectedId, loadTicketDetail, reload],
  );

  const handleSendInternal = useCallback(
    async (html, files = []) => {
      if (selectedId == null) return;
      if (composerInFlightRef.current) return;
      composerInFlightRef.current = true;
      setComposerBusy(true);
      setComposerError("");
      try {
        const message = DOMPurify.sanitize(html);
        if (!message.trim()) return;
        const tid = Number(selectedId);
        await addComment(tid, { message, isInternal: true });
        const toUpload = Array.isArray(files) ? files : [];
        let fail = 0;
        for (const file of toUpload) {
          try {
            await uploadAttachment(tid, file);
          } catch {
            fail += 1;
          }
        }
        if (fail > 0) {
          setComposerError(
            fail === toUpload.length
              ? "Note added, but attachments could not be uploaded."
              : `Note added. ${toUpload.length - fail} file(s) uploaded, ${fail} failed.`,
          );
        }
        await loadTicketDetail(selectedId);
        await reload();
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Could not add internal note";
        setComposerError(msg);
        throw e;
      } finally {
        composerInFlightRef.current = false;
        setComposerBusy(false);
      }
    },
    [selectedId, loadTicketDetail, reload],
  );

  const handleSendWorklog = useCallback(
    async (durationMinutes, descriptionPlain) => {
      if (selectedId == null) return;
      if (composerInFlightRef.current) return;
      composerInFlightRef.current = true;
      setComposerBusy(true);
      setComposerError("");
      try {
        await addWorklog(Number(selectedId), { durationMinutes, description: descriptionPlain });
        await loadTicketDetail(selectedId);
        await reload();
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Could not add worklog";
        setComposerError(msg);
        throw e;
      } finally {
        composerInFlightRef.current = false;
        setComposerBusy(false);
      }
    },
    [selectedId, loadTicketDetail, reload],
  );

  const handleDownloadAttachment = useCallback(
    async (attachmentId, fileName) => {
      if (selectedId == null) return;
      setComposerError("");
      try {
        await downloadAttachment(Number(selectedId), attachmentId, fileName);
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Download failed";
        setComposerError(msg);
      }
    },
    [selectedId],
  );
  const activeNav = getRoleNavItem(role, activeSection);

  if (activeSection === "worklogSummary") {
    return <WorklogSummaryView />;
  }

  if (activeSection === "knowledgeBase") {
    return <KnowledgeBaseView />;
  }

  if (activeSection !== "inbox") {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 bg-[#F8FAFC] p-4 md:p-5">
        <section className="flex min-h-0 w-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">{activeNav?.label}</h2>
          <p className="mt-1 text-sm text-slate-500">Preview content for {activeNav?.label}. Detailed page implementation will be added in next phase.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Section summary panel</div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Operational widgets placeholder</div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden bg-[#F4F6FB] px-3 py-3 md:px-4 md:py-4"
    >
      <div
        className="flex h-full min-h-0 min-w-0 shrink-0 flex-col overflow-hidden rounded-xl border border-[#E3E6F2] bg-white shadow-[0_6px_18px_-16px_rgba(15,14,71,0.35)]"
        style={{ width: Number.isFinite(leftWidth) ? `${leftWidth}px` : "28%" }}
      >
        {loading ? (
          <div className="flex min-h-[220px] flex-1 flex-col items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
            <span>Loading tickets…</span>
          </div>
        ) : error ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-4 py-10 text-center text-sm text-slate-600">
            <p className="max-w-[20rem]">{error}</p>
            <button
              type="button"
              onClick={() => reload()}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Retry
            </button>
          </div>
        ) : (
          <TicketListPanel
            tickets={listTickets}
            selectedId={selectedId}
            savedView={savedView}
            onViewChange={setSavedView}
            onSelect={setSelectedId}
          />
        )}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panels"
        onMouseDown={() => setIsDragging(true)}
        className={[
          "relative mx-1 shrink-0 cursor-col-resize select-none rounded-full transition-all",
          isDragging ? "w-1.5 bg-[#505081]" : "w-1.5 bg-transparent hover:bg-[#CDD2E6]",
        ].join(" ")}
      />
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#E3E6F2] bg-white shadow-[0_6px_18px_-16px_rgba(15,14,71,0.35)]">
        <WorkspaceDetailPane
          detail={detail}
          extras={extras}
          composerTab={composerTab}
          onComposerTabChange={setComposerTab}
          detailLoading={detailLoading}
          detailError={detailError}
          onSendExternal={handleSendExternal}
          onSendInternal={handleSendInternal}
          onSendWorklog={handleSendWorklog}
          composerBusy={composerBusy}
          composerError={composerError}
          onDownloadAttachment={handleDownloadAttachment}
          selectedTicketId={selectedId}
          rawTicket={displayTicket}
          canEditTicketMeta={canEditTicketMeta}
          onApplyRightRailMeta={handleApplyRightRailMeta}
          ticketStatusSaving={ticketStatusSaving}
          ticketPrioritySaving={ticketPrioritySaving}
          ticketMetaError={ticketMetaError}
          metaSyncState={syncState}
          onAssignToMe={handleAssignToMe}
          assignBusy={assignBusy}
          assignError={assignError}
          restrictComposerForInvolved={involvedOnlyRestrictComposer}
        />
      </div>
    </div>
  );
}

export default function AgentWorkspaceSplit({ initialTicketId, role = SHELL_ROLES.AGENT }) {
  const [activeSection, setActiveSection] = useState(getRoleDefaultLanding(role));

  useEffect(() => {
    setActiveSection(getRoleDefaultLanding(role));
  }, [role]);

  const activeNav = getRoleNavItem(role, activeSection);

  return (
    <AppShell
      role={role}
      activeNavId={activeSection}
      onNavChange={setActiveSection}
      topbarTitle={activeNav?.label || "ITSM Ticket Management"}
    >
      <AgentWorkspaceMain role={role} activeSection={activeSection} initialTicketId={initialTicketId} />
    </AppShell>
  );
}
