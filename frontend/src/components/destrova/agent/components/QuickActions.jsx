export default function QuickActions({
  detail,
  rawTicket = null,
  currentUserId = null,
  onAssignToMe,
  assignBusy = false,
  assignError = "",
  onApproveTransfer,
  onRejectTransfer,
  transferApprovalBusy = false,
  transferApprovalError = "",
}) {
  const isUnassigned = !detail?.assignee;
  const canAssign = Boolean(onAssignToMe) && isUnassigned;

  const pendingToId = rawTicket?.pendingTransferToAgentId;
  const pendingFromId = rawTicket?.pendingTransferFromAgentId;
  const pendingToMe =
    pendingToId != null && currentUserId != null && Number(pendingToId) === Number(currentUserId);
  const pendingFromMe =
    pendingFromId != null && currentUserId != null && Number(pendingFromId) === Number(currentUserId);

  if (pendingToMe) {
    const fromName = rawTicket?.pendingTransferFromAgentName || "A colleague";
    const reason = rawTicket?.pendingTransferReason || "—";
    const note = rawTicket?.pendingTransferNote;

    return (
      <div className="flex flex-col gap-2 border-b border-amber-200/80 bg-amber-50/60 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-amber-950">Transfer request for you</p>
          <p className="mt-1 text-[12px] leading-relaxed text-amber-900/90">
            {fromName} wants to transfer this ticket to you. Reason:{" "}
            <span className="font-medium">{reason.replace(/_/g, " ")}</span>
            {note ? ` — ${note}` : ""}. The ticket stays with them until you respond.
          </p>
        </div>
        {transferApprovalError ? (
          <p className="text-xs text-red-700" role="alert">
            {transferApprovalError}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onApproveTransfer?.()}
            disabled={transferApprovalBusy}
            className="h-8 rounded-md bg-emerald-600 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {transferApprovalBusy ? "Working…" : "Accept transfer"}
          </button>
          <button
            type="button"
            onClick={() => onRejectTransfer?.()}
            disabled={transferApprovalBusy}
            className="h-8 rounded-md border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Decline
          </button>
        </div>
      </div>
    );
  }

  if (pendingFromMe) {
    const targetName = rawTicket?.pendingTransferToAgentName || "another agent";
    return (
      <div className="border-b border-indigo-200/70 bg-indigo-50/50 px-4 py-2.5">
        <p className="text-[12.5px] font-medium text-indigo-950">
          Transfer pending — waiting for {targetName} to accept. You remain the assignee.
        </p>
      </div>
    );
  }

  if (!isUnassigned && !assignError) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5 border-b border-[#E2E8F0] bg-white px-4 py-2">
      {assignError ? (
        <p className="text-xs text-red-700" role="alert">
          {assignError}
        </p>
      ) : null}
      {canAssign ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onAssignToMe?.()}
            disabled={assignBusy}
            className="h-8 rounded-md bg-blue-600 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {assignBusy ? "Assigning…" : "Assign to me"}
          </button>
          <span className="text-[11.5px] text-slate-500">
            Takes the ticket, sets it to In progress, and starts your SLA clock from creation time.
          </span>
        </div>
      ) : null}
    </div>
  );
}
