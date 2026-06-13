/**
 * Lightweight loading placeholders for manager dashboard sections (Faz 1 — no mock flash).
 */

function Pulse({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/80 ${className}`.trim()}
      aria-hidden
    />
  );
}

export function DashboardKpiSkeletonRow() {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Loading live metrics">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-[14px] border border-slate-200/80 bg-white p-6 shadow-sm">
          <Pulse className="h-3 w-24" />
          <Pulse className="mt-5 h-10 w-16" />
          <Pulse className="mt-5 h-4 w-36" />
        </div>
      ))}
    </section>
  );
}

export function DashboardQueueStripSkeleton() {
  return (
    <div className="rounded-[14px] border border-slate-200/80 bg-white p-0 shadow-sm" aria-busy="true">
      <div className="flex flex-col divide-y divide-slate-200 sm:flex-row sm:divide-x sm:divide-y-0">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-1 flex-col gap-2 px-5 py-4">
            <Pulse className="h-3 w-20" />
            <Pulse className="h-8 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardChartSkeleton({ tall = false }) {
  return (
    <div
      className={`rounded-[14px] border border-slate-200/80 bg-white p-6 shadow-sm ${tall ? "min-h-[320px]" : "min-h-[240px]"}`}
      aria-busy="true"
    >
      <Pulse className="h-4 w-40" />
      <Pulse className="mt-6 h-[180px] w-full rounded-lg" />
    </div>
  );
}

export function DashboardSidePanelSkeleton() {
  return (
    <div className="rounded-[14px] border border-slate-200/80 bg-white p-6 shadow-sm" aria-busy="true">
      <Pulse className="h-4 w-32" />
      <Pulse className="mx-auto mt-6 h-32 w-32 rounded-full" />
      <div className="mt-6 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <Pulse key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
      <Pulse className="mt-5 h-12 w-full rounded-lg" />
    </div>
  );
}

export function DashboardTableSkeleton({ rows = 5 }) {
  return (
    <div className="rounded-[14px] border border-slate-200/80 bg-white p-6 shadow-sm" aria-busy="true">
      <Pulse className="h-4 w-36" />
      <Pulse className="mt-5 h-9 w-full max-w-md rounded-lg" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <Pulse key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function DashboardListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <Pulse key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function DashboardMockFallbackBanner() {
  return (
    <div
      className="rounded-lg border border-amber-200/90 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950"
      role="status"
    >
      Live ticket data could not be loaded. Showing demo placeholders until the connection is restored.
    </div>
  );
}
