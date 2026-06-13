import { useCallback, useEffect, useMemo, useState } from "react";
import { getAgentCapacities, getActiveProducts, getAllTickets } from "../api/api";
import { MANAGER_DASHBOARD_RANGES } from "../data/dashboardConstants";
import {
  buildDashboardFilterOptions,
  buildDashboardFilterSuffix,
  buildDashboardFlowHintText,
  buildFilteredDashboardAnalytics,
  buildLiveDashboardMetrics,
  normalizeAllTicketsList,
} from "../utils/dashboardAnalytics";

export { MANAGER_DASHBOARD_RANGES };

export const DEFAULT_MANAGER_DASHBOARD_FILTERS = {
  range: MANAGER_DASHBOARD_RANGES.find((r) => r.default)?.id || "7d",
  product: "All",
  priority: "All",
  status: "All",
};

/**
 * Maps GET /api/manager/capacity (AgentCapacityDto[]) to the "Team load right now" list shape.
 */
function mapAgentCapacitiesToTeamSnapshot(raw) {
  if (raw == null || !Array.isArray(raw) || raw.length === 0) {
    return null;
  }
  const out = [];
  for (const row of raw) {
    if (row == null || typeof row !== "object") continue;
    const agentId = row.agentId ?? row.agent_id;
    const name = String(row.agentName ?? row.agent_name ?? "").trim();
    const parts = name.split(/\s+/).filter(Boolean);
    const short =
      parts.length >= 2
        ? `${parts[0][0]}. ${parts[parts.length - 1]}`
        : (parts[0] || "—");
    const load = Math.max(0, Number(row.activeTicketCount ?? row.active_ticket_count) || 0);
    const capNum = row.maxTicketLimit ?? row.max_ticket_limit;
    const cap = capNum != null && Number(capNum) > 0 ? Math.max(1, Math.floor(Number(capNum))) : 1;
    const pct = Math.min(100, Math.round((load / cap) * 100));
    const role =
      load >= cap
        ? { roleKey: "atCapacity" }
        : { roleKey: "pctOfCapacity", pct };
    out.push({
      id: String(agentId ?? `i-${out.length}`),
      name: name || (agentId != null ? `Agent #${agentId}` : "Agent"),
      role,
      roleKey: role.roleKey,
      rolePct: role.pct,
      short,
      email: "",
      load,
      capacity: cap,
    });
  }
  return out.length > 0 ? out : null;
}

/**
 * Dashboard data: ticket list is the source of truth.
 * Fetches tickets + product catalog once; range/filter changes recompute analytics only.
 */
export function useManagerDashboardData(filters) {
  const { range, product, priority, status } = filters;
  /** undefined = loading, null = fetch failed, array = ready (may be empty). */
  const [ticketsRaw, setTicketsRaw] = useState(undefined);
  const [ticketsError, setTicketsError] = useState(null);
  /** undefined = loading, null = failed, array = ready (may be empty). */
  const [teamSnapshotFromApi, setTeamSnapshotFromApi] = useState(undefined);
  const [capacityError, setCapacityError] = useState(null);
  /** undefined = loading, null = failed, array = catalog rows (may be empty). */
  const [productsFromApi, setProductsFromApi] = useState(undefined);

  const load = useCallback(() => {
    let cancelled = false;
    setTicketsRaw(undefined);
    setTicketsError(null);
    setTeamSnapshotFromApi(undefined);
    setCapacityError(null);
    setProductsFromApi(undefined);

    getAllTickets()
      .then((raw) => {
        if (cancelled) return;
        const list = normalizeAllTicketsList(raw);
        setTicketsRaw(Array.isArray(list) ? list : []);
        setTicketsError(null);
      })
      .catch((err) => {
        console.warn("[useManagerDashboardData] Ticket list failed.", err);
        if (!cancelled) {
          setTicketsRaw(null);
          setTicketsError(err);
        }
      });

    getAgentCapacities()
      .then((rows) => {
        if (cancelled) return;
        const live = mapAgentCapacitiesToTeamSnapshot(rows);
        setTeamSnapshotFromApi(Array.isArray(live) ? live : []);
      })
      .catch((err) => {
        console.warn("[useManagerDashboardData] Capacity failed.", err);
        if (!cancelled) {
          setTeamSnapshotFromApi(null);
          setCapacityError(err);
        }
      });

    getActiveProducts()
      .then((rows) => {
        if (cancelled) return;
        setProductsFromApi(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) {
          setProductsFromApi([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load]);

  const ticketsReady = Array.isArray(ticketsRaw);
  const loadFailed = ticketsRaw === null;
  const capacityReady = teamSnapshotFromApi !== undefined;
  const productsReady = productsFromApi !== undefined;

  const filterOptions = useMemo(() => {
    const tickets = Array.isArray(ticketsRaw) ? ticketsRaw : [];
    const catalog = Array.isArray(productsFromApi) ? productsFromApi : [];
    return buildDashboardFilterOptions(catalog, tickets);
  }, [ticketsRaw, productsFromApi]);

  const filterSuffix = useMemo(
    () => buildDashboardFilterSuffix({ product, priority, status }),
    [product, priority, status],
  );

  const rangeLabel = useMemo(
    () => MANAGER_DASHBOARD_RANGES.find((r) => r.id === range)?.label || "Last 7 days",
    [range],
  );

  const dashboardFlowHint = useMemo(
    () => buildDashboardFlowHintText(range, product, priority, status),
    [range, product, priority, status],
  );

  const liveFromTickets = useMemo(() => {
    if (!Array.isArray(ticketsRaw)) {
      return null;
    }
    const live = buildLiveDashboardMetrics(ticketsRaw);
    const filtered = buildFilteredDashboardAnalytics(ticketsRaw, {
      range,
      product,
      priority,
      status,
    });
    return { ...live, ...filtered };
  }, [ticketsRaw, range, product, priority, status]);

  const teamSnapshotLive = useMemo(() => {
    if (teamSnapshotFromApi === undefined) {
      return null;
    }
    if (teamSnapshotFromApi === null) {
      return [];
    }
    return teamSnapshotFromApi;
  }, [teamSnapshotFromApi]);

  const data = useMemo(() => {
    const shell = {
      ranges: MANAGER_DASHBOARD_RANGES,
      filterOptions,
      rangeLabel,
      filterSuffix,
      dashboardFlowHint,
    };

    if (!ticketsReady) {
      return {
        ...shell,
        queueNow: null,
        liveSignals: null,
        ticketFlow: null,
        slaHealth: null,
        slaInsight: null,
        productBreakdown: null,
        recentActivity: null,
        criticalTickets: null,
        teamSnapshot: capacityReady ? teamSnapshotLive : null,
      };
    }

    return {
      ...shell,
      ...liveFromTickets,
      teamSnapshot: capacityReady ? teamSnapshotLive : null,
    };
  }, [
    ticketsReady,
    liveFromTickets,
    teamSnapshotLive,
    capacityReady,
    rangeLabel,
    filterSuffix,
    dashboardFlowHint,
    filterOptions,
  ]);

  return {
    ...data,
    ticketsReady,
    capacityReady,
    productsReady,
    loadFailed,
    loading: !ticketsReady && !loadFailed,
    error: ticketsError ?? capacityError,
    refetch: load,
  };
}
