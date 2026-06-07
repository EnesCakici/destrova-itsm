export const TICKET_LIST_SORT_STORAGE_KEY = "destrova.agent.ticketList.sort.v2";

/** @typedef {{ field: string, dir: "asc" | "desc" }} TicketListSortState */

export const DEFAULT_TICKET_LIST_SORT = /** @type {TicketListSortState} */ ({
  field: "updated",
  dir: "desc",
});

/** One row per field — click again toggles asc/desc. */
export const TICKET_LIST_SORT_FIELDS = [
  {
    id: "updated",
    label: "Last updated",
    defaultDir: "desc",
    dirLabels: { desc: "Newest", asc: "Oldest" },
  },
  {
    id: "created",
    label: "Created",
    defaultDir: "desc",
    dirLabels: { desc: "Newest", asc: "Oldest" },
  },
  {
    id: "sla",
    label: "SLA due",
    defaultDir: "asc",
    dirLabels: { asc: "Soonest", desc: "Latest" },
  },
  {
    id: "priority",
    label: "Priority",
    defaultDir: "desc",
    dirLabels: { desc: "High → low", asc: "Low → high" },
  },
  {
    id: "status",
    label: "Status",
    defaultDir: "asc",
    dirLabels: { asc: "Workflow", desc: "Reverse" },
  },
  {
    id: "id",
    label: "Ticket ID",
    defaultDir: "asc",
    dirLabels: { asc: "A–Z", desc: "Z–A" },
  },
  {
    id: "title",
    label: "Title",
    defaultDir: "asc",
    dirLabels: { asc: "A–Z", desc: "Z–A" },
  },
];

const PRIORITY_RANK = { High: 3, Medium: 2, Low: 1 };

const STATUS_RANK = {
  New: 1,
  "In Progress": 2,
  "Waiting for Customer": 3,
  Resolved: 4,
  Closed: 5,
};

const LEGACY_SORT_MAP = {
  updated_desc: { field: "updated", dir: "desc" },
  updated_asc: { field: "updated", dir: "asc" },
  created_desc: { field: "created", dir: "desc" },
  created_asc: { field: "created", dir: "asc" },
  sla_asc: { field: "sla", dir: "asc" },
  sla_desc: { field: "sla", dir: "desc" },
  priority_desc: { field: "priority", dir: "desc" },
  priority_asc: { field: "priority", dir: "asc" },
  status_asc: { field: "status", dir: "asc" },
  id_asc: { field: "id", dir: "asc" },
  title_asc: { field: "title", dir: "asc" },
};

function isSortField(id) {
  return TICKET_LIST_SORT_FIELDS.some((f) => f.id === id);
}

function normalizeSortState(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_TICKET_LIST_SORT };
  const field = String(raw.field || "");
  const dir = raw.dir === "asc" ? "asc" : "desc";
  if (!isSortField(field)) return { ...DEFAULT_TICKET_LIST_SORT };
  return { field, dir };
}

