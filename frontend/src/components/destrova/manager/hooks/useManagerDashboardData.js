import { useEffect, useMemo, useState } from "react";
import { getAgentCapacities, getActiveProducts, getAllTickets } from "../api/api";
import {
  MANAGER_DASHBOARD_FILTERS,
  MANAGER_DASHBOARD_FLOW,
  MANAGER_DASHBOARD_PRODUCTS,
  MANAGER_DASHBOARD_RANGES,
  MANAGER_QUEUE_NOW,
  MANAGER_RECENT_ACTIVITY,
  MANAGER_SLA_HEALTH,
  MANAGER_TEAM_SNAPSHOT,
  MANAGER_TICKETS,
} from "../data/managerMock";
import {
  buildDashboardFilterOptions,
  buildDashboardFilterSuffix,
  buildDashboardFlowHintText,
  buildFilteredDashboardAnalytics,
  buildLiveDashboardMetrics,
  normalizeAllTicketsList,
} from "../utils/dashboardAnalytics";

export const DEFAULT_MANAGER_DASHBOARD_FILTERS = {
  range: MANAGER_DASHBOARD_RANGES.find((r) => r.default)?.id || "7d",
  product: "All products",
  priority: "All priorities",
  status: "All statuses",
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
      load >= cap ? "Agent · at capacity" : `Agent · ${pct}% of capacity`;
    out.push({
      id: String(agentId ?? `i-${out.length}`),
      name: name || (agentId != null ? `Agent #${agentId}` : "Agent"),
      role,
      short,
      email: "",
      load,
      capacity: cap,
    });
  }
  return out.length > 0 ? out : null;
}

function buildMockDashboardFallback(range) {
  const breached = MANAGER_TICKETS.filter((t) => t.sla.state === "breached").length;
  const atRisk = MANAGER_TICKETS.filter((t) => t.sla.state === "atRisk").length;
  const atRiskUrgent = MANAGER_TICKETS.filter(
    (t) => t.sla.state === "atRisk" && t.sla.remainingPct < 35,
  ).length;
  const unassigned = MANAGER_TICKETS.filter((t) => !t.assignee && t.status !== "Closed").length;

  return {
    queueNow: MANAGER_QUEUE_NOW,
    liveSignals: { breached, atRisk, atRiskUrgent, unassigned },
    ticketFlow: MANAGER_DASHBOARD_FLOW[range] || MANAGER_DASHBOARD_FLOW["7d"],
    slaHealth: MANAGER_SLA_HEALTH,
    slaInsight: MANAGER_SLA_HEALTH.totalActive === 0
      ? "No active tickets to track."
      : breached > 0
        ? `${breached} ticket(s) breached SLA — immediate action required.`
        : atRisk > 0
          ? `${atRisk} ticket(s) at risk of breaching SLA.`
          : `All ${MANAGER_SLA_HEALTH.totalActive} active ticket(s) within SLA.`,
    productBreakdown: MANAGER_DASHBOARD_PRODUCTS[range] || MANAGER_DASHBOARD_PRODUCTS["7d"],
    recentActivity: MANAGER_RECENT_ACTIVITY,
    criticalTickets: MANAGER_TICKETS,
  };
}

/**
 * Dashboard data: ticket list is the source of truth (Faz 1–3).
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

  useEffect(() => {
    let cancelled = false;

    getAllTickets()
      .then((raw) => {
        if (cancelled) return;
        const list = normalizeAllTicketsList(raw);
        setTicketsRaw(Array.isArray(list) ? list : []);
        setTicketsError(null);
      })
      .catch((err) => {
        console.warn("[useManagerDashboardData] Ticket list failed; using demo fallback.", err);
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
        console.warn("[useManagerDashboardData] Capacity failed; using demo team snapshot.", err);
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
      .catch((err) => {
        console.warn("[useManagerDashboardData] Product catalog failed; using ticket labels only.", err);
        if (!cancelled) {
          setProductsFromApi(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const ticketsReady = ticketsRaw !== undefined;
  const usingMockFallback = ticketsRaw === null;
  const capacityReady = teamSnapshotFromApi !== undefined;
  const productsReady = productsFromApi !== undefined;

  const filterOptions = useMemo(() => {
    if (usingMockFallback) {
      return MANAGER_DASHBOARD_FILTERS;
    }
    const tickets = Array.isArray(ticketsRaw) ? ticketsRaw : [];
    const catalog = productsFromApi === null ? [] : (productsFromApi ?? []);
    return buildDashboardFilterOptions(catalog, tickets);
  }, [usingMockFallback, ticketsRaw, productsFromApi]);

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

  const mockFallback = useMemo(
    () => buildMockDashboardFallback(range),
    [range],
  );

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

    const resolvedTeamSnapshot = usingMockFallback
      ? (Array.isArray(teamSnapshotLive) && teamSnapshotLive.length > 0
          ? teamSnapshotLive
          : MANAGER_TEAM_SNAPSHOT)
      : teamSnapshotLive;

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
        teamSnapshot: capacityReady ? resolvedTeamSnapshot : null,
      };
    }

    if (usingMockFallback) {
      return {
        ...shell,
        ...mockFallback,
        teamSnapshot: resolvedTeamSnapshot,
      };
    }

    return {
      ...shell,
      ...liveFromTickets,
      teamSnapshot: capacityReady ? resolvedTeamSnapshot : null,
    };
  }, [
    ticketsReady,
    usingMockFallback,
    mockFallback,
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
    usingMockFallback,
    loading: !ticketsReady,
    error: ticketsError ?? capacityError,
  };
}
