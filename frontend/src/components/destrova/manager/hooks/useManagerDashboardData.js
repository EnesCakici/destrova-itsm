import { useEffect, useMemo, useState } from "react";
import { getAgentCapacities, getAllTickets, getManagerDashboard } from "../api/api";
import {
  MANAGER_DASHBOARD_FILTERS,
  MANAGER_DASHBOARD_FLOW,
  MANAGER_DASHBOARD_PRODUCTS,
  MANAGER_DASHBOARD_RANGES,
  MANAGER_DASHBOARD_SLA_INSIGHT,
  MANAGER_QUEUE_NOW,
  MANAGER_RECENT_ACTIVITY,
  MANAGER_SLA_HEALTH,
  MANAGER_TEAM_SNAPSHOT,
  MANAGER_TICKETS,
} from "../data/managerMock";

export const DEFAULT_MANAGER_DASHBOARD_FILTERS = {
  range: MANAGER_DASHBOARD_RANGES.find((r) => r.default)?.id || "7d",
  product: "All products",
  priority: "All priorities",
  status: "All statuses",
};

/** Maps dashboard range preset → { startDate, endDate } as YYYY-MM-DD (local calendar day). */
function getDateRangeForFilter(range) {
  const end = new Date();
  const start = new Date();
  if (range === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (range === "30d") {
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
  }
  const pad = (n) => String(n).padStart(2, "0");
  const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { startDate: toYmd(start), endDate: toYmd(end) };
}

/** Local [from, to] Date bounds for dashboard analytics (aligns with getDateRangeForFilter). */
function getDashboardDateBoundsForRange(range) {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  if (range === "today") {
    from.setHours(0, 0, 0, 0);
  } else if (range === "30d") {
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);
  } else {
    from.setDate(from.getDate() - 7);
    from.setHours(0, 0, 0, 0);
  }
  return { from, to };
}

/**
 * Maps GET /api/manager/capacity (AgentCapacityDto[]) to the "Team load right now" list shape
 * in ManagerDashboardView: id, name, role, load, capacity. Load % is shown in the muted role line.
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

/**
 * @returns {{ newToday: number, inProgress: number, waitingCustomer: number, resolvedToday: number } | null}
 */
