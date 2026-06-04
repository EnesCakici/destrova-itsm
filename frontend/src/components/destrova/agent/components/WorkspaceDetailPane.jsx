import { useCallback, useMemo, useRef, useState } from "react";
import TicketHeader from "./TicketHeader";
import QuickActions from "./QuickActions";
import TicketComposer from "./TicketComposer";
import Timeline from "./Timeline";
import RightRail from "./RightRail";
import RightRailCollapsed from "./RightRailCollapsed";
import { listInvolvedMentionPeopleFromTicket } from "../data/workspaceModel";
import { AGENT_WORKSPACE } from "../agentTokens";

const RIGHT_RAIL_OPEN_KEY = "destrova.agent.rightRail.open.v1";

function readRightRailOpenPreference() {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(RIGHT_RAIL_OPEN_KEY) !== "false";
  } catch {
    return true;
  }
}

function persistRightRailOpenPreference(open) {
  try {
    localStorage.setItem(RIGHT_RAIL_OPEN_KEY, open ? "true" : "false");
  } catch {
    /* ignore */
  }
}

/**
 * Center column: header + conversation (timeline) + fixed composer strip.
 * Initial ticket text lives in timeline as "Original request".
 */
export default function WorkspaceDetailPane({
  detail,
  extras,
  composerTab,
  onComposerTabChange,
  detailLoading = false,
  detailError = "",
  onSendExternal,
  onSendInternal,
  onSendWorklog,
  composerBusy = false,
  composerError = "",
  onDownloadAttachment,
  selectedTicketId,
  rawTicket = null,
  canEditTicketMeta = false,
  onApplyRightRailMeta,
  ticketStatusSaving = false,
  ticketPrioritySaving = false,
  ticketMetaError = "",
  metaSyncState = null,
  onAssignToMe,
  assignBusy = false,
  assignError = "",
  restrictComposerForInvolved = false,
  currentUserId = null,
  onTransferTicket,
  transferBusy = false,
  transferError = "",
  onApproveTransfer,
  onRejectTransfer,
  transferApprovalBusy = false,
  transferApprovalError = "",
  onForceClose,
  forceCloseBusy = false,
  forceCloseError = "",
}) {
  const hasTicket = detail != null;

  const involvedPeople = useMemo(() => listInvolvedMentionPeopleFromTicket(rawTicket), [rawTicket]);
  const timelineScrollRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  const scrollTimelineToLatest = useCallback(() => {
    const el = timelineScrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, []);

  const [rightRailOpen, setRightRailOpen] = useState(readRightRailOpenPreference);

  const toggleRightRail = useCallback(() => {
    setRightRailOpen((prev) => {
      const next = !prev;
      persistRightRailOpenPreference(next);
      return next;
    });
  }, []);

  const attachmentCount = extras?.attachments?.length ?? 0;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 gap-0 transition-opacity duration-150 ease-out md:gap-1">
      <main
        className={[
          "center-column flex h-full min-h-0 min-w-0 flex-1 flex-col",
          AGENT_WORKSPACE.panel,
        ].join(" ")}
      >
        <div className="shrink-0">
          <TicketHeader detail={detail} metaError={ticketMetaError} />
          {hasTicket ? (
            <QuickActions
              detail={detail}
              rawTicket={rawTicket}
              currentUserId={currentUserId}
              onAssignToMe={onAssignToMe}
              assignBusy={assignBusy}
              assignError={assignError}
              onApproveTransfer={onApproveTransfer}
              onRejectTransfer={onRejectTransfer}
              transferApprovalBusy={transferApprovalBusy}
              transferApprovalError={transferApprovalError}
            />
          ) : null}
        </div>

        {hasTicket ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/40">
            <div
              ref={timelineScrollRef}
              className="timeline-scroll-area min-h-[min(42vh,380px)] flex-1 overflow-y-auto overflow-x-hidden scroll-smooth px-3 pb-2 pt-1.5 sm:px-4 sm:pb-2.5 sm:pt-2"
            >
              {detailError ? (
                <p className="mb-2 rounded-lg border border-red-100 bg-red-50 px-2.5 py-2 text-sm text-red-800" role="alert">
                  {detailError}
                </p>
              ) : null}
              {detailLoading && !detailError ? (
                <p className="text-sm text-slate-500">Loading conversation…</p>
              ) : (
                <Timeline
                  events={extras.timeline}
                  onDownloadAttachment={onDownloadAttachment}
                  ticketId={selectedTicketId != null ? Number(selectedTicketId) : null}
                />
              )}
            </div>

            <div className="ticket-composer-dock shrink-0 overflow-hidden border-t border-destrova-agent-border bg-white shadow-[0_-8px_24px_rgba(15,23,42,0.06)]">
              <TicketComposer
                key={detail?.id ?? "no-ticket"}
                tab={composerTab}
                onTabChange={onComposerTabChange}
                onSendExternal={onSendExternal}
                onSendInternal={onSendInternal}
                onSendWorklog={onSendWorklog}
                busy={composerBusy}
                errorText={composerError}
                docked
                restrictExternalAndWorklogForInvolved={restrictComposerForInvolved}
                onComposerExpand={scrollTimelineToLatest}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-slate-50/30 px-6 py-16 text-sm text-slate-500">
            <div className="flex flex-1 items-center justify-center bg-slate-50/30 px-6 py-16 text-center">
  <div className="max-w-sm rounded-agent-card border border-destrova-agent-border bg-white px-6 py-7 shadow-agent-card">
    <p className="text-sm font-semibold text-slate-900">No tickets in this queue</p>
    <p className="mt-2 text-sm leading-6 text-slate-500">
    You don’t have any active tickets in this queue. Assigned tickets and available unassigned requests will appear here when they’re ready to work on.
    </p>
  </div>
</div>
            
            
            
            </div>
        )}
      </main>

    {hasTicket ? (
      <div className="flex h-full min-h-0 shrink-0">
        <div
          className={[
            "h-full overflow-hidden transition-[width] duration-200 ease-out",
            rightRailOpen ? "w-[300px] sm:w-[320px]" : "pointer-events-none w-0 opacity-0",
          ].join(" ")}
          aria-hidden={!rightRailOpen}
        >
          <RightRail
            key={detail?.id || "no-ticket"}
            detail={detail}
            rawTicket={rawTicket}
            attachments={extras.attachments}
            people={extras.people}
            involvedPeople={involvedPeople}
            onDownloadAttachment={onDownloadAttachment}
            canEditMeta={canEditTicketMeta}
            onApplyMeta={onApplyRightRailMeta}
            statusSaving={ticketStatusSaving}
            prioritySaving={ticketPrioritySaving}
            metaSyncState={metaSyncState}
            onRequestCollapse={toggleRightRail}
            currentUserId={currentUserId}
            onTransfer={onTransferTicket}
            transferBusy={transferBusy}
            transferError={transferError}
            onApproveTransfer={onApproveTransfer}
            onRejectTransfer={onRejectTransfer}
            transferApprovalBusy={transferApprovalBusy}
            transferApprovalError={transferApprovalError}
            onForceClose={onForceClose}
            forceCloseBusy={forceCloseBusy}
            forceCloseError={forceCloseError}
          />
        </div>
        {!rightRailOpen ? (
          <RightRailCollapsed
            rawTicket={rawTicket}
            attachmentCount={attachmentCount}
            slaState={detail.slaState}
            onExpand={toggleRightRail}
          />
        ) : null}
      </div>
    ) : null}
    </div>
  );
}
