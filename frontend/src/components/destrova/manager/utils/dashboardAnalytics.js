/**
 * Manager dashboard analytics — single calculation engine (Faz 2).
 * Live metrics (KPI, queue, SLA right now) ignore period/product filters.
 * Filtered analytics (flow, critical, product breakdown) share one filter contract.
 */

import {
  DASHBOARD_CRITICAL_TICKETS_MAX,
  DASHBOARD_RECENT_ACTIVITY_MAX,
  MANAGER_DASHBOARD_RANGES,
} from "../data/dashboardConstants";
import {
  DASHBOARD_ALL_PRIORITIES,
  DASHBOARD_ALL_PRODUCTS,
  DASHBOARD_ALL_STATUSES,
  DASHBOARD_PRIORITY_OPTIONS,
  DASHBOARD_STATUS_OPTIONS,
  FILTER_ALL,
  normalizeManagerPriorityCode,
} from "./managerFilterCodes";
import { buildSlaMonitorViewModel } from "./slaMonitorModel";

export {
  DASHBOARD_ALL_PRIORITIES,
  DASHBOARD_ALL_PRODUCTS,
  DASHBOARD_ALL_STATUSES,
  DASHBOARD_PRIORITY_OPTIONS,
  DASHBOARD_STATUS_OPTIONS,
  FILTER_ALL,
};

export function normalizeAllTicketsList(raw) {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.tickets)) return raw.tickets;
  if (Array.isArray(raw.content)) return raw.content;
  return null;
}

export function normalizeProductNameFromCatalog(row) {
  if (row == null) return null;
  if (typeof row === "string") {
    const s = row.trim();
    return s || null;
  }
  if (typeof row !== "object") return null;
  const name = row.name ?? row.productName ?? row.product_name;
  if (name == null) return null;
  const s = String(name).trim();
  return s || null;
}

