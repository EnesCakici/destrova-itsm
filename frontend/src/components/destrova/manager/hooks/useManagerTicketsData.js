import { useCallback, useEffect, useMemo, useState } from "react";
import { useKeycloak } from "../../../../context/KeycloakContext";
import { isTicketInvolvedForAgent } from "../../agent/data/workspaceModel";
import { getAllTickets } from "../api/api";
import {
  MANAGER_TICKET_FILTER_OPTIONS,
  normalizeManagerPriorityCode,
  normalizeManagerStatusCode,
} from "../utils/managerFilterCodes";

const STATUS_FROM_API = {
  NEW: "New",
  IN_PROGRESS: "In Progress",
  WAITING_FOR_CUSTOMER: "Waiting for Customer",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

function mapStatus(s) {
  if (s == null) return "New";
  const k = String(s).trim().toUpperCase().replace(/\s+/g, "_");
  if (STATUS_FROM_API[k]) return STATUS_FROM_API[k];
  if (Object.values(STATUS_FROM_API).includes(s)) return s;
  return s;
}

function mapPriority(p) {
  if (p == null) return "Medium";
  if (p === "High" || p === "Medium" || p === "Low") return p;
  const u = String(p).toUpperCase();
  if (u === "HIGH") return "High";
  if (u === "MEDIUM") return "Medium";
  if (u === "LOW") return "Low";
  return "Medium";
}

function isNumericTicketId(ticketId) {
  if (ticketId == null) return false;
  if (typeof ticketId === "number" && !Number.isNaN(ticketId)) return true;
  return typeof ticketId === "string" && /^\d+$/.test(ticketId);
}

function buildRouteAndDisplayId(ticketId) {
  if (ticketId == null) {
    return { rawId: null, id: "—", displayId: "—" };
  }
  if (isNumericTicketId(ticketId)) {
    const id = String(ticketId);
    return { rawId: ticketId, id, displayId: `#${ticketId}` };
  }
  return { rawId: ticketId, id: ticketId, displayId: ticketId };
}

function parseTime(iso) {
  if (iso == null) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

function formatDueFromMinutes(totalMins) {
  if (totalMins == null || totalMins < 0) return "—";
  const h = Math.floor(totalMins / 60);
  const m = Math.round(totalMins % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatRelativeUpdated(iso) {
  if (iso == null) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const diffMin = Math.round((Date.now() - t) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} hr ago`;
  return "Yesterday";
}

function formatOpenedAt(iso) {
  if (iso == null) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function computeRemainingPct(createdMs, slaMs, nowMs) {
  if (createdMs == null || slaMs == null) return 0;
  const total = slaMs - createdMs;
  const left = slaMs - nowMs;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((left / total) * 100)));
}

function mapBackendSlaState(raw) {
  if (raw == null || raw === "") return null;
  const k = String(raw).toUpperCase().replace(/[\s-]+/g, "_");
  const T = {
    AT_RISK: { state: "atRisk", label: "At risk" },
    BREACHED: { state: "breached", label: "Breached" },
    SAFE: { state: "safe", label: "Safe" },
    PAUSED: { state: "paused", label: "Paused" },
    MET: { state: "paused", label: "Met" },
  };
  return T[k] ?? null;
}

function buildSlaFromDates(ticket) {
  const raw = String(ticket.status || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  const isClosed = raw === "CLOSED";
  const isResolved = raw === "RESOLVED";
  const now = Date.now();
  const createdMs = parseTime(ticket.createdAt);
  const slaMs = parseTime(ticket.slaDueDate);

  if (isClosed || isResolved) {
    return {
      state: "paused",
      label: isClosed ? "Met" : "Paused",
      remainingPct: isClosed ? 100 : 50,
      due: isClosed ? "Met" : "Awaiting closure",
    };
  }
  if (slaMs == null) {
    return { state: "paused", label: "Paused", remainingPct: 0, due: "No SLA" };
  }
  if (now > slaMs) {
    return { state: "breached", label: "Breached", remainingPct: 0, due: "Overdue" };
  }
  const leftMin = (slaMs - now) / 60000;
  if (leftMin <= 120 && leftMin > 0) {
    const pct = computeRemainingPct(createdMs, slaMs, now);
    return {
      state: "atRisk",
      label: "At risk",
      remainingPct: pct,
      due: formatDueFromMinutes(leftMin),
    };
  }
  const pct = computeRemainingPct(createdMs, slaMs, now);
  return {
    state: "safe",
    label: "Safe",
    remainingPct: pct,
    due: formatDueFromMinutes((slaMs - now) / 60000),
  };
}

export function normalizeTicketForManagerTable(ticket) {
  const { rawId, id, displayId } = buildRouteAndDisplayId(ticket.id);
  const title = ticket.title ?? "Untitled ticket";
  const customer =
    (ticket.creatorName != null && String(ticket.creatorName).trim() !== "")
      ? String(ticket.creatorName).trim()
      : (ticket.customerName ??
        ticket.customer ??
        (ticket.creatorId != null ? `Customer #${ticket.creatorId}` : "Unknown customer"));
  const customerEmail =
    ticket.customerEmail ??
    ticket.creatorEmail ??
    ticket.creator?.email ??
    "";
  const requester =
    ticket.requester ??
    ticket.customerName ??
    ticket.creatorName ??
    (ticket.creatorId ? `Customer #${ticket.creatorId}` : "Unknown requester");
  const product = ticket.product?.name ?? ticket.productName ?? "Uncategorized";
  const priority = mapPriority(ticket.priority);
  const status = mapStatus(ticket.status);
  const priorityCode = normalizeManagerPriorityCode(ticket.priority);
  const statusCode = normalizeManagerStatusCode(ticket.status);

  let sla = buildSlaFromDates(ticket);
  const fromApiSla = mapBackendSlaState(ticket.slaState);
  if (fromApiSla) {
    sla = { ...sla, state: fromApiSla.state, label: fromApiSla.label };
  }

  const assignee =
    ticket.assigneeName ??
    ticket.assignee?.name ??
    (ticket.assigneeId != null ? `Agent #${ticket.assigneeId}` : "Unassigned");
  const updatedAt = formatRelativeUpdated(ticket.updatedAt);
  const updatedRank =
    (ticket.updatedAt != null ? Date.parse(ticket.updatedAt) : Number.NaN) ||
    (ticket.createdAt != null ? Date.parse(ticket.createdAt) : 0) ||
    0;
  const openedAt = formatOpenedAt(ticket.createdAt);
  const createdAtMs = parseTime(ticket.createdAt);

  return {
    rawId,
    id,
    displayId,
    title,
    customer,
    customerEmail,
    requester,
    product,
    priority,
    priorityCode,
    status,
    statusCode,
    sla,
    assignee,
    assigneeId: ticket.assigneeId ?? null,
    creatorName: ticket.creatorName ?? null,
    assigneeName: ticket.assigneeName ?? null,
    closureReason: ticket.closureReason ?? null,
    updatedAt,
    updatedRank,
    openedAt,
    createdAtMs,
  };
}

export function useManagerTicketsData() {
  const { appUser, user: keycloakUser } = useKeycloak();
  const mentionEmail = appUser?.email || keycloakUser?.email || "";
  /** undefined = loading, null = failed, array = ready. */
  const [apiTickets, setApiTickets] = useState(undefined);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    let cancelled = false;
    setApiTickets(undefined);
    setError(null);

    getAllTickets()
      .then((payload) => {
        if (cancelled) return;
        setApiTickets(Array.isArray(payload) ? payload : []);
      })
      .catch((err) => {
        console.warn("[useManagerTicketsData] Ticket list failed.", err);
        if (!cancelled) {
          setApiTickets(null);
          setError(err);
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

  const loading = apiTickets === undefined;
  const loadFailed = apiTickets === null;

  const tickets = useMemo(() => {
    if (!Array.isArray(apiTickets)) return [];
    return apiTickets.map((t) => {
      const n = normalizeTicketForManagerTable(t);
      return {
        ...n,
        mentionInvolved: isTicketInvolvedForAgent(t, { email: mentionEmail }),
      };
    });
  }, [apiTickets, mentionEmail]);

  return {
    tickets,
    filterOptions: MANAGER_TICKET_FILTER_OPTIONS,
    loading,
    loadFailed,
    error,
    refetch: load,
  };
}
