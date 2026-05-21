import { mapPriorityToAgentLabel, mapTicketStatusToAgentLabel } from "../mappers/agentTicketMappers";

/**
 * Title + meta. Status/priority editing lives in {@link RightRail} to avoid duplicate controls.
 */
export default function TicketHeader({ detail, rawTicket, metaError = "" }) {
  if (!detail) return null;

  const org = detail.organization ?? detail.customer;
  const requesterName = detail.requesterName ?? "—";
  const requesterEmail = detail.requesterEmail ?? "—";
  const productName = detail.productName ?? "Destrova";

  const statusCode = rawTicket?.status != null ? String(rawTicket.status) : "NEW";
  const priorityCode = rawTicket?.priority != null ? String(rawTicket.priority) : "MEDIUM";

  return (
    <div className="border-b border-slate-100/90 bg-white px-4 py-2.5 sm:px-5 sm:py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
            <span className="font-mono font-semibold text-slate-700">{detail.id}</span>
            <span className="text-slate-300" aria-hidden>
              ·
            </span>
            <span>{org}</span>
            <span className="text-slate-300" aria-hidden>
              ·
            </span>
            <span>{productName}</span>
          </div>

          <h1 className="mt-1.5 text-xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-2xl">{detail.title}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-600">
            <span className="font-medium text-slate-800">{requesterName}</span>
            {requesterEmail && requesterEmail !== "—" ? (
              <>
                <span className="text-slate-300">·</span>
                <span className="truncate text-slate-500">{requesterEmail}</span>
              </>
            ) : null}
            <span className="text-slate-300">·</span>
            <span>Created {detail.openedAt}</span>
            <span className="text-slate-300">·</span>
            <span>Updated {detail.updatedAt}</span>
          </div>
        </div>

        <div className="flex w-[min(100%,14rem)] shrink-0 flex-col items-stretch gap-1.5 text-xs sm:w-auto sm:min-w-[12rem] sm:items-end">
          {metaError ? (
            <p className="max-w-[16rem] rounded-md border border-red-100 bg-red-50 px-2 py-1 text-left text-red-800 sm:max-w-xs sm:text-right" role="alert">
              {metaError}
            </p>
          ) : null}
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
            <div className="flex min-w-0 flex-col gap-0.5 sm:items-end">
              <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Status</span>
              <span className="inline-block w-full min-w-0 max-w-full truncate rounded-full border border-blue-100 bg-blue-50/95 px-2.5 py-1 text-center text-xs font-semibold text-blue-900 sm:max-w-[10.5rem]">
                {mapTicketStatusToAgentLabel(statusCode)}
              </span>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5 sm:items-end">
              <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Priority</span>
              <span className="inline-block w-full min-w-0 max-w-full truncate rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-center text-xs font-semibold text-slate-800 sm:max-w-[9.5rem]">
                {mapPriorityToAgentLabel(priorityCode)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
