import { useTranslation } from "react-i18next";

const SPINNER_SIZE = {
  xs: "h-3.5 w-3.5 border-[1.5px]",
  sm: "h-5 w-5 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-10 w-10 border-2",
};

const SPINNER_TONE = {
  brand: "border-slate-200/90 border-t-blue-600",
  white: "border-white/35 border-t-white",
  muted: "border-slate-200/80 border-t-slate-500",
};

/** Branded spinner — use instead of ad-hoc animate-spin divs. */
export function DestrovaSpinner({ size = "md", tone = "brand", className = "" }) {
  return (
    <div
      className={[
        "destrova-spinner shrink-0 animate-spin rounded-full",
        SPINNER_SIZE[size] ?? SPINNER_SIZE.md,
        SPINNER_TONE[tone] ?? SPINNER_TONE.brand,
        className,
      ].join(" ")}
      aria-hidden
    />
  );
}

/** Shimmer skeleton block — enterprise pulse (see index.css). */
export function DestrovaSkeleton({ className = "" }) {
  return <div className={`destrova-skeleton rounded-md ${className}`.trim()} aria-hidden />;
}

/** Centered loading panel for cards, tables, and surfaces. */
export function DestrovaLoadingState({
  message,
  compact = false,
  className = "",
}) {
  const { t } = useTranslation("common");
  const label = message ?? t("loading");

  return (
    <div
      className={[
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-3 py-10" : "gap-4 py-14",
        className,
      ].join(" ")}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <DestrovaSpinner size={compact ? "sm" : "md"} />
      <p className="max-w-sm text-sm font-medium tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

/** Table body row — replaces raw spinner + text in tbody. */
export function DestrovaTableLoadingRow({ colSpan, message, compact = true }) {
  return (
    <tr>
      <td colSpan={colSpan} className="bg-white px-5 py-2">
        <DestrovaLoadingState message={message} compact={compact} />
      </td>
    </tr>
  );
}

/** KPI card row skeleton (manager dashboard / admin overview). */
export function DestrovaKpiSkeletonRow({ count = 4, columns = 4, className = "" }) {
  const gridClass =
    columns === 3
      ? "sm:grid-cols-2 md:grid-cols-3"
      : "sm:grid-cols-2 xl:grid-cols-4";

  return (
    <section
      className={`grid grid-cols-1 gap-4 ${gridClass} ${className}`.trim()}
      aria-busy="true"
      aria-hidden
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="rounded-[14px] border border-slate-200/80 bg-white p-6 shadow-sm"
        >
          <DestrovaSkeleton className="h-3 w-24" />
          <DestrovaSkeleton className="mt-5 h-10 w-16" />
          <DestrovaSkeleton className="mt-5 h-4 w-36" />
        </div>
      ))}
    </section>
  );
}

/** Card grid skeleton (teams, catalog tiles). */
export function DestrovaCardGridSkeleton({ count = 6, className = "" }) {
  return (
    <section
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 ${className}`.trim()}
      aria-busy="true"
      aria-hidden
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="rounded-[14px] border border-slate-200/80 bg-white p-6 shadow-sm"
        >
          <DestrovaSkeleton className="h-4 w-32" />
          <DestrovaSkeleton className="mt-4 h-3 w-full max-w-[85%]" />
          <DestrovaSkeleton className="mt-2 h-3 w-2/3" />
          <div className="mt-5 flex gap-2">
            <DestrovaSkeleton className="h-8 w-20 rounded-lg" />
            <DestrovaSkeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </section>
  );
}

/** Admin / manager data table skeleton. */
export function DestrovaTableSkeleton({ rows = 6, className = "" }) {
  return (
    <div
      className={`overflow-hidden rounded-[14px] border border-slate-200/80 bg-white p-4 shadow-sm md:p-5 ${className}`.trim()}
      aria-busy="true"
      aria-hidden
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <DestrovaSkeleton className="h-9 w-full max-w-xs rounded-lg" />
        <DestrovaSkeleton className="h-9 w-28 rounded-lg" />
      </div>
      <DestrovaSkeleton className="mb-3 h-9 w-full rounded-lg" />
      <div className="space-y-2.5">
        {Array.from({ length: rows }, (_, i) => (
          <DestrovaSkeleton key={i} className="h-11 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/** Manager ticket detail — two-column layout placeholder. */
export function DestrovaTicketDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-hidden>
      <div className="rounded-[14px] border border-slate-200/80 bg-white p-5 shadow-sm md:p-6">
        <DestrovaSkeleton className="h-3 w-28" />
        <DestrovaSkeleton className="mt-3 h-7 w-full max-w-xl" />
        <DestrovaSkeleton className="mt-2 h-4 w-full max-w-lg" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 rounded-[14px] border border-slate-200/80 bg-white p-5 shadow-sm lg:col-span-8 md:p-6">
          <DestrovaSkeleton className="h-4 w-36" />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="rounded-lg border border-slate-100 p-4">
              <DestrovaSkeleton className="h-3 w-24" />
              <DestrovaSkeleton className="mt-2 h-4 w-full" />
              <DestrovaSkeleton className="mt-2 h-4 w-4/5" />
            </div>
          ))}
          <DestrovaSkeleton className="h-28 w-full rounded-xl" />
        </div>
        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-[14px] border border-slate-200/80 bg-white p-5 shadow-sm">
            <DestrovaSkeleton className="h-4 w-28" />
            {Array.from({ length: 5 }, (_, i) => (
              <DestrovaSkeleton key={i} className="mt-4 h-9 w-full rounded-lg" />
            ))}
          </div>
          <div className="rounded-[14px] border border-slate-200/80 bg-white p-5 shadow-sm">
            <DestrovaSkeleton className="h-4 w-24" />
            <DestrovaSkeleton className="mt-4 h-20 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** SLA monitor page skeleton. */
export function DestrovaSlaMonitorSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-hidden>
      <DestrovaKpiSkeletonRow count={3} columns={3} />
      <div className="rounded-[14px] border border-slate-200/80 bg-white p-6 shadow-sm md:p-7">
        <DestrovaSkeleton className="h-4 w-32" />
        <DestrovaSkeleton className="mt-2 h-3 w-56" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <DestrovaSkeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
      <div className="rounded-[14px] border border-slate-200/80 bg-white p-6 shadow-sm md:p-7">
        <DestrovaSkeleton className="h-4 w-28" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <DestrovaSkeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