function timeValue(iso) {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function slaTime(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

function displayIdKey(ticket) {
  const raw = String(ticket?.displayId || ticket?.id || "").trim();
  const match = raw.match(/(\d+)(?!.*\d)/);
  if (match) return Number(match[1]);
  return raw.toLowerCase();
}

function tieBreakDesc(a, b) {
  return (b.updatedRank || 0) - (a.updatedRank || 0);
}

/**
 * @param {TicketListSortState} current
 * @param {string} fieldId
 * @returns {TicketListSortState}
 */
export function toggleTicketListSortField(current, fieldId) {
  const fieldDef = TICKET_LIST_SORT_FIELDS.find((f) => f.id === fieldId);
  if (!fieldDef) return { ...DEFAULT_TICKET_LIST_SORT };

  if (current.field === fieldId) {
    return { field: fieldId, dir: current.dir === "asc" ? "desc" : "asc" };
  }
  return { field: fieldId, dir: fieldDef.defaultDir };
}

export function isDefaultTicketListSort(state) {
  const s = normalizeSortState(state);
  return s.field === DEFAULT_TICKET_LIST_SORT.field && s.dir === DEFAULT_TICKET_LIST_SORT.dir;
}

/**
 * @param {TicketListSortState} state
 * @returns {string}
 */
export function ticketListSortAriaLabel(state) {
  const s = normalizeSortState(state);
  const fieldDef = TICKET_LIST_SORT_FIELDS.find((f) => f.id === s.field);
  if (!fieldDef) return "Sort tickets";
  const dirLabel = fieldDef.dirLabels[s.dir] || s.dir;
  return `Sort: ${fieldDef.label}, ${dirLabel}. Click to change.`;
}

/**
 * @param {object[]} rows
 * @param {TicketListSortState} state
 * @returns {object[]}
 */
export function sortTicketListRows(rows, state = DEFAULT_TICKET_LIST_SORT) {
  const { field, dir } = normalizeSortState(state);
  const list = [...rows];
  const desc = dir === "desc";

  const cmp = (a, b, primary) => {
    const d = primary(a, b);
    return d !== 0 ? d : tieBreakDesc(a, b);
  };

  switch (field) {
    case "updated":
      return list.sort((a, b) =>
        cmp(a, b, (x, y) =>
          desc ? (y.updatedRank || 0) - (x.updatedRank || 0) : (x.updatedRank || 0) - (y.updatedRank || 0),
        ),
      );
    case "created":
      return list.sort((a, b) =>
        cmp(a, b, (x, y) =>
          desc ? timeValue(y.createdAt) - timeValue(x.createdAt) : timeValue(x.createdAt) - timeValue(y.createdAt),
        ),
      );
    case "sla":
      return list.sort((a, b) => {
        const sa = slaTime(a.slaDueAt);
        const sb = slaTime(b.slaDueAt);
        if (sa == null && sb == null) return tieBreakDesc(a, b);
        if (sa == null) return 1;
        if (sb == null) return -1;
        return desc ? sb - sa || tieBreakDesc(a, b) : sa - sb || tieBreakDesc(a, b);
      });
    case "priority":
      return list.sort((a, b) =>
        cmp(a, b, (x, y) =>
          desc
            ? (PRIORITY_RANK[y.priority] || 0) - (PRIORITY_RANK[x.priority] || 0)
            : (PRIORITY_RANK[x.priority] || 0) - (PRIORITY_RANK[y.priority] || 0),
        ),
      );
    case "status":
      return list.sort((a, b) =>
        cmp(a, b, (x, y) =>
          desc
            ? (STATUS_RANK[y.status] || 99) - (STATUS_RANK[x.status] || 99)
            : (STATUS_RANK[x.status] || 99) - (STATUS_RANK[y.status] || 99),
        ),
      );
    case "id":
      return list.sort((a, b) => {
        const ka = displayIdKey(a);
        const kb = displayIdKey(b);
        let d = 0;
        if (typeof ka === "number" && typeof kb === "number") d = ka - kb;
        else d = String(ka).localeCompare(String(kb));
        return desc ? -d || tieBreakDesc(a, b) : d || tieBreakDesc(a, b);
      });
    case "title":
      return list.sort((a, b) => {
        const d = String(a.title || "").localeCompare(String(b.title || ""), undefined, {
          sensitivity: "base",
        });
        return desc ? -d || tieBreakDesc(a, b) : d || tieBreakDesc(a, b);
      });
    default:
      return list.sort((a, b) => (b.updatedRank || 0) - (a.updatedRank || 0));
  }
}

export function readTicketListSortPreference() {
  if (typeof window === "undefined") return { ...DEFAULT_TICKET_LIST_SORT };
  try {
    const rawV2 = localStorage.getItem(TICKET_LIST_SORT_STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      return normalizeSortState(parsed);
    }
    const rawV1 = localStorage.getItem("destrova.agent.ticketList.sort.v1");
    if (rawV1 && LEGACY_SORT_MAP[rawV1]) {
      return { ...LEGACY_SORT_MAP[rawV1] };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_TICKET_LIST_SORT };
}

/** @param {TicketListSortState} state */
export function persistTicketListSortPreference(state) {
  try {
    localStorage.setItem(TICKET_LIST_SORT_STORAGE_KEY, JSON.stringify(normalizeSortState(state)));
  } catch {
    /* ignore */
  }
}
