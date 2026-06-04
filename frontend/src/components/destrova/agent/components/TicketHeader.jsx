/**
 * Title + meta. Status/priority editing lives in {@link RightRail}.
 */
export default function TicketHeader({ detail, metaError = "" }) {
  if (!detail) return null;

  const org = detail.organization ?? detail.customer;
  const requesterName = detail.requesterName ?? "—";
  const requesterEmail = detail.requesterEmail ?? "—";
  const productName = detail.productName ?? "Destrova";

  return (
    <div className="border-b border-slate-100/90 bg-white px-4 py-2 sm:px-5 sm:py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
            <span className="font-mono font-semibold text-gray-700">{detail.id}</span>
            <span className="text-gray-300" aria-hidden>
              ·
            </span>
            <span>{org}</span>
            <span className="text-gray-300" aria-hidden>
              ·
            </span>
            <span>{productName}</span>
          </div>

          <h1 className="mt-1 text-2xl font-semibold leading-normal text-gray-900">{detail.title}</h1>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm leading-normal text-gray-700">
            <span className="font-medium text-gray-800">{requesterName}</span>
            {requesterEmail && requesterEmail !== "—" ? (
              <>
                <span className="text-gray-300">·</span>
                <span className="truncate text-gray-500">{requesterEmail}</span>
              </>
            ) : null}
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">Created {detail.openedAt}</span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">Updated {detail.updatedAt}</span>
          </div>
        </div>

        {metaError ? (
          <p
            className="max-w-[16rem] shrink-0 rounded-md border border-red-100 bg-red-50 px-2 py-1 text-left text-xs text-red-800 sm:max-w-xs sm:text-right"
            role="alert"
          >
            {metaError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
