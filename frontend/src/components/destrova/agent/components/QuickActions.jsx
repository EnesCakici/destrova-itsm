export default function QuickActions({ detail, onAssignToMe, assignBusy = false, assignError = "" }) {
  const isUnassigned = !detail?.assignee;
  const canAssign = Boolean(onAssignToMe) && isUnassigned;

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
          <span className="text-[11.5px] text-slate-500">Takes the ticket, sets it to In progress, and starts your SLA clock from creation time.</span>
        </div>
      ) : null}
    </div>
  );
}
