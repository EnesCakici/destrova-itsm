import { useCallback, useEffect, useMemo, useState } from "react";
import { getManagerReports } from "../api/api";
import {
  MANAGER_REPORT_AGENTS,
  MANAGER_REPORT_HIGHLIGHTS,
  MANAGER_REPORT_PRODUCTS,
  //MANAGER_REPORT_CATEGORIES,
  MANAGER_REPORT_RANGES,
  MANAGER_REPORT_TREND,
  MANAGER_REPORT_VOLUME,
} from "../data/managerMock";

/**
 * Manager Reports ekrani icin veri hook'u.
 * API'den veri cekilir; hata / bos donuste mock fallback devreye girer.
 *
 * Donus sekli ManagerReportsView'in beklentisiyle uyumludur:
 *   { volume, products, agents, resolutionTrend, highlights, categories, loading, error }
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
  const d = days[rangeId] ?? 30;
  const from = new Date(today);
  from.setDate(from.getDate() - d);
  return { startDate: toYmd(from), endDate: end };
}

/**
 * API ReportsDto → view shape dönüşümü.
 * Alan eksikse mock değerle tamamlanır.
 */
function normalizeReportsPayload(api) {
  if (api == null) return null;

  const volume = {
    created: api.totalCreated ?? MANAGER_REPORT_VOLUME.created,
    resolved: api.totalResolved ?? MANAGER_REPORT_VOLUME.resolved,
    deltaCreated: { dir: "flat", text: "" },
    deltaResolved: { dir: "flat", text: "" },
    series: Array.isArray(api.volumeSeries) && api.volumeSeries.length > 0
      ? api.volumeSeries.map((w) => ({ week: w.label, created: w.opened ?? 0, resolved: w.closed ?? 0 }))
      : MANAGER_REPORT_VOLUME.series,
  };

  const products = Array.isArray(api.products) && api.products.length > 0
    ? api.products.map((p) => ({
        name: p.name,
        tickets: p.tickets,
        avgResolution: p.avgResolution ?? "—",
        slaMet: p.slaMet ?? 0,
        deltaPct: p.deltaPct ?? 0,
      }))
    : MANAGER_REPORT_PRODUCTS;

  const agents = Array.isArray(api.agents) && api.agents.length > 0
    ? api.agents.map((a) => ({
        name: a.name,
        role: a.role ?? "Agent",
        resolved: a.resolved ?? 0,
        avgResolution: a.avgResolution ?? "—",
        slaMet: a.slaMet ?? 0,
        csat: a.csat ?? null,
      }))
    : MANAGER_REPORT_AGENTS;

  const resolutionTrend = Array.isArray(api.resolutionTrend) && api.resolutionTrend.length > 0
    ? api.resolutionTrend.map((p) => ({ week: p.label, value: p.avgHours ?? 0 }))
    : MANAGER_REPORT_TREND;

  // Highlights: API'den gelen avg resolution + sla compliance ile dolduruluyor.
  // CSAT henuz API'de olmadigi icin mock'dan alinir.
  const highlights = [
    {
      label: "Avg resolution",
      value: api.avgResolutionHours != null ? `${api.avgResolutionHours}h` : MANAGER_REPORT_HIGHLIGHTS[0]?.value ?? "—",
      note: "Average across all priorities",
    },
    {
      label: "SLA compliance",
      value: api.slaCompliancePercent != null ? `${api.slaCompliancePercent}%` : MANAGER_REPORT_HIGHLIGHTS[1]?.value ?? "—",
      note: "Closed tickets within SLA",
    },
    ...(MANAGER_REPORT_HIGHLIGHTS.length > 2 ? [MANAGER_REPORT_HIGHLIGHTS[2]] : []),
  ];

  return { volume, products, agents, resolutionTrend, highlights };
}

export function useManagerReportsData({ range, customFrom, customTo }) {
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { startDate, endDate } = getDateRange(range, customFrom, customTo);
    try {
      const data = await getManagerReports({ startDate, endDate });
      setApiData(data ?? null);
    } catch (e) {
      console.warn("[useManagerReportsData] API hatasi, mock'a donuluyor.", e);
      setApiData(null);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [range, customFrom, customTo]);

  useEffect(() => {
    load();
  }, [load]);

  const normalized = useMemo(() => normalizeReportsPayload(apiData), [apiData]);

  return {
    volume: normalized?.volume ?? MANAGER_REPORT_VOLUME,
    products: normalized?.products ?? MANAGER_REPORT_PRODUCTS,
    agents: normalized?.agents ?? MANAGER_REPORT_AGENTS,
    resolutionTrend: normalized?.resolutionTrend ?? MANAGER_REPORT_TREND,
    highlights: normalized?.highlights ?? MANAGER_REPORT_HIGHLIGHTS,
    //categories: MANAGER_REPORT_CATEGORIES, // API'de urun paylari var; mock ile ayni sekil
    loading,
    error,
    refetch: load,
  };
}
