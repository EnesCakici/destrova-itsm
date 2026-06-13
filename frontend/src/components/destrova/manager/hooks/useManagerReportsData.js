import { useCallback, useEffect, useMemo, useState } from "react";
import { getManagerReports } from "../api/api";

/**
 * Manager Reports — live API only; errors surface to the UI (no demo fallback).
 */

function toYmd(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getDateRange(rangeId, customFrom, customTo) {
  const today = new Date();
  if (rangeId === "custom") {
    return { startDate: customFrom, endDate: customTo };
  }
  const days = { "7d": 7, "30d": 30, "90d": 90, qtr: 90, ytd: null };
  const end = toYmd(today);
  if (rangeId === "ytd") {
    const start = `${today.getFullYear()}-01-01`;
    return { startDate: start, endDate: end };
  }
  if (rangeId === "qtr") {
    const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
    const start = toYmd(new Date(today.getFullYear(), quarterStartMonth, 1));
    return { startDate: start, endDate: end };
  }
  const d = days[rangeId] ?? 30;
  const from = new Date(today);
  from.setDate(from.getDate() - (d - 1));
  return { startDate: toYmd(from), endDate: end };
}

/** Shared by reports UI + CSV export — keeps filter window in sync. */
export function getReportDateRange(rangeId, customFrom, customTo) {
  return getDateRange(rangeId, customFrom, customTo);
}

/** API ReportsDto → view shape. Empty fields stay empty on success. */
function normalizeReportsPayload(api) {
  if (api == null || typeof api !== "object") return null;

  const totalCreated = Number(api.totalCreated ?? 0);
  const totalResolved = Number(api.totalResolved ?? 0);
  const periodEmpty = totalCreated === 0 && totalResolved === 0;

  const volume = {
    created: totalCreated,
    resolved: totalResolved,
    deltaCreated: { dir: "flat", text: "" },
    deltaResolved: { dir: "flat", text: "" },
    series: Array.isArray(api.volumeSeries)
      ? api.volumeSeries.map((w) => ({
          week: w.label ?? "",
          created: Number(w.opened ?? 0),
          resolved: Number(w.closed ?? 0),
        }))
      : [],
  };

  const products = Array.isArray(api.products)
    ? api.products.map((p) => ({
        name: p.name ?? "—",
        tickets: Number(p.tickets ?? 0),
        avgResolution: p.avgResolution ?? "—",
        slaMet: Number(p.slaMet ?? 0),
        deltaPct: Number(p.deltaPct ?? 0),
      }))
    : [];

  const agents = Array.isArray(api.agents)
    ? api.agents.map((a) => ({
        name: a.name ?? "—",
        role: a.role ?? "Agent",
        resolved: Number(a.resolved ?? 0),
        avgResolution: a.avgResolution ?? "—",
        slaMet: Number(a.slaMet ?? 0),
        csat: a.csat ?? null,
      }))
    : [];

  const resolutionTrend = Array.isArray(api.resolutionTrend)
    ? api.resolutionTrend.map((p) => ({
        week: p.label ?? "",
        value: Number(p.avgHours ?? 0),
      }))
    : [];

  const highlights = [
    {
      id: "avgResolution",
      value: api.avgResolutionHours != null ? `${api.avgResolutionHours}h` : "—",
      noteKey: periodEmpty
        ? "noTicketsInPeriod"
        : totalResolved === 0
          ? "noResolvedYet"
          : "avgAcrossPriorities",
    },
    {
      id: "slaCompliance",
      value: api.slaCompliancePercent != null ? `${api.slaCompliancePercent}%` : "—",
      noteKey: periodEmpty
        ? "noTicketsInPeriod"
        : totalResolved === 0
          ? "noClosedToMeasure"
          : "closedWithinSla",
    },
  ];

  return {
    volume,
    products,
    agents,
    resolutionTrend,
    highlights,
    isPeriodEmpty: periodEmpty,
  };
}

export function useManagerReportsData({ range, customFrom, customTo }) {
  /** undefined = loading, object = ready (may be sparse). */
  const [apiData, setApiData] = useState(undefined);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setApiData(undefined);
    setError(null);
    const { startDate, endDate } = getDateRange(range, customFrom, customTo);
    try {
      const data = await getManagerReports({ startDate, endDate });
      setApiData(data ?? {});
    } catch (e) {
      console.warn("[useManagerReportsData] Reports API failed.", e);
      setApiData(undefined);
      setError(e);
    }
  }, [range, customFrom, customTo]);

  useEffect(() => {
    load();
  }, [load]);

  const loading = apiData === undefined && error == null;
  const loadFailed = error != null && apiData === undefined;

  const resolved = useMemo(() => {
    if (apiData != null && typeof apiData === "object") return normalizeReportsPayload(apiData);
    return null;
  }, [apiData]);

  const reportsReady = resolved != null;

  return {
    volume: resolved?.volume,
    products: resolved?.products ?? [],
    agents: resolved?.agents ?? [],
    resolutionTrend: resolved?.resolutionTrend ?? [],
    highlights: resolved?.highlights ?? [],
    isPeriodEmpty: resolved?.isPeriodEmpty ?? false,
    loading,
    loadFailed,
    reportsReady,
    error,
    refetch: load,
  };
}
