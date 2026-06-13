/**
 * Loading placeholders for Manager Reports — mirrors live layout.
 */

import { useTranslation } from "react-i18next";
import { DestrovaSkeleton } from "../../../../shared/DestrovaLoading";

function ReportsCardShell({
  children,
  className = "",
  padding = "p-6 md:p-7",
  tone = "default",
}) {
  const toneClass =
    tone === "neutral"
      ? "border border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-white"
      : "border border-gray-200 bg-white";

  return (
    <section
      className={`relative overflow-hidden rounded-[14px] shadow-sm ${toneClass} ${padding} ${className}`.trim()}
      aria-busy="true"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/60 to-transparent"
        aria-hidden
      />
      {children}
    </section>
  );
}

function ReportsCardHeaderSkeleton({ hintWide = false }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-2">
        <DestrovaSkeleton className="h-4 w-36" />
        {hintWide ? <DestrovaSkeleton className="h-3 w-56 max-w-full" /> : <DestrovaSkeleton className="h-3 w-44 max-w-full" />}
      </div>
      <DestrovaSkeleton className="hidden h-4 w-28 shrink-0 sm:block" />
    </div>
  );
}

/** Ticket volume card — totals + dual-line chart area. */
export function ReportsVolumeSkeleton() {
  return (
    <ReportsCardShell className="lg:col-span-8" tone="neutral">
      <ReportsCardHeaderSkeleton hintWide />
      <div className="mt-5 grid grid-cols-2 gap-4 sm:max-w-sm">
        {[0, 1].map((i) => (
          <div key={i}>
            <DestrovaSkeleton className="h-2.5 w-16" />
            <DestrovaSkeleton className="mt-2 h-8 w-14" />
          </div>
        ))}
      </div>
      <DestrovaSkeleton className="mt-6 h-[200px] w-full rounded-lg" />
      <div className="relative mt-2 h-10" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="absolute top-0"
            style={{
              left: `${(i / 5) * 100}%`,
              transform: i === 0 ? "none" : i === 5 ? "translateX(-100%)" : "translateX(-50%)",
            }}
          >
            <DestrovaSkeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    </ReportsCardShell>
  );
}

/** Single highlight metric card (Avg resolution / SLA compliance). */
export function ReportsHighlightSkeleton({ tone = "primary" }) {
  const bg =
    tone === "neutral"
      ? "border border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-white"
      : "border border-blue-100/80 bg-gradient-to-b from-blue-50/50 to-white";

  return (
    <div className={`rounded-[14px] p-6 shadow-sm ${bg}`} aria-busy="true">
      <DestrovaSkeleton className="h-3 w-28" />
      <DestrovaSkeleton className="mt-4 h-10 w-20 md:h-11" />
      <DestrovaSkeleton className="mt-3 h-3 w-40" />
    </div>
  );
}

export function ReportsHighlightsSkeleton() {
  return (
    <div className="grid gap-4 lg:col-span-4" aria-label="Loading highlight metrics">
      <ReportsHighlightSkeleton tone="primary" />
      <ReportsHighlightSkeleton tone="neutral" />
    </div>
  );
}

/** Product or agent table skeleton. */
export function ReportsTableSkeleton({
  rows = 5,
  agentRows = false,
  className = "",
}) {
  const colWidths = agentRows
    ? ["w-32", "w-12", "w-16", "w-24", "w-10"]
    : ["w-28", "w-10", "w-16", "w-24", "w-12"];

  return (
    <ReportsCardShell className={className} elevated>
      <ReportsCardHeaderSkeleton hintWide={agentRows} />
      <div className="mt-5 overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="flex gap-4 border-b border-slate-100 pb-3">
            {colWidths.map((w, i) => (
              <DestrovaSkeleton
                key={`head-${i}`}
                className={`h-2.5 shrink-0 ${w} ${i > 0 && i < colWidths.length - 1 ? "ml-auto" : ""}`}
              />
            ))}
          </div>
          <div className="mt-1 space-y-0 divide-y divide-slate-100">
            {Array.from({ length: rows }, (_, rowIdx) => (
              <div key={rowIdx} className="flex items-center gap-4 py-3.5">
                {agentRows ? (
                  <>
                    <div className="min-w-[8rem] space-y-1.5">
                      <DestrovaSkeleton className="h-3.5 w-28" />
                      <DestrovaSkeleton className="h-2.5 w-16" />
                    </div>
                    <DestrovaSkeleton className="ml-auto h-3.5 w-8" />
                    <DestrovaSkeleton className="h-3.5 w-14" />
                    <DestrovaSkeleton className="h-2 w-24 rounded-full" />
                    <DestrovaSkeleton className="h-3.5 w-8" />
                  </>
                ) : (
                  <>
                    <DestrovaSkeleton className="h-3.5 w-24" />
                    <DestrovaSkeleton className="ml-auto h-3.5 w-8" />
                    <DestrovaSkeleton className="h-3.5 w-14" />
                    <DestrovaSkeleton className="h-2 w-24 rounded-full" />
                    <DestrovaSkeleton className="h-5 w-10 rounded-full" />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </ReportsCardShell>
  );
}

/** Avg resolution sparkline card. */
export function ReportsTrendSkeleton() {
  return (
    <ReportsCardShell className="lg:col-span-4">
      <ReportsCardHeaderSkeleton />
      <DestrovaSkeleton className="mt-5 h-[160px] w-full rounded-lg" />
      <div className="relative mt-2 h-8" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute top-0"
            style={{
              left: i === 0 ? "0%" : i === 2 ? "100%" : "50%",
              transform: i === 0 ? "none" : i === 2 ? "translateX(-100%)" : "translateX(-50%)",
            }}
          >
            <DestrovaSkeleton className="h-2.5 w-8" />
          </div>
        ))}
      </div>
    </ReportsCardShell>
  );
}

/** Full reports body while API is in flight — matches ManagerReportsView grid. */
export function ReportsContentSkeleton() {
  return (
    <>
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12" aria-label="Loading ticket volume">
        <ReportsVolumeSkeleton />
        <ReportsHighlightsSkeleton />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12" aria-label="Loading product breakdown">
        <ReportsTableSkeleton rows={6} className="lg:col-span-8" />
        <ReportsTrendSkeleton />
      </section>

      <ReportsTableSkeleton rows={6} agentRows className="border border-gray-200" />
    </>
  );
}

export function ReportsLoadError({ onRetry }) {
  const { t } = useTranslation("manager");
  return (
    <div
      className="rounded-lg border border-red-200/90 bg-red-50 px-4 py-3 text-sm font-medium text-red-950"
      role="alert"
    >
      <p>{t("reports.loadFailed")}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-sm font-semibold underline underline-offset-2"
        >
          {t("reports.tryAgain")}
        </button>
      ) : null}
    </div>
  );
}