function buildQueueNowFromTickets(rawTickets) {
  const list = normalizeAllTicketsList(rawTickets);
  if (list == null) return null;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const inRange = (d) => d != null && d >= start && d <= end;
  const toDate = (v) => {
    if (v == null) return null;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const normStatus = (t) =>
    String(t.status ?? t.ticketStatus ?? t.ticket_status ?? "")
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_");

  let newToday = 0;
  let inProgress = 0;
  let waitingCustomer = 0;
  let resolvedToday = 0;

  for (const t of list) {
    if (t == null || typeof t !== "object") continue;

    const st = normStatus(t);
    const created = toDate(t.createdAt ?? t.created_at);
    const closed = toDate(t.closedAt ?? t.closed_at);
    const updated = toDate(t.updatedAt ?? t.updated_at);
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

function normalizeAllTicketsList(raw) {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.tickets)) return raw.tickets;
  if (Array.isArray(raw.content)) return raw.content;
  return null;
}

function toDateMs(v) {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normTicketStatus(t) {
  return String(t.status ?? t.ticketStatus ?? t.ticket_status ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function productLabelFromTicket(t) {
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

/** Ticket is included if createdAt, updatedAt, or closedAt falls within [from, to] (inclusive). */
function ticketTouchedInRange(t, from, to) {
  if (t == null || typeof t !== "object") return false;
  const c = toDateMs(t.createdAt ?? t.created_at);
  const u = toDateMs(t.updatedAt ?? t.updated_at);
  const cl = toDateMs(t.closedAt ?? t.closed_at);
  const inB = (d) => d != null && d >= from && d <= to;
  return inB(c) || inB(u) || inB(cl);
}

/** createdAt, updatedAt, or slaDueDate falls within [from, to] (inclusive). */
function ticketCriticalDateInDashboardRange(t, from, to) {
  if (t == null || typeof t !== "object") return false;
  const inB = (d) => d != null && d >= from && d <= to;
  const c = toDateMs(t.createdAt ?? t.created_at);
  const u = toDateMs(t.updatedAt ?? t.updated_at);
  const due = toDateMs(t.slaDueDate ?? t.sla_due_date);
  return inB(c) || inB(u) || inB(due);
}

/**
 * @returns {Array<{ name, count, pct, deltaPct }> | null}
 */
function buildProductBreakdownFromTickets(rawTickets, range) {
  const list = normalizeAllTicketsList(rawTickets);
  if (list == null || list.length === 0) {
    return null;
  }
  const { from, to } = getDashboardDateBoundsForRange(range);
  const inRange = list.filter((t) => ticketTouchedInRange(t, from, to));
  if (inRange.length === 0) {
    return null;
  }

  const byName = new Map();
  for (const t of inRange) {
    const name = productLabelFromTicket(t);
    const st = normTicketStatus(t);
    const isClosed = st === "CLOSED" || st === "RESOLVED";
    const sla = String(t.slaState ?? t.sla_state ?? "").toUpperCase();
    let isBreached = sla === "BREACHED";
    let isAtRisk = sla === "AT_RISK";
    if (sla === "UNKNOWN" || sla === "" || !sla) {
      if (!isClosed) {
        const now = new Date();
        const due = toDateMs(t.slaDueDate ?? t.sla_due_date);
        const created = toDateMs(t.createdAt ?? t.created_at);
        if (due && now > due) {
          isBreached = true;
        } else if (created && due && due > created) {
          const totalMin = (due - created) / 60000;
          const elapsedMin = (now - created) / 60000;
          if (totalMin > 0 && elapsedMin / totalMin >= 0.8) {
            isAtRisk = true;
          }
        }
      }
    }
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

const RECENT_ACTIVITY_MAX = MANAGER_RECENT_ACTIVITY.length;

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

function clipText(s, max) {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

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
    const a =
      comment.authorName ||
      comment.author_name;
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

/**
 * @returns {Array<{ id, kind, actor, text, meta, ticketId?: string }> | null} — `meta` is filled in final map for UI. `ticketId` when the event is tied to a ticket from the API.
 */
function buildRecentActivityFromTickets(rawTickets) {
  const list = normalizeAllTicketsList(rawTickets);
  if (list == null || list.length === 0) {
    return null;
  }

  /** @type {Array<{ time: Date, kind: string, actor: string, text: string, key: string, ticketId?: string }>} */
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
    return null;
  }
  ev.sort((a, b) => b.time - a.time);
  return ev.slice(0, RECENT_ACTIVITY_MAX).map((e) => ({
    id: e.key,
    kind: e.kind,
    actor: e.actor,
    text: e.text,
    meta: formatActivityMeta(e.time),
    ...(e.ticketId ? { ticketId: e.ticketId } : {}),
  }));
}

const CRITICAL_TICKETS_MAX = Math.max(8, MANAGER_TICKETS.length);

function mapApiPriorityToDisplay(p) {
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

function mapStatusToDisplay(t) {
  const st = normTicketStatus(t);
  if (STATUS_TO_DISPLAY[st]) {
    return STATUS_TO_DISPLAY[st];
  }
  return String(t.status ?? "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
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

/**
 * Open tickets; prefers JSON `slaState` (backend) else derives from `slaDueDate` / `createdAt`.
 */
function computeSlaForManagerRow(t) {
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
 * @returns {Array<MockTicketRow> | null} Dizi: parse edilmiş ticket listesinden; boş dizi: kritik eşleşme yok. `null`: raw parse edilemedi.
 */
function buildCriticalTicketsFromTickets(rawTickets, range) {
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
    const pr = mapApiPriorityToDisplay(t.priority);
    const sla = computeSlaForManagerRow(t);
    const isCritical =
      sla.state === "breached" || sla.state === "atRisk" || pr === "High";
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

function passesDashboardFilter(t, product, priority, status) {
  if (product && product !== "All products" && productLabelFromTicket(t) !== product) {
    return false;
  }
  if (priority && priority !== "All priorities" && mapApiPriorityToDisplay(t.priority) !== priority) {
    return false;
  }
  if (status && status !== "All statuses" && mapStatusToDisplay(t) !== status) {
    return false;
  }
  return true;
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

function countForBuckets(tickets, product, priority, status, bucketDefs) {
  return bucketDefs.map((b) => {
    let created = 0;
    let resolved = 0;
    for (const t of tickets) {
      if (!passesDashboardFilter(t, product, priority, status)) {
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

function get7DayLineBuckets(periodFrom) {
  const start = new Date(periodFrom);
  start.setHours(0, 0, 0, 0);
  const out = [];
  for (let i = 0; i < 7; i += 1) {
    const bFrom = new Date(start);
    bFrom.setDate(start.getDate() + i);
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

/**
 * @returns { { axis, current, previous, lastWeek } }
 */
function buildTicketFlowForDashboard(tickets, range, product, priority, status) {
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
      current: countForBuckets(list, product, priority, status, bToday),
      previous: countForBuckets(list, product, priority, status, bPrev),
      lastWeek: countForBuckets(list, product, priority, status, bLw),
    };
  }
  if (range === "7d" || !range) {
    const bC = get7DayLineBuckets(from);
    const bP = get7DayLineBuckets(prevFrom);
    const bL = get7DayLineBuckets(lwFrom);
    return {
      axis: bC.map((b) => b.label),
      current: countForBuckets(list, product, priority, status, bC),
      previous: countForBuckets(list, product, priority, status, bP),
      lastWeek: countForBuckets(list, product, priority, status, bL),
    };
  }
  if (range === "30d") {
    const bC = get4SegmentBuckets(from, to);
    const bP = get4SegmentBuckets(prevFrom, prevTo);
    const bL = get4SegmentBuckets(lwFrom, lwTo);
    return {
      axis: bC.map((b) => b.label),
      current: countForBuckets(list, product, priority, status, bC),
      previous: countForBuckets(list, product, priority, status, bP),
      lastWeek: countForBuckets(list, product, priority, status, bL),
    };
  }
  {
    const bC = get7DayLineBuckets(from);
    const bP = get7DayLineBuckets(prevFrom);
    const bL = get7DayLineBuckets(lwFrom);
    return {
      axis: bC.map((b) => b.label),
      current: countForBuckets(list, product, priority, status, bC),
      previous: countForBuckets(list, product, priority, status, bP),
      lastWeek: countForBuckets(list, product, priority, status, bL),
    };
  }
}

function buildDashboardFlowHintText(range, product, priority, status) {
  const rangePart =
    MANAGER_DASHBOARD_RANGES.find((r) => r.id === range)?.label ||
    (range === "today" ? "Today" : range === "30d" ? "Last 30 days" : "Last 7 days");
  const parts = [`${rangePart} · created vs resolved`];
  if (product && product !== "All products") parts.push(product);
  if (priority && priority !== "All priorities") parts.push(priority);
  if (status && status !== "All statuses") parts.push(status);
  return parts.join(" · ");
}

/**
 * Maps GET /api/manager/dashboard (DashboardMetricsDto) onto the Destrova dashboard view shape.
 * `recentActivity` and `criticalTickets` default in mock; the hook can replace activity from `getAllTickets`.
 * `productBreakdown` / `teamSnapshot` default in mock; the hook can replace with live data.
 */
export function normalizeManagerDashboardPayload(apiData, mockData) {
  if (apiData == null) {
    return mockData;
  }

  const liveSignals = {
    breached: apiData.slaViolations ?? mockData.liveSignals.breached,
    atRisk: apiData.atRiskTickets ?? mockData.liveSignals.atRisk,
    atRiskUrgent: mockData.liveSignals.atRiskUrgent,
    unassigned: mockData.liveSignals.unassigned,
  };

  // Yeni, doğrudan API verisinden hesaplanan SLA yüzdeleri ve insight
  const totalActive = apiData.openTickets ?? 0;
  const breachedCount = apiData.slaViolations ?? 0;
  const atRiskCount = apiData.atRiskTickets ?? 0;

  const breachedPct = totalActive > 0 ? Math.round((breachedCount / totalActive) * 100) : 0;
  const atRiskPct = totalActive > 0 ? Math.round((atRiskCount / totalActive) * 100) : 0;
  const metPct = totalActive > 0 ? 100 - breachedPct - atRiskPct : 100;

  const slaHealth = {
    metPct: Math.max(0, metPct),
    breachedPct,
    atRiskPct,
    totalActive,
  };

    let ticketFlow = mockData.ticketFlow;
    const wf = apiData.weeklyFlow;
    if (Array.isArray(wf) && wf.length > 0) {
      ticketFlow = {
        axis: wf.map((w) => w.label),
        current: wf.map((w) => ({ created: w.opened ?? 0, resolved: w.closed ?? 0 })),
        previous: mockData.ticketFlow.previous,
        lastWeek: mockData.ticketFlow.lastWeek,
      };
    }

    return {
      ...mockData,
      liveSignals,
      slaHealth,
      ticketFlow,
    };
  }

/**
 * Dashboard data: fetches from GET /api/manager/dashboard when possible; falls back to managerMock
 * on error or if the request returns nothing usable. Return shape is stable for ManagerDashboardView.
 */
export function useManagerDashboardData(filters) {
  const { range, product, priority, status } = filters;
  const [apiData, setApiData] = useState(null);
  const [teamSnapshotFromApi, setTeamSnapshotFromApi] = useState(null);
  const [queueNowFromApi, setQueueNowFromApi] = useState(null);
  const [productBreakdownFromApi, setProductBreakdownFromApi] = useState(null);
  const [recentActivityFromApi, setRecentActivityFromApi] = useState(null);
  const [criticalTicketsFromApi, setCriticalTicketsFromApi] = useState(null);
  const [ticketsListFromApi, setTicketsListFromApi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const { startDate, endDate } = getDateRangeForFilter(range);
    setLoading(true);
    setError(null);
    setApiData(null);
    setTeamSnapshotFromApi(null);
    setTicketsListFromApi(null);

    getManagerDashboard({ startDate, endDate })
      .then((payload) => {
        if (cancelled) return;
        const usable =
          payload != null && typeof payload === "object" && !Array.isArray(payload) ? payload : null;
        setApiData(usable);
      })
      .catch((err) => {
        console.warn("[useManagerDashboardData] Falling back to mock dashboard data.", err);
        if (!cancelled) {
          setApiData(null);
          setError(err);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    getAgentCapacities()
      .then((rows) => {
        if (cancelled) return;
        const live = mapAgentCapacitiesToTeamSnapshot(rows);
        setTeamSnapshotFromApi(live);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("[useManagerDashboardData] Falling back to mock team snapshot (capacity).", err);
          setTeamSnapshotFromApi(null);
        }
      });

    getAllTickets()
      .then((raw) => {
        if (cancelled) return;
        const list = normalizeAllTicketsList(raw);
        setTicketsListFromApi(list);
        setQueueNowFromApi(buildQueueNowFromTickets(raw));
        setProductBreakdownFromApi(buildProductBreakdownFromTickets(raw, range));
        setRecentActivityFromApi(buildRecentActivityFromTickets(raw));
        setCriticalTicketsFromApi(buildCriticalTicketsFromTickets(raw, range));
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn(
            "[useManagerDashboardData] Falling back to mock queue / product / recent / critical (getAllTickets).",
            err,
          );
          setTicketsListFromApi(null);
          setQueueNowFromApi(null);
          setProductBreakdownFromApi(null);
          setRecentActivityFromApi(null);
          setCriticalTicketsFromApi(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [range]);

  const mockData = useMemo(() => {
    const rangeLabel = MANAGER_DASHBOARD_RANGES.find((r) => r.id === range)?.label || "Last 7 days";

    const breached = MANAGER_TICKETS.filter((t) => t.sla.state === "breached").length;
    const atRisk = MANAGER_TICKETS.filter((t) => t.sla.state === "atRisk").length;
    const atRiskUrgent = MANAGER_TICKETS.filter(
      (t) => t.sla.state === "atRisk" && t.sla.remainingPct < 35,
    ).length;
    const unassigned = MANAGER_TICKETS.filter((t) => !t.assignee && t.status !== "Closed").length;
    const liveSignals = { breached, atRisk, atRiskUrgent, unassigned };

    const productLabel = product !== "All products" ? product : null;
    const filterBits = [];
    if (productLabel) filterBits.push(productLabel);
    if (priority !== "All priorities") filterBits.push(priority);
    if (status !== "All statuses") filterBits.push(status);
    const filterSuffix = filterBits.length ? `Filtered: ${filterBits.join(" · ")}` : null;

    const ticketFlow = MANAGER_DASHBOARD_FLOW[range] || MANAGER_DASHBOARD_FLOW["7d"];
    const productBreakdown = MANAGER_DASHBOARD_PRODUCTS[range] || MANAGER_DASHBOARD_PRODUCTS["7d"];
    //const slaInsight = MANAGER_DASHBOARD_SLA_INSIGHT[range] || MANAGER_DASHBOARD_SLA_INSIGHT["7d"];

    return {
      ranges: MANAGER_DASHBOARD_RANGES,
      filterOptions: MANAGER_DASHBOARD_FILTERS,
      rangeLabel,
      queueNow: MANAGER_QUEUE_NOW,
      liveSignals,
      ticketFlow,
      slaHealth: MANAGER_SLA_HEALTH,
      teamSnapshot: MANAGER_TEAM_SNAPSHOT,
      productBreakdown,
      recentActivity: MANAGER_RECENT_ACTIVITY,
      criticalTickets: MANAGER_TICKETS,
      filterSuffix,
    };
  }, [range, product, priority, status]);

  const ticketFlowFromList = useMemo(() => {
    if (ticketsListFromApi === null) {
      return null;
    }
    return buildTicketFlowForDashboard(ticketsListFromApi, range, product, priority, status);
  }, [ticketsListFromApi, range, product, priority, status]);

  const dashboardFlowHint = useMemo(
    () => buildDashboardFlowHintText(range, product, priority, status),
    [range, product, priority, status],
  );

  const data = useMemo(() => {
    const base = normalizeManagerDashboardPayload(apiData, mockData);
    let out = { ...base };

      // Canlı SLA insight metni (scope'ta apiData var)
    const totalActive = apiData?.openTickets ?? 0;
    const breachedCount = apiData?.slaViolations ?? 0;
    const atRiskCount = apiData?.atRiskTickets ?? 0;
    const slaInsight = totalActive === 0
      ? "No active tickets to track."
      : breachedCount > 0
        ? `${breachedCount} ticket(s) breached SLA — immediate action required.`
        : atRiskCount > 0
          ? `${atRiskCount} ticket(s) at risk of breaching SLA.`
          : `All ${totalActive} active ticket(s) within SLA.`;

    out = { ...out, slaInsight };

    if (Array.isArray(teamSnapshotFromApi) && teamSnapshotFromApi.length > 0) {
      out = { ...out, teamSnapshot: teamSnapshotFromApi };
    }
    if (queueNowFromApi != null && typeof queueNowFromApi === "object") {
      out = { ...out, queueNow: queueNowFromApi };
    }
    if (Array.isArray(productBreakdownFromApi) && productBreakdownFromApi.length > 0) {
      out = { ...out, productBreakdown: productBreakdownFromApi };
    }
    if (Array.isArray(recentActivityFromApi) && recentActivityFromApi.length > 0) {
      out = { ...out, recentActivity: recentActivityFromApi };
    }
    if (Array.isArray(criticalTicketsFromApi)) {
      out = { ...out, criticalTickets: criticalTicketsFromApi };
    }
    if (ticketFlowFromList != null) {
      out = { ...out, ticketFlow: ticketFlowFromList };
    }
    return out;
  }, [
    apiData,
    mockData,
    teamSnapshotFromApi,
    queueNowFromApi,
    productBreakdownFromApi,
    recentActivityFromApi,
    criticalTicketsFromApi,
    ticketFlowFromList,
  ]);

  return {
    ...data,
    dashboardFlowHint,
    loading,
    error,
  };
}
