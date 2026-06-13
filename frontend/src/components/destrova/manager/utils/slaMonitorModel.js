/**
 * SLA Monitor view model from raw ticket list (same API shape as getAllTickets).
 * Active SLA scope: NEW + IN_PROGRESS only.
 */

import { normalizeManagerPriorityCode, normalizeManagerStatusCode } from "./managerFilterCodes";

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

function productLabelFromTicket(t) {
  if (t == null || typeof t !== "object") return "—";
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
  return "—";
}

/** Total SLA window in ms from business rule (priority). */
export function totalSlaMsFromPriority(priority) {
  const s = String(priority ?? "")
    .trim()
    .toUpperCase();
  if (s === "HIGH" || s === "HIGH_PRIORITY") return 4 * 60 * 60 * 1000;
  if (s === "LOW" || s === "LOW_PRIORITY") return 48 * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

function formatOverdue(due, now) {
  if (!due || !now) return "Overdue";
  if (now <= due) return "—";
  const m = Math.floor((now - due) / 60000);
  if (m < 1) return "Overdue";
  if (m < 60) return `Overdue ${m}m`;
  return `Overdue ${Math.floor(m / 60)}h`;
}

/** Human relative time until due (at-risk column). */
export function formatRemainingUntil(due, now) {
  if (!due || !now) return "—";
  const m = Math.ceil((due - now) / 60000);
  if (m <= 0) return "0m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (mm === 0) return `${h}h`;
  return `${h}h ${mm}m`;
}

/**
 * @returns {"breached"|"atRisk"|"met"}
 */
function classifyFromHeuristics(t, now) {
  const due = toDateMs(t.slaDueDate ?? t.sla_due_date);
  if (!due) {
    return "met";
  }
  if (now > due) {
    return "breached";
  }
  const remaining = due - now;
  const totalWindow = totalSlaMsFromPriority(t.priority);
  if (remaining <= 0.2 * totalWindow) {
    return "atRisk";
  }
  if (remaining <= 2 * 60 * 60 * 1000) {
    return "atRisk";
  }
  return "met";
}

/**
 * @returns {"breached"|"atRisk"|"met"}
 */
function classifyPressureTier(t, now) {
  const s = String(t.slaState ?? t.sla_state ?? "")
    .trim()
    .toUpperCase();
  if (s === "BREACHED") {
    return "breached";
  }
  if (s === "AT_RISK") {
    return "atRisk";
  }
  if (s === "PAUSED" || s === "STOPPED") {
    return "met";
  }
  if (s === "SAFE" || s === "MET") {
    return "met";
  }
  return classifyFromHeuristics(t, now);
}

function buildSlaBlock(t, tier, now) {
  const due = toDateMs(t.slaDueDate ?? t.sla_due_date);
  const created = toDateMs(t.createdAt ?? t.created_at);
  if (tier === "breached") {
    return {
      state: "breached",
      remainingPct: 0,
      due: due ? formatOverdue(due, now) : "Overdue",
    };
  }
  if (tier === "atRisk") {
    let remainingPct = 32;
    if (created && due && due > created) {
      const tot = (due - created) / 60000;
      const el = (now - created) / 60000;
      if (tot > 0) {
        remainingPct = Math.max(0, Math.min(100, Math.round(100 * (1 - el / tot))));
      }
    } else if (due) {
      const totalWindow = totalSlaMsFromPriority(t.priority);
      remainingPct = Math.max(
        0,
        Math.min(100, Math.round((100 * (due - now)) / Math.max(totalWindow, 1))),
      );
    }
    return {
      state: "atRisk",
      remainingPct,
      due: due ? formatRemainingUntil(due, now) : "—",
    };
  }
  return {
    state: "safe",
    remainingPct: 85,
    due: due ? formatRemainingUntil(due, now) : "—",
  };
}

function customerLabel(t) {
  return (
    (t.creatorName && String(t.creatorName).trim()) ||
    (t.creator_name && String(t.creator_name).trim()) ||
    (t.customerName && String(t.customerName).trim()) ||
    "—"
  );
}

function assigneeLabel(t) {
  return (
    (t.assigneeName && String(t.assigneeName).trim()) ||
    (t.assignee_name && String(t.assignee_name).trim()) ||
    null
  );
}

/**
 * @param {Array} list — normalized array of tickets (may be empty)
 * @returns {{ metPct: number, breached: Array, atRisk: Array }}
 */
export function buildSlaMonitorViewModel(list) {
  const now = new Date();
  const nowMs = now.getTime();
  if (!Array.isArray(list) || list.length === 0) {
    return { metPct: 100, breached: [], atRisk: [] };
  }

  const active = list.filter((t) => {
    if (t == null || typeof t !== "object") return false;
    const st = normTicketStatus(t);
    return st === "NEW" || st === "IN_PROGRESS";
  });

  if (active.length === 0) {
    return { metPct: 100, breached: [], atRisk: [] };
  }

  const breachedRows = [];
  const atRiskRows = [];
  let metCount = 0;

  for (const t of active) {
    const tier = classifyPressureTier(t, now);
    if (tier === "met") {
      metCount += 1;
      continue;
    }
    const pr = mapApiPriorityToDisplay(t.priority);
    const st = normTicketStatus(t);
    const display = {
      id: String(t.id),
      title: String(t.title ?? "").trim() || "Ticket",
      customer: customerLabel(t),
      product: productLabelFromTicket(t),
      assignee: assigneeLabel(t),
      status: mapStatusToDisplay(t),
      statusCode: normalizeManagerStatusCode(st),
      priority: pr,
      priorityCode: normalizeManagerPriorityCode(t.priority),
      sla: buildSlaBlock(t, tier, now),
    };
    if (tier === "breached") {
      const due = toDateMs(t.slaDueDate ?? t.sla_due_date);
      const overdueMs = due ? Math.max(0, nowMs - due.getTime()) : 0;
      breachedRows.push({ display, overdueMs });
    } else {
      const due = toDateMs(t.slaDueDate ?? t.sla_due_date);
      const remainMs = due ? Math.max(0, due.getTime() - nowMs) : Number.POSITIVE_INFINITY;
      atRiskRows.push({ display, remainMs });
    }
  }

  breachedRows.sort((a, b) => b.overdueMs - a.overdueMs);
  atRiskRows.sort((a, b) => a.remainMs - b.remainMs);
  const metPct = Math.round((100 * metCount) / active.length);

  return {
    metPct,
    breached: breachedRows.map((r) => r.display),
    atRisk: atRiskRows.map((r) => r.display),
  };
}