/** Unique product labels seen on tickets (includes unassigned bucket). */
export function collectProductLabelsFromTickets(tickets) {
  if (!Array.isArray(tickets) || tickets.length === 0) {
    return [];
  }
  const seen = new Set();
  const out = [];
  for (const t of tickets) {
    const label = productLabelFromTicket(t);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

/**
 * Product dropdown — GET /api/products names first, then ticket-only labels (Faz 3).
 */
export function buildDashboardProductFilterOptions(catalogProducts, tickets) {
  const names = new Set();
  const ordered = [];

  const catalog = Array.isArray(catalogProducts) ? catalogProducts : [];
  for (const row of catalog) {
    const name = normalizeProductNameFromCatalog(row);
    if (!name || names.has(name)) continue;
    names.add(name);
    ordered.push(name);
  }
  ordered.sort((a, b) => a.localeCompare(b));

  const extras = [];
  for (const label of collectProductLabelsFromTickets(tickets)) {
    if (!names.has(label)) {
      names.add(label);
      extras.push(label);
    }
  }

  return [DASHBOARD_ALL_PRODUCTS, ...ordered, ...extras];
}

export function buildDashboardFilterOptions(catalogProducts, tickets) {
  return {
    product: buildDashboardProductFilterOptions(catalogProducts, tickets),
    priority: DASHBOARD_PRIORITY_OPTIONS,
    status: DASHBOARD_STATUS_OPTIONS,
  };
}

/** Reset product when catalog loads and the current value is no longer valid. */
export function sanitizeDashboardProductFilter(product, filterOptions) {
  const options = filterOptions?.product;
  if (!Array.isArray(options) || options.length === 0) {
    return DASHBOARD_ALL_PRODUCTS;
  }
  if (product && options.includes(product)) {
    return product;
  }
  return DASHBOARD_ALL_PRODUCTS;
}

export function toDateMs(v) {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function normTicketStatus(t) {
  return String(t.status ?? t.ticketStatus ?? t.ticket_status ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

export function mapApiPriorityToDisplay(p) {
  const s = String(p ?? "")
    .trim()
    .toUpperCase();
  if (s === "HIGH" || s === "HIGH_PRIORITY") return "High";
  if (s === "MEDIUM" || s === "MEDIUM_PRIORITY") return "Medium";
  if (s === "LOW" || s === "LOW_PRIORITY") return "Low";
  return s ? s[0] + s.slice(1).toLowerCase() : "Medium";
}

const STATUS_TO_DISPLAY = {
  NEW: "New",
  IN_PROGRESS: "In Progress",
  WAITING_FOR_CUSTOMER: "Waiting for Customer",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export function mapStatusToDisplay(t) {
  const st = normTicketStatus(t);
  if (STATUS_TO_DISPLAY[st]) {
    return STATUS_TO_DISPLAY[st];
  }
  return String(t.status ?? "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function productLabelFromTicket(t) {
  if (t == null || typeof t !== "object") return "Unassigned product";
  const p = t.product;
  if (p && typeof p === "object" && p.name != null) {
    const n = String(p.name).trim();
    if (n) return n;
  }
  if (t.productName != null && String(t.productName).trim()) {
    return String(t.productName).trim();
  }
  if (typeof t.product === "string" && t.product.trim()) {
    return t.product.trim();
  }
  return "Unassigned product";
}

/** Maps dashboard range preset → local [from, to] Date bounds. */
export function getDashboardDateBoundsForRange(range) {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  if (range === "today") {
    from.setHours(0, 0, 0, 0);
  } else if (range === "30d") {
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);
  } else {
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
  }
  return { from, to };
}

/** Ticket touched the period if createdAt, updatedAt, or closedAt is in [from, to]. */
export function ticketTouchedInRange(t, from, to) {
  if (t == null || typeof t !== "object") return false;
  const c = toDateMs(t.createdAt ?? t.created_at);
  const u = toDateMs(t.updatedAt ?? t.updated_at);
  const cl = toDateMs(t.closedAt ?? t.closed_at);
  const inB = (d) => d != null && d >= from && d <= to;
  return inB(c) || inB(u) || inB(cl);
}

/** Critical pool date rule: createdAt, updatedAt, or slaDueDate in range. */
export function ticketCriticalDateInDashboardRange(t, from, to) {
  if (t == null || typeof t !== "object") return false;
  const inB = (d) => d != null && d >= from && d <= to;
  const c = toDateMs(t.createdAt ?? t.created_at);
  const u = toDateMs(t.updatedAt ?? t.updated_at);
  const due = toDateMs(t.slaDueDate ?? t.sla_due_date);
  return inB(c) || inB(u) || inB(due);
}

/**
 * Shared product / priority / status filter (range applied separately per widget).
 * @param {{ product?: string, priority?: string, status?: string }} filters
 */
export function passesDashboardDimensionFilter(t, filters) {
  const product = filters?.product ?? DASHBOARD_ALL_PRODUCTS;
  const priority = filters?.priority ?? DASHBOARD_ALL_PRIORITIES;
  const status = filters?.status ?? DASHBOARD_ALL_STATUSES;

  if (product !== DASHBOARD_ALL_PRODUCTS && productLabelFromTicket(t) !== product) {
    return false;
  }
  if (priority !== DASHBOARD_ALL_PRIORITIES && normalizeManagerPriorityCode(t.priority) !== priority) {
    return false;
  }
  if (status !== DASHBOARD_ALL_STATUSES && normTicketStatus(t) !== status) {
    return false;
  }
  return true;
}

/** @deprecated alias */
export function passesDashboardFilter(t, product, priority, status) {
  return passesDashboardDimensionFilter(t, { product, priority, status });
}

export function buildDashboardFilterSuffix({ product, priority, status }, labelFor) {
  const filterBits = [];
  if (product && product !== DASHBOARD_ALL_PRODUCTS) filterBits.push(labelFor ? labelFor("product", product) : product);
  if (priority && priority !== DASHBOARD_ALL_PRIORITIES) filterBits.push(labelFor ? labelFor("priority", priority) : priority);
  if (status && status !== DASHBOARD_ALL_STATUSES) filterBits.push(labelFor ? labelFor("status", status) : status);
  return filterBits.length ? filterBits.join(" · ") : null;
}

export function buildDashboardFlowHintText(range, product, priority, status) {
  const rangePart =
    MANAGER_DASHBOARD_RANGES.find((r) => r.id === range)?.label ||
    (range === "today" ? "Today" : range === "30d" ? "Last 30 days" : "Last 7 days");
  const parts = [`${rangePart} · created vs resolved`];
  if (product && product !== DASHBOARD_ALL_PRODUCTS) parts.push(product);
  if (priority && priority !== DASHBOARD_ALL_PRIORITIES) parts.push(priority);
  if (status && status !== DASHBOARD_ALL_STATUSES) parts.push(status);
  return parts.join(" · ");
}

function formatDueHuman(due, now) {
  if (!due || !now) return "—";
  if (now > due) {
    const m = Math.floor((now - due) / 60000);
    if (m < 1) return "Overdue";
    if (m < 60) return `Overdue ${m}m`;
    return `Overdue ${Math.floor(m / 60)}h`;
  }
  const m = Math.floor((due - now) / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/** SLA row shape for dashboard tables (open tickets). */
export function computeSlaForManagerRow(t) {
  const st = normTicketStatus(t);
  if (st === "RESOLVED" || st === "CLOSED") {
    return { state: "safe", label: "Met", remainingPct: 100, due: "Met" };
  }
  const now = new Date();
  const created = toDateMs(t.createdAt ?? t.created_at);
  const due = toDateMs(t.slaDueDate ?? t.sla_due_date);
  const s = String(t.slaState ?? t.sla_state ?? "")
    .trim()
    .toUpperCase();
  if (st === "WAITING_FOR_CUSTOMER" || s === "PAUSED") {
    return { state: "paused", label: "Paused", remainingPct: 50, due: "Awaiting requester" };
  }
  if (s === "BREACHED" || (due && now > due)) {
    return {
      state: "breached",
      label: "Breached",
      remainingPct: 0,
      due: due ? formatDueHuman(due, now) : "Overdue",
    };
  }
  if (s === "AT_RISK") {
    let r = 32;
    if (created && due) {
      const tot = (due - created) / 60000;
      const el = (now - created) / 60000;
      if (tot > 0) {
        r = Math.max(0, Math.min(100, Math.round(100 * (1 - el / tot))));
      }
    }
    return { state: "atRisk", label: "At risk", remainingPct: r, due: due ? formatDueHuman(due, now) : "—" };
  }
  if (s === "SAFE" && created && due && now <= due) {
    const totMin = (due - created) / 60000;
    const elMin = (now - created) / 60000;
    if (totMin > 0 && elMin >= 0.8 * totMin) {
      return {
        state: "atRisk",
        label: "At risk",
        remainingPct: Math.max(0, Math.min(100, Math.round(100 * (1 - elMin / totMin)))),
        due: formatDueHuman(due, now),
      };
    }
  }
  if (s === "UNKNOWN" || s === "" || s === "SAFE" || s === "STOPPED") {
    if (created && due) {
      if (now > due) {
        return { state: "breached", label: "Breached", remainingPct: 0, due: formatDueHuman(due, now) };
      }
      const totMin = (due - created) / 60000;
      const elMin = (now - created) / 60000;
      if (totMin > 0) {
        if (elMin >= 0.8 * totMin) {
          return {
            state: "atRisk",
            label: "At risk",
            remainingPct: Math.max(0, Math.min(100, Math.round(100 * (1 - elMin / totMin)))),
            due: formatDueHuman(due, now),
          };
        }
        return {
          state: "safe",
          label: "Safe",
          remainingPct: Math.max(0, Math.min(100, Math.round(100 * (1 - elMin / totMin)))),
          due: formatDueHuman(due, now),
        };
      }
    }
  }
  const rem =
    created && due
      ? Math.max(0, Math.min(100, Math.round(100 * ((due - now) / Math.max(due - created, 1)))))
      : 85;
  return { state: "safe", label: "Safe", remainingPct: rem, due: due ? formatDueHuman(due, now) : "—" };
}

function ticketHasAssignee(t) {
  const name = t.assigneeName ?? t.assignee_name ?? t.assignee;
  if (name != null && String(name).trim()) {
    return true;
  }
  const id = t.assigneeId ?? t.assignee_id;
  return id != null && id !== "";
}

function normTicketStatusForSla(t) {
  return String(t?.status ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

export function buildSlaRightNowFromTickets(tickets) {
  const { metPct, breached, atRisk } = buildSlaMonitorViewModel(tickets);
  const breachedCount = breached.length;
  const atRiskCount = atRisk.length;
  const totalActive = Array.isArray(tickets)
    ? tickets.filter((t) => {
        const st = normTicketStatusForSla(t);
        return st === "NEW" || st === "IN_PROGRESS";
      }).length
    : 0;
  const breachedPct = totalActive > 0 ? Math.round((breachedCount / totalActive) * 100) : 0;
  const atRiskPct = totalActive > 0 ? Math.round((atRiskCount / totalActive) * 100) : 0;
  const slaInsight =
    totalActive === 0
      ? { key: "dashboard.slaInsight.noActive" }
      : breachedCount > 0
        ? { key: "dashboard.slaInsight.breached", params: { count: breachedCount } }
        : atRiskCount > 0
          ? { key: "dashboard.slaInsight.atRisk", params: { count: atRiskCount } }
          : { key: "dashboard.slaInsight.allWithin", params: { count: totalActive } };

  return {
    slaHealth: {
      metPct,
      breachedPct,
      atRiskPct,
      totalActive,
    },
    slaInsight,
    breachedCount,
    atRiskCount,
  };
}

export function buildLiveSignalsFromTickets(tickets) {
  const sla = buildSlaRightNowFromTickets(tickets);
  let unassigned = 0;
  let atRiskUrgent = 0;
  for (const t of tickets) {
    if (t == null || typeof t !== "object") continue;
    const st = normTicketStatus(t);
    if (st === "CLOSED" || st === "RESOLVED") continue;
    if (!ticketHasAssignee(t)) {
      unassigned += 1;
    }
    const row = computeSlaForManagerRow(t);
    if (row.state === "atRisk" && row.remainingPct < 35) {
      atRiskUrgent += 1;
    }
  }
  return {
    breached: sla.breachedCount,
    atRisk: sla.atRiskCount,
    atRiskUrgent,
    unassigned,
  };
}

export function buildQueueNowFromTickets(rawTickets) {
  const list = normalizeAllTicketsList(rawTickets);
  if (list == null) return null;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const inRange = (d) => d != null && d >= start && d <= end;

  let newToday = 0;
  let inProgress = 0;
  let waitingCustomer = 0;
  let resolvedToday = 0;

  for (const t of list) {
    if (t == null || typeof t !== "object") continue;

    const st = normTicketStatus(t);
    const created = toDateMs(t.createdAt ?? t.created_at);
    const closed = toDateMs(t.closedAt ?? t.closed_at);
    const updated = toDateMs(t.updatedAt ?? t.updated_at);
    if (created && inRange(created)) {
      newToday += 1;
    }

    if (st === "IN_PROGRESS") {
      inProgress += 1;
    }
    if (st === "WAITING_FOR_CUSTOMER") {
      waitingCustomer += 1;
    }

    if (st === "RESOLVED" || st === "CLOSED") {
      const doneAt = closed ?? updated;
      if (doneAt && inRange(doneAt)) {
        resolvedToday += 1;
      } else {
        const slaState = String(t.slaState ?? t.sla_state ?? "").toUpperCase();
        if (slaState === "STOPPED" && created && inRange(created)) {
          resolvedToday += 1;
        }
      }
    }
  }

  return {
    newToday,
    inProgress,
    waitingCustomer,
    resolvedToday,
  };
}

function addDaysToDate(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function getPreviousWindow(from, to) {
  const dur = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(from.getTime() - dur);
  return { from: prevFrom, to: prevTo };
}

function shiftRangeByCalendarDays(from, to, days) {
  return { from: addDaysToDate(from, days), to: addDaysToDate(to, days) };
}

function resolutionEventTime(t) {
  const cl = toDateMs(t.closedAt ?? t.closed_at);
  if (cl) return cl;
  const st = normTicketStatus(t);
  if (st === "RESOLVED" || st === "CLOSED") {
    return toDateMs(t.updatedAt ?? t.updated_at);
  }
  return null;
}

function eventInWindow(ev, wFrom, wTo) {
  return ev && ev >= wFrom && ev <= wTo;
}

function countForBuckets(tickets, dimensionFilters, bucketDefs) {
  return bucketDefs.map((b) => {
    let created = 0;
    let resolved = 0;
    for (const t of tickets) {
      if (!passesDashboardDimensionFilter(t, dimensionFilters)) {
        continue;
      }
      const c = toDateMs(t.createdAt ?? t.created_at);
      if (eventInWindow(c, b.from, b.to)) {
        created += 1;
      }
      const r = resolutionEventTime(t);
      if (eventInWindow(r, b.from, b.to)) {
        resolved += 1;
      }
    }
    return { created, resolved };
  });
}

function getToday6HourlyBuckets(periodFrom) {
  const day = new Date(periodFrom);
  day.setHours(0, 0, 0, 0);
  const labels = ["00", "04", "08", "12", "16", "20"];
  const hours = [0, 4, 8, 12, 16, 20];
  return hours.map((h, i) => {
    const bFrom = new Date(day);
    bFrom.setHours(h, 0, 0, 0);
    const bTo = new Date(day);
    if (i < hours.length - 1) {
      bTo.setHours(hours[i + 1], 0, 0, 0);
      bTo.setTime(bTo.getTime() - 1);
    } else {
      bTo.setHours(23, 59, 59, 999);
    }
    return { from: bFrom, to: bTo, label: labels[i] };
  });
}

/** Seven daily buckets ending on periodTo (inclusive) — "last 7 days" includes today. */
function get7DayLineBuckets(periodFrom, periodTo) {
  const endDay = new Date(periodTo ?? periodFrom);
  endDay.setHours(0, 0, 0, 0);
  const out = [];
  for (let i = 6; i >= 0; i -= 1) {
    const bFrom = new Date(endDay);
    bFrom.setDate(endDay.getDate() - i);
    bFrom.setHours(0, 0, 0, 0);
    const bTo = new Date(bFrom);
    bTo.setHours(23, 59, 59, 999);
    out.push({ from: bFrom, to: bTo, label: bFrom.toLocaleDateString("en-GB", { weekday: "short" }) });
  }
  return out;
}

function get4SegmentBuckets(periodFrom, periodTo) {
  const pFrom = new Date(periodFrom);
  const pTo = new Date(periodTo);
  const ms = Math.max(0, pTo.getTime() - pFrom.getTime() + 1);
  const seg = ms / 4;
  return [0, 1, 2, 3].map((i) => {
    const f = new Date(pFrom.getTime() + i * seg);
    const t =
      i === 3
        ? new Date(pTo)
        : new Date(pFrom.getTime() + (i + 1) * seg - 1);
    return { from: f, to: t, label: `W${i + 1}` };
  });
}

export function buildTicketFlowForDashboard(tickets, range, dimensionFilters) {
  const list = Array.isArray(tickets) ? tickets : [];
  const { from, to } = getDashboardDateBoundsForRange(range);
  const { from: prevFrom, to: prevTo } = getPreviousWindow(from, to);
  const { from: lwFrom, to: lwTo } = shiftRangeByCalendarDays(from, to, -7);

  if (range === "today") {
    const bToday = getToday6HourlyBuckets(from);
    const bPrev = getToday6HourlyBuckets(prevFrom);
    const bLw = getToday6HourlyBuckets(lwFrom);
    return {
      axis: bToday.map((b) => b.label),
      current: countForBuckets(list, dimensionFilters, bToday),
      previous: countForBuckets(list, dimensionFilters, bPrev),
      lastWeek: countForBuckets(list, dimensionFilters, bLw),
    };
  }
  if (range === "7d" || !range) {
    const bC = get7DayLineBuckets(from, to);
    const bP = get7DayLineBuckets(prevFrom, prevTo);
    const bL = get7DayLineBuckets(lwFrom, lwTo);
    return {
      axis: bC.map((b) => b.label),
      current: countForBuckets(list, dimensionFilters, bC),
      previous: countForBuckets(list, dimensionFilters, bP),
      lastWeek: countForBuckets(list, dimensionFilters, bL),
    };
  }
  if (range === "30d") {
    const bC = get4SegmentBuckets(from, to);
    const bP = get4SegmentBuckets(prevFrom, prevTo);
    const bL = get4SegmentBuckets(lwFrom, lwTo);
    return {
      axis: bC.map((b) => b.label),
      current: countForBuckets(list, dimensionFilters, bC),
      previous: countForBuckets(list, dimensionFilters, bP),
      lastWeek: countForBuckets(list, dimensionFilters, bL),
    };
  }
  const bC = get7DayLineBuckets(from, to);
  const bP = get7DayLineBuckets(prevFrom, prevTo);
  const bL = get7DayLineBuckets(lwFrom, lwTo);
  return {
    axis: bC.map((b) => b.label),
    current: countForBuckets(list, dimensionFilters, bC),
    previous: countForBuckets(list, dimensionFilters, bP),
    lastWeek: countForBuckets(list, dimensionFilters, bL),
  };
}

const CRITICAL_TICKETS_MAX = DASHBOARD_CRITICAL_TICKETS_MAX;

function clipText(s, max) {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function formatActivityMeta(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  const now = Date.now();
  const diff = Math.max(0, now - d.getTime());
  const s = Math.floor(diff / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString();
}

function formatUpdatedCell(t) {
  const u = toDateMs(t.updatedAt ?? t.updated_at);
  if (!u) return "—";
  return formatActivityMeta(u);
}

function formatOpenedCell(t) {
  const c = toDateMs(t.createdAt ?? t.created_at);
  if (!c) return "—";
  return c.toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * @returns {Array<{ name, count, pct, deltaPct }>}
 */
export function buildProductBreakdownFromTickets(rawTickets, range, dimensionFilters) {
  const list = normalizeAllTicketsList(rawTickets);
  if (list == null || list.length === 0) {
    return [];
  }
  const { from, to } = getDashboardDateBoundsForRange(range);
  const inRange = list.filter(
    (t) =>
      ticketTouchedInRange(t, from, to) &&
      passesDashboardDimensionFilter(t, dimensionFilters),
  );
  if (inRange.length === 0) {
    return [];
  }

  const byName = new Map();
  for (const t of inRange) {
    const name = productLabelFromTicket(t);
    const st = normTicketStatus(t);
    const isClosed = st === "CLOSED" || st === "RESOLVED";
    const slaRow = computeSlaForManagerRow(t);
    const isBreached = slaRow.state === "breached";
    const isAtRisk = slaRow.state === "atRisk";

    if (!byName.has(name)) {
      byName.set(name, { count: 0, open: 0, closed: 0, breached: 0, atRisk: 0 });
    }
    const agg = byName.get(name);
    agg.count += 1;
    if (isClosed) {
      agg.closed += 1;
    } else {
      agg.open += 1;
    }
    if (isBreached) {
      agg.breached += 1;
    }
    if (isAtRisk) {
      agg.atRisk += 1;
    }
  }

  const total = inRange.length;
  const rows = [];
  for (const [name, a] of byName) {
    const c = a.count;
    const pct = total > 0 ? Math.min(100, Math.round((100 * c) / total)) : 0;
    const nOpen = a.open;
    const nClosed = a.closed;
    const mix = Math.max(-100, Math.min(100, Math.round((100 * (nOpen - nClosed)) / Math.max(c, 1))));
    const slaStrain = Math.round((100 * (a.breached * 2 + a.atRisk)) / Math.max(c, 1));
    const deltaPct = Math.max(-100, Math.min(100, mix - Math.min(50, Math.round(slaStrain / 2))));
    rows.push({ name, count: c, pct, deltaPct });
  }
  rows.sort((x, y) => y.count - x.count);
  return rows;
}

export function buildCriticalTicketsFromTickets(rawTickets, range, dimensionFilters) {
  const list = normalizeAllTicketsList(rawTickets);
  if (list == null) {
    return null;
  }
  const { from, to } = getDashboardDateBoundsForRange(range);
  const rows = [];
  for (const t of list) {
    if (t == null || typeof t !== "object") continue;
    const st = normTicketStatus(t);
    if (st === "CLOSED" || st === "RESOLVED") {
      continue;
    }
    if (!ticketCriticalDateInDashboardRange(t, from, to)) {
      continue;
    }
    if (!passesDashboardDimensionFilter(t, dimensionFilters)) {
      continue;
    }
    const pr = mapApiPriorityToDisplay(t.priority);
    const sla = computeSlaForManagerRow(t);
    const isCritical =
      sla.state === "breached" || sla.state === "atRisk" || normalizeManagerPriorityCode(t.priority) === "HIGH";
    if (!isCritical) {
      continue;
    }
    const assignee =
      (t.assigneeName && String(t.assigneeName).trim()) ||
      (t.assignee_name && String(t.assignee_name).trim()) ||
      null;
    const unRank = assignee ? 1 : 0;
    const cust =
      (t.creatorName && String(t.creatorName).trim()) ||
      (t.creator_name && String(t.creator_name).trim()) ||
      (t.customerName && String(t.customerName).trim()) ||
      "—";
    const tier = sla.state === "breached" ? 0 : sla.state === "atRisk" ? 1 : pr === "High" ? 2 : 9;
    const created = toDateMs(t.createdAt ?? t.created_at);
    const updated = toDateMs(t.updatedAt ?? t.updated_at);
    const createdMs = created ? created.getTime() : 0;
    rows.push({
      _tier: tier,
      _unRank: unRank,
      _created: createdMs,
      id: String(t.id),
      title: clipText(t.title, 200) || "Ticket",
      customer: cust,
      customerEmail: t.creatorEmail || t.creator_email || t.customerEmail || t.customer_email || "",
      requester: cust,
      product: productLabelFromTicket(t),
      priority: pr,
      status: mapStatusToDisplay(t),
      sla,
      assignee,
      updatedAt: formatUpdatedCell(t),
      updatedAtIso: updated ? updated.toISOString() : null,
      updatedRank: 0,
      openedAt: formatOpenedCell(t),
    });
  }
  if (rows.length === 0) {
    return [];
  }
  rows.sort((a, b) => {
    if (a._tier !== b._tier) return a._tier - b._tier;
    if (a._unRank !== b._unRank) return a._unRank - b._unRank;
    return a._created - b._created;
  });
  return rows.slice(0, CRITICAL_TICKETS_MAX).map((r, i) => {
    const { _tier, _unRank, _created, ...rest } = r;
    return { ...rest, updatedRank: 100 - i };
  });
}

const RECENT_ACTIVITY_MAX = DASHBOARD_RECENT_ACTIVITY_MAX;

function ticketContextLine(t) {
  const id = t.id != null && t.id !== "" ? `#${t.id}` : "";
  const title = clipText(t.title, 64);
  if (id && title) return ` — ${id} — ${title}`;
  if (id) return ` — ${id}`;
  if (title) return ` — ${title}`;
  return "";
}

function pickActor(t, comment, worklog) {
  if (comment && typeof comment === "object") {
    const a = comment.authorName || comment.author_name;
    if (a != null && String(a).trim()) {
      return String(a).trim();
    }
  }
  if (worklog && typeof worklog === "object") {
    const a = worklog.agentName || worklog.agent_name;
    if (a != null && String(a).trim()) {
      return String(a).trim();
    }
  }
  const a =
    t?.assigneeName ||
    t?.assignee_name ||
    t?.creatorName ||
    t?.creator_name ||
    t?.customerName ||
    t?.customer_name ||
    t?.authorName ||
    t?.author_name;
  if (a != null && String(a).trim()) {
    return String(a).trim();
  }
  return "System";
}

export function buildRecentActivityFromTickets(rawTickets) {
  const list = normalizeAllTicketsList(rawTickets);
  if (list == null || list.length === 0) {
    return [];
  }

  const ev = [];
  for (const t of list) {
    if (t == null || typeof t !== "object") continue;
    const idPart = t.id != null ? String(t.id) : "t";
    const ticketId = t.id != null && String(t.id).trim() !== "" ? String(t.id) : undefined;
    const created = toDateMs(t.createdAt ?? t.created_at);
    const updated = toDateMs(t.updatedAt ?? t.updated_at);
    const closed = toDateMs(t.closedAt ?? t.closed_at);
    const ctx = ticketContextLine(t);

    if (created) {
      const creator = t.creatorName || t.creator_name || t.customerName || t.customer_name;
      const actor = creator && String(creator).trim() ? String(creator).trim() : "System";
      ev.push({
        time: created,
        kind: "create",
        actor,
        text: `New ticket created${ctx}`,
        key: `c-${idPart}-${created.getTime()}`,
        ticketId,
      });
    }

    if (closed) {
      ev.push({
        time: closed,
        kind: "resolve",
        actor: pickActor(t, null, null),
        text: `Ticket closed${ctx}`,
        key: `x-${idPart}-${closed.getTime()}`,
        ticketId,
      });
    }

    if (created && updated && updated.getTime() - created.getTime() > 2000) {
      const nearClose = closed && Math.abs(updated.getTime() - closed.getTime()) < 2000;
      if (!nearClose) {
        ev.push({
          time: updated,
          kind: "reassign",
          actor: pickActor(t, null, null),
          text: `Ticket updated${ctx}`,
          key: `u-${idPart}-${updated.getTime()}`,
          ticketId,
        });
      }
    }

    const comments = Array.isArray(t.comments) ? t.comments : [];
    for (const c of comments) {
      if (c == null || typeof c !== "object") continue;
      const ct = toDateMs(c.createdAt ?? c.created_at);
      if (!ct) continue;
      const msg = clipText(c.message, 80);
      ev.push({
        time: ct,
        kind: "comment",
        actor: pickActor(t, c, null),
        text: `Comment added${ctx}${msg ? ` — ${msg}` : ""}`,
        key: `m-${idPart}-${(c.id ?? ct.getTime())}-${ct.getTime()}`,
        ticketId,
      });
    }

    const worklogs = Array.isArray(t.worklogs) ? t.worklogs : [];
    for (const w of worklogs) {
      if (w == null || typeof w !== "object") continue;
      const wt = toDateMs(w.workDate ?? w.work_date ?? w.createdAt ?? w.created_at);
      if (!wt) continue;
      const desc = clipText(w.description, 80);
      ev.push({
        time: wt,
        kind: "assign",
        actor: pickActor(t, null, w),
        text: `Work logged${ctx}${desc ? ` — ${desc}` : ""}`,
        key: `w-${idPart}-${(w.id ?? "")}-${wt.getTime()}`,
        ticketId,
      });
    }
  }

  if (ev.length === 0) {
    return [];
  }
  ev.sort((a, b) => b.time - a.time);
  return ev.slice(0, RECENT_ACTIVITY_MAX).map((e) => ({
    id: e.key,
    kind: e.kind,
    actor: e.actor,
    text: e.text,
    meta: formatActivityMeta(e.time),
    metaIso: e.time instanceof Date ? e.time.toISOString() : e.time,
    ...(e.ticketId ? { ticketId: e.ticketId } : {}),
  }));
}

/**
 * Filtered dashboard analytics — one entry point for ticket-flow, critical, product breakdown.
 * @param {Array} tickets
 * @param {{ range: string, product: string, priority: string, status: string }} filters
 */
export function buildFilteredDashboardAnalytics(tickets, filters) {
  const { range, product, priority, status } = filters;
  const dimensionFilters = { product, priority, status };

  return {
    ticketFlow: buildTicketFlowForDashboard(tickets, range, dimensionFilters),
    productBreakdown: buildProductBreakdownFromTickets(tickets, range, dimensionFilters),
    criticalTickets: buildCriticalTicketsFromTickets(tickets, range, dimensionFilters) ?? [],
  };
}

/** Live dashboard metrics — not affected by period/product filters. */
export function buildLiveDashboardMetrics(tickets) {
  const sla = buildSlaRightNowFromTickets(tickets);
  return {
    queueNow: buildQueueNowFromTickets(tickets),
    liveSignals: buildLiveSignalsFromTickets(tickets),
    slaHealth: sla.slaHealth,
    slaInsight: sla.slaInsight,
    recentActivity: buildRecentActivityFromTickets(tickets),
  };
}

/**
 * Presets applied when a dashboard KPI navigates to All Tickets (Faz 4).
 * @typedef {Object} DashboardTicketPreset
 * @property {string} [sla] — All Tickets SLA dropdown label
 * @property {string} [status]
 * @property {string} [priority]
 * @property {"unassigned"} [assignee]
 * @property {boolean} [createdToday]
 * @property {"active"|"involved"|"past"} [timeSegment]
 * @property {string} label — banner copy
 */

export const DASHBOARD_KPI_TICKET_PRESETS = {
  slaBreaches: {
    sla: "breached",
    timeSegment: "active",
    labelKey: "dashboard.kpiPresets.slaBreaches",
  },
  atRisk: {
    sla: "atRisk",
    timeSegment: "active",
    labelKey: "dashboard.kpiPresets.atRisk",
  },
  unassigned: {
    assignee: "unassigned",
    timeSegment: "active",
    labelKey: "dashboard.kpiPresets.unassigned",
  },
  newToday: {
    createdToday: true,
    timeSegment: "active",
    labelKey: "dashboard.kpiPresets.newToday",
  },
};

export function isTicketCreatedToday(createdAtMs) {
  if (createdAtMs == null || Number.isNaN(createdAtMs)) {
    return false;
  }
  const d = new Date(createdAtMs);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function isTicketUnassignedRow(t) {
  if (t == null) return false;
  if (isClosedStatusCode(t.statusCode ?? t.status)) return false;
  if (t.assigneeId != null && t.assigneeId !== "") return false;
  const name = t.assignee != null ? String(t.assignee).trim() : "";
  if (!name || name.toLowerCase() === "unassigned") return true;
  return false;
}

function isClosedStatusCode(code) {
  const c = String(code ?? "").toUpperCase().replace(/[\s-]+/g, "_");
  return c === "CLOSED" || c === "RESOLVED" || code === "Closed" || code === "Resolved";
}
