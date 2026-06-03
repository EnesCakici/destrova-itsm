import { useEffect, useId, useState } from "react";
import { getAgentWorklogSummary, getAllProducts } from "../../../../services/api";

function stripHtml(value) {
  const doc = new DOMParser().parseFromString(String(value || ""), "text/html");
  return doc.body.textContent || "";
}

function IconReply({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}


function IconInternal({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconWorklog({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function actionMeta(type) {
  switch (type) {
    case "reply":
      return {
        Icon: IconReply,
        iconWrap: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/80 shadow-sm",
      };
    case "internal":
      return {
        Icon: IconInternal,
        iconWrap: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/80 shadow-sm",
      };
    default:
      return {
        Icon: IconWorklog,
        iconWrap: "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80 shadow-sm",
      };
  }
}

const DISTRIBUTION_BAR_CLASS = {
  reply: "bg-sky-500",
  internal: "bg-violet-500",
  worklog: "bg-slate-600",
};

function KpiCard({ title, value, trend, trendUp, dotClass = "bg-indigo-500" }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/30 transition-all duration-200 hover:border-slate-300/80 hover:shadow-md hover:shadow-slate-200/50">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo-400/0 via-indigo-400/40 to-violet-400/0 opacity-0 transition-opacity duration-200 group-hover:opacity-100" aria-hidden />
      <div className="flex items-start gap-2.5">
        <span
          className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${dotClass} ring-2 ring-white shadow-sm shadow-slate-200/50`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-[1.65rem]">
            {value}
          </p>
          <p className="mt-1.5 text-[0.7rem] leading-tight text-slate-400">Based on selected period</p>
          <div className="mt-2 min-h-[1.125rem]">
            {trend ? (
              <p className={`text-xs font-medium ${trendUp ? "text-emerald-600" : "text-slate-500"}`}>
                {trendUp ? "↑ " : ""}
                {trend}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorklogSummaryView() {
  const filterId = useId();
  const [period, setPeriod] = useState("today");
  const [product, setProduct] = useState("all");
  const [products, setProducts] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getAllProducts()
      .then((list) => {
        if (!cancelled) setProducts(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
  
        const res = await getAgentWorklogSummary({
          period,
          productId: product,
        });
  
        setData(res);
      } catch (e) {
        console.error("worklog summary error", e);
      } finally {
        setLoading(false);
      }
    };
  
    load();
  }, [period, product]);

  const totalLoggedMinutes = data?.totalLoggedMinutes ?? 0;

  const productOptions = [
    { value: "all", label: "All products" },
    ...products.map((p) => ({
      value: String(p.id),
      label: p.name,
    })),
  ];

  const worklogEntryCount =
  data?.distribution?.find((x) => x.key === "worklog")?.count ?? 0;

  const kpis = {
    totalLogged: {
      label: `${Math.floor(totalLoggedMinutes / 60)}h ${totalLoggedMinutes % 60}m`,
    },
    ticketsWorked: {
      label: data?.ticketsWorked ?? 0,
    },
    avgPerTicket: {
      label: `${data?.avgMinutesPerTicket ?? 0} min`,
    },
    worklogEntries: {
      label: worklogEntryCount,
    },
  };

  const periodSummaryLabel = period === "today" ? "Today" : "This week";

  const distribution = data?.distribution ?? [];
  const totalDistributionActivity = distribution.reduce(
    (sum, row) => sum + (Number(row.count) || 0),
    0,
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-gradient-to-b from-slate-100/40 via-[#F4F6FB] to-slate-100/30 px-3 py-4 md:px-5 md:py-4">
      <div className="mx-auto w-full max-w-6xl space-y-4 pb-6 sm:space-y-5 sm:pb-7">
        {/* Header */}
        <header className="relative overflow-hidden rounded-2xl border border-indigo-100/70 bg-gradient-to-br from-indigo-50/95 via-white to-violet-50/60 px-5 py-5 shadow-sm shadow-indigo-100/30 ring-1 ring-indigo-100/50 sm:rounded-3xl sm:px-7 sm:py-6 md:px-8 md:py-7">
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-violet-200/25 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-indigo-200/20 blur-3xl" aria-hidden />
          <div className="relative">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-[1.65rem]">
              Worklog Summary
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Track your activity, time usage, and productivity
            </p>
            <p className="mt-3 inline-flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100/80 bg-white/60 px-2.5 py-0.5 font-medium text-slate-600 shadow-sm backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" aria-hidden />
                {periodSummaryLabel}
              </span>
              <span className="text-slate-400">·</span>
              <span>Dashboard reflects the period selected below.</span>
            </p>
          </div>
        </header>

        {/* KPI row */}
        <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <KpiCard
            title="Total time logged"
            value={kpis.totalLogged.label}
            trend={kpis.totalLogged.trend}
            trendUp={kpis.totalLogged.trendUp}
            dotClass="bg-indigo-500"
          />
          <KpiCard
            title="Tickets worked"
            value={kpis.ticketsWorked.label}
            trend={kpis.ticketsWorked.trend}
            dotClass="bg-violet-500"
          />
          <KpiCard
            title="Avg time / ticket"
            value={kpis.avgPerTicket.label}
            trend={kpis.avgPerTicket.trend}
            dotClass="bg-fuchsia-500"
          />
          <KpiCard title="Worklog entries" value={kpis.worklogEntries.label} dotClass="bg-slate-500" />
        </div>

        {/* Filter bar */}
        <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200/60 bg-white/90 px-4 py-3.5 shadow-sm shadow-slate-200/30 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">Activity overview</h2>
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <div className="inline-flex items-center gap-0.5 rounded-full border border-slate-200/80 bg-slate-100/80 p-0.5 shadow-inner">
              {[
                { id: "today", label: "Today" },
                { id: "week", label: "Week" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPeriod(opt.id)}
                  className={[
                    "min-h-[2rem] rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 border-none",
                    period === opt.id
                      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                      : "text-slate-500 hover:text-slate-800",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <label className="sr-only" htmlFor={`${filterId}-product`}>
              Product
            </label>
            <select
              id={`${filterId}-product`}
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="min-h-[2rem] rounded-full border border-slate-200/90 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors duration-150 focus:border-indigo-300/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {productOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Timeline */}
        <section
          className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm shadow-slate-200/25 sm:rounded-3xl sm:p-6 md:px-8 md:py-7"
          aria-label="Activity timeline"
        >
          <div className="mb-5 border-b border-slate-100 pb-4 md:mb-6">
            <h2 className="text-sm font-bold tracking-tight text-slate-900 sm:text-base">Recent activity</h2>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Latest worklogs and ticket interactions</p>
          </div>
          <div className="destrova-scrollbar relative max-h-[320px] overflow-y-auto overflow-x-hidden pr-1 [scrollbar-gutter:stable]">
            <div
              className="pointer-events-none absolute left-[calc(3.5rem+1rem+0.75rem-0.5px)] top-2 bottom-2 w-px bg-gradient-to-b from-slate-200/80 via-slate-200 to-slate-200/30 md:left-[calc(4rem+1.5rem+1rem-0.5px)]"
              aria-hidden
            />
            {!loading && data && (!data.activities || data.activities.length === 0) ? (
              <p className="py-6 text-center text-sm text-slate-500 sm:py-8">
                No activity for this period.
              </p>
            ) : null}
            <ul className="relative space-y-3.5 sm:space-y-4">
              {data?.activities?.map((item) => {
                const { Icon, iconWrap } = actionMeta(item.type);
                return (
                  <li
                    key={item.id}
                    className="grid grid-cols-[3.5rem_1.5rem_minmax(0,1fr)] items-stretch gap-x-3.5 md:grid-cols-[4rem_2rem_minmax(0,1fr)] md:gap-x-5"
                  >
                    <time className="pt-2.5 text-right text-[0.7rem] font-bold tabular-nums leading-none text-slate-500 sm:text-xs">
                      {item.timeLabel}
                    </time>
                    <div className="relative flex h-full min-h-[3rem] justify-center pt-2.5">
                      <span
                        className="relative z-[1] mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full border border-white bg-white shadow-sm ring-2 ring-slate-300/90"
                        aria-hidden
                      />
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`flex flex-col gap-2 rounded-2xl border border-slate-200/50 bg-slate-50/60 p-3 shadow-sm sm:flex-row sm:items-start sm:gap-3 ${
                          item.durationMinutes ? "sm:pr-2" : ""
                        }`}
                      >
                        <span
                          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${iconWrap}`}
                          title={item.type}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
                            {item.title}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm leading-snug text-slate-600">
                            {stripHtml(item.context)}
                          </p>
                          <p className="mt-2 text-[0.7rem] font-semibold tabular-nums text-slate-400">
                            {item.durationMinutes ? `+${item.durationMinutes} min` : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Bottom: distribution + insights */}
        <div className="grid gap-3.5 sm:gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm shadow-slate-200/30 sm:rounded-3xl sm:p-6 md:p-7">
            <h2 className="text-sm font-bold tracking-tight text-slate-900 sm:text-base">Time distribution</h2>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Share of logged time by activity type</p>
            <div className="mt-5 sm:mt-6">
              {loading ? (
                <p className="py-6 text-center text-sm text-slate-400">Loading distribution…</p>
              ) : totalDistributionActivity === 0 ? (
                <div className="flex items-center justify-center py-8 text-[13px] text-slate-400">
                  No activity logged in this period.
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-5">
                  {distribution.map((row) => {
                    const pct = Number(row.pct) || 0;
                    const barClass =
                      row.barClass || DISTRIBUTION_BAR_CLASS[row.key] || "bg-indigo-500";
                    const barWidth = Math.max(pct, 2);
                    return (
                      <div key={row.key}>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-slate-800">{row.label}</span>
                          <span className="tabular-nums text-sm font-medium text-slate-600">
                            {pct}%
                          </span>
                        </div>
                        <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-slate-200/60 bg-slate-100/90 shadow-inner">
                          <div
                            className={`h-full min-w-0 rounded-full ${barClass} transition-[width] duration-300 ease-out ${pct === 0 ? "opacity-40" : "opacity-100"}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm shadow-slate-200/30 sm:rounded-3xl sm:p-6 md:p-7">
            <h2 className="text-sm font-bold tracking-tight text-slate-900 sm:text-base">Productivity insight</h2>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Patterns from today&apos;s session</p>
            <ul className="mt-4 space-y-0 sm:mt-5">
              {data?.insights?.map((row) => {
                const isEmptyish =
                  row.value === undefined ||
                  row.value === null ||
                  row.value === "" ||
                  String(row.value).trim() === "-" ||
                  String(row.value).trim() === "—";
                return (
                  <li
                    key={row.label}
                    className="flex items-start justify-between gap-3 border-b border-slate-100/90 py-3 last:border-b-0"
                  >
                    <span className="flex min-w-0 items-start gap-2 text-sm text-slate-600">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400/80"
                        aria-hidden
                      />
                      <span className="min-w-0 leading-snug">{row.label}</span>
                    </span>
                    <span
                      className={[
                        "shrink-0 text-right text-sm tabular-nums",
                        isEmptyish
                          ? "font-medium text-slate-400"
                          : "font-semibold text-slate-900",
                      ].join(" ")}
                    >
                      {isEmptyish ? (String(row.value || "").trim() || "—") : row.value}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
