import { useMemo } from "react";
import TicketHeader from "./TicketHeader";
import QuickActions from "./QuickActions";
import TicketComposer from "./TicketComposer";
import Timeline from "./Timeline";
import RightRail from "./RightRail";
import IssueDescriptionCard from "./IssueDescriptionCard";
import { listInvolvedMentionPeopleFromTicket } from "../data/workspaceModel";

/**
 * Center column: header + description + single scroll (timeline) + fixed composer strip.
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
  issueDescription,
  issueDescriptionLoading = false,
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
}) {
  const hasTicket = detail != null;
  const issue = issueDescription || { text: "", source: "none", isEmpty: true };

  const involvedPeople = useMemo(() => listInvolvedMentionPeopleFromTicket(rawTicket), [rawTicket]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 gap-0 transition-opacity duration-150 ease-out md:gap-1">
      <main className="center-column flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm shadow-slate-200/20">
        <div className="shrink-0">
          <TicketHeader detail={detail} rawTicket={rawTicket} metaError={ticketMetaError} />
          {hasTicket ? (
            <QuickActions
              detail={detail}
              onAssignToMe={onAssignToMe}
              assignBusy={assignBusy}
              assignError={assignError}
            />
          ) : null}
        </div>

        {hasTicket ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/40">
            <div className="shrink-0 border-b border-slate-100/90 px-3 pb-2 pt-2 sm:px-4 sm:pb-2.5 sm:pt-2.5">
              <IssueDescriptionCard
                text={issue.text}
                source={issue.source}
                isEmpty={issue.isEmpty}
                loading={issueDescriptionLoading}
                compact
              />
            </div>

            <div className="timeline-scroll-area min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-smooth px-3 py-2 sm:px-4 sm:py-2.5">
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

            <div className="ticket-composer-dock shrink-0 overflow-hidden border-t border-[rgba(226,232,240,0.9)] bg-white shadow-[0_-12px_30px_rgba(15,23,42,0.08)]">
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
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-slate-50/30 px-6 py-16 text-sm text-slate-500">
            <div className="flex flex-1 items-center justify-center bg-slate-50/30 px-6 py-16 text-center">
  <div className="max-w-sm rounded-2xl border border-slate-200 bg-white px-6 py-7 shadow-sm">
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
      />
    ) : null}
    </div>
  );
}
