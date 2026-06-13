/** Mock data for Destrova manager views (preview only). */

export const MANAGER_KPIS = {
  openTickets: { label: "Open tickets", value: 248, delta: { dir: "up", text: "+18 this week" } },
  slaBreaches: { label: "SLA breaches", value: 12, delta: { dir: "down", text: "−3 vs last week" } },
  atRisk: { label: "At risk", value: 24, delta: { dir: "flat", text: "Stable" } },
  avgResolution: { label: "Avg resolution", value: "6h 12m", delta: { dir: "down", text: "−42m vs avg" } },
};

export const MANAGER_TICKET_FLOW = {
  range: "Last 7 days",
  series: [
    { day: "Mon", created: 38, resolved: 30 },
    { day: "Tue", created: 42, resolved: 36 },
    { day: "Wed", created: 35, resolved: 38 },
    { day: "Thu", created: 48, resolved: 41 },
    { day: "Fri", created: 51, resolved: 47 },
    { day: "Sat", created: 22, resolved: 28 },
    { day: "Sun", created: 18, resolved: 24 },
  ],
};

export const MANAGER_SLA_HEALTH = {
  metPct: 86,
  atRiskPct: 9,
  breachedPct: 5,
  totalActive: 248,
};

export const MANAGER_TEAM_SNAPSHOT = [
  { id: "u1", name: "Alex Mercer",     role: "Senior agent", email: "alex.mercer@destrova.io",     short: "A. Mercer",  load: 18, capacity: 22 },
  { id: "u2", name: "Jordan Okonkwo",  role: "Agent",        email: "jordan.okonkwo@destrova.io",  short: "J. Okonkwo", load: 21, capacity: 22 },
  { id: "u3", name: "Samira Haddad",   role: "Agent",        email: "samira.haddad@destrova.io",   short: "S. Haddad",  load: 14, capacity: 22 },
  { id: "u4", name: "Priya Shah",      role: "Agent · L1",   email: "priya.shah@destrova.io",      short: "P. Shah",    load: 9,  capacity: 22 },
];

export const MANAGER_TEAM_FULL = [
  ...MANAGER_TEAM_SNAPSHOT,
  { id: "u5", name: "Chris Nguyen",    role: "Agent",        email: "chris.nguyen@destrova.io",    short: "C. Nguyen",  load: 12, capacity: 22 },
  { id: "u6", name: "Morgan Ellis",    role: "Agent · L1",   email: "morgan.ellis@destrova.io",    short: "M. Ellis",   load: 7,  capacity: 22 },
  { id: "u7", name: "Sarah Park",      role: "Senior agent", email: "sarah.park@destrova.io",      short: "S. Park",    load: 19, capacity: 22 },
  { id: "u8", name: "Elena Volkov",    role: "Specialist",   email: "elena.volkov@destrova.io",    short: "E. Volkov",  load: 6,  capacity: 16 },
];

const STATUS_ORDER = ["New", "In Progress", "Waiting for Customer", "Resolved", "Closed"];
const PRIORITIES = ["Low", "Medium", "High"];

export const MANAGER_TICKETS = [
  {
    id: "DES-1842",
    title: "VPN client disconnects after sleep/wake on macOS Sonoma",
    customer: "Northwind Trading",
    customerEmail: "elena.volkov@northwind.trading",
    requester: "Elena Volkov",
    product: "Network",
    priority: "High",
    status: "In Progress",
    sla: { state: "atRisk", label: "At risk", remainingPct: 32, due: "1h 20m" },
    assignee: "A. Mercer",
    updatedAt: "12 min ago",
    updatedRank: 100,
    openedAt: "Apr 24, 2026 · 09:14",
  },
  {
    id: "DES-1839",
    title: "Enable SAML SSO for subsidiary tenant",
    customer: "Acme Corporation",
    customerEmail: "jordan.lee@acme.example",
    requester: "Jordan Lee",
    product: "Destrova Identity",
    priority: "Medium",
    status: "Waiting for Customer",
    sla: { state: "safe", label: "Safe", remainingPct: 84, due: "18h" },
    assignee: "S. Haddad",
    updatedAt: "1 hr ago",
    updatedRank: 92,
    openedAt: "Apr 23, 2026 · 11:30",
  },
  {
    id: "DES-1836",
    title: "Exchange Online migration — batch 4 validation",
    customer: "Contoso Ltd",
    customerEmail: "samira.h@contoso.example",
    requester: "Samira Patel",
    product: "Microsoft 365",
    priority: "Medium",
    status: "New",
    sla: { state: "safe", label: "Safe", remainingPct: 94, due: "40h" },
    assignee: null,
    updatedAt: "2 hr ago",
    updatedRank: 84,
    openedAt: "Apr 25, 2026 · 08:00",
  },
  {
    id: "DES-1831",
    title: "Print queue stalled on branch print server",
    customer: "Fabrikam Industries",
    customerEmail: "ops@fabrikam.example",
    requester: "Riley Chen",
    product: "Print",
    priority: "Low",
    status: "In Progress",
    sla: { state: "breached", label: "Breached", remainingPct: 0, due: "Overdue 45m" },
    assignee: "J. Okonkwo",
    updatedAt: "3 hr ago",
    updatedRank: 76,
    openedAt: "Apr 18, 2026 · 14:00",
  },
  {
    id: "DES-1828",
    title: "Quarterly access review export for ITGC",
    customer: "Litware Inc",
    customerEmail: "compliance@litware.example",
    requester: "Priya Shah",
    product: "Destrova Identity",
    priority: "Medium",
    status: "Resolved",
    sla: { state: "paused", label: "Paused", remainingPct: 50, due: "Awaiting requester" },
    assignee: "P. Shah",
    updatedAt: "Yesterday",
    updatedRank: 60,
    openedAt: "Apr 14, 2026 · 09:00",
  },
  {
    id: "DES-1824",
    title: "Hardware refresh — asset record mismatch",
    customer: "Adventure Works",
    customerEmail: "it-help@adventure.example",
    requester: "Morgan Ellis",
    product: "Endpoint",
    priority: "Low",
    status: "Closed",
    sla: { state: "safe", label: "Met", remainingPct: 100, due: "Met" },
    assignee: "S. Park",
    updatedAt: "Apr 18",
    updatedRank: 40,
    openedAt: "Apr 12, 2026 · 16:30",
  },
  {
    id: "DES-1819",
    title: "MFA challenge fails for finance group on iOS",
    customer: "Northwind Trading",
    customerEmail: "finance@northwind.trading",
    requester: "Tomás Rivera",
    product: "Destrova Identity",
    priority: "High",
    status: "In Progress",
    sla: { state: "atRisk", label: "At risk", remainingPct: 28, due: "55m" },
    assignee: "A. Mercer",
    updatedAt: "30 min ago",
    updatedRank: 96,
    openedAt: "Apr 24, 2026 · 17:45",
  },
  {
    id: "DES-1812",
    title: "Power BI gateway connection drops nightly",
    customer: "Contoso Ltd",
    customerEmail: "data@contoso.example",
    requester: "Hugo Bernard",
    product: "Microsoft 365",
    priority: "Medium",
    status: "In Progress",
    sla: { state: "safe", label: "Safe", remainingPct: 72, due: "12h" },
    assignee: "C. Nguyen",
    updatedAt: "2 hr ago",
    updatedRank: 80,
    openedAt: "Apr 22, 2026 · 13:00",
  },
  {
    id: "DES-1805",
    title: "Onboarding kit missing for 3 new hires",
    customer: "Adventure Works",
    customerEmail: "people-ops@adventure.example",
    requester: "Lina Becker",
    product: "Endpoint",
    priority: "High",
    status: "New",
    sla: { state: "atRisk", label: "At risk", remainingPct: 18, due: "30m" },
    assignee: null,
    updatedAt: "8 min ago",
    updatedRank: 99,
    openedAt: "Apr 25, 2026 · 10:30",
  },
  {
    id: "DES-1798",
    title: "Workspace import migration — schema check",
    customer: "Litware Inc",
    customerEmail: "data-eng@litware.example",
    requester: "Dax Kim",
    product: "Other",
    priority: "Medium",
    status: "Waiting for Customer",
    sla: { state: "paused", label: "Paused", remainingPct: 50, due: "Awaiting requester" },
    assignee: "S. Park",
    updatedAt: "Yesterday",
    updatedRank: 58,
    openedAt: "Apr 15, 2026 · 09:50",
  },
];

/* ---------------- Manager ticket detail (timelines / attachments / worklog) ---------------- */

const FALLBACK_TIMELINE = [
  { type: "status_change", at: "Recent",  title: "Status changed",   body: "New → In Progress",                                        meta: "Status",       internal: false },
  { type: "internal_note", at: "Earlier", title: "Triage notes",     body: "Initial triage notes recorded by the assigned agent.",     meta: "Internal note", internal: true  },
];

const FALLBACK_ATTACHMENTS = [{ name: "screenshot.png", size: "86 KB", who: "Requester", when: "This week" }];
const FALLBACK_WORKLOG     = [{ at: "This week", agent: "A. Mercer", duration: "20m", note: "Initial diagnosis." }];

/**
 * Per-ticket detail extras. Tickets without an entry fall back to the FALLBACK_*
 * snippets above so the manager detail view always renders a coherent preview.
 */
export const MANAGER_TICKET_DETAILS = {
  "DES-1842": {
    timeline: [
      { type: "sla_warning",    at: "Today · 13:58", title: "First response SLA at risk", body: "Target will breach in 1h 20m without an agent reply on the external thread.", meta: "SLA",               internal: false },
      { type: "customer_reply", at: "Today · 13:12", title: "Elena Volkov",                body: "It reproduces after sleep and wake. Console output from the VPN client is attached.", meta: "External", internal: false },
      { type: "agent_reply",    at: "Today · 12:48", title: "Alex Mercer",                 body: "Thanks for the logs — validating NAC posture and split-tunnel behavior on 14.4.1 with corporate profile v3.2.", meta: "Public reply", internal: false },
      { type: "internal_note",  at: "Today · 11:40", title: "Alex Mercer",                 body: "Suspect captive portal redirect + DNS when returning from sleep. Not customer-visible.",                meta: "Internal note", internal: true  },
      { type: "worklog",        at: "Today · 11:05", title: "Alex Mercer",                 body: "Investigation — reproduced on macOS 14.4.1 with corporate VPN profile v3.2.",                              meta: "Worklog · 25m", internal: true  },
      { type: "assignment",     at: "Today · 09:02", title: "Assignment updated",          body: "Assigned from Network queue to Alex Mercer.",                                                              meta: "Assignment",   internal: false },
      { type: "status_change",  at: "Yesterday · 16:30", title: "Status changed",          body: "New → In Progress",                                                                                        meta: "Status",       internal: false },
    ],
    attachments: [
      { name: "vpn-client-logs.zip",      size: "1.2 MB", who: "Requester",   when: "Yesterday" },
      { name: "packet-capture-filter.txt",size: "4 KB",   who: "Alex Mercer", when: "Today"     },
    ],
    worklog: [
      { at: "Today · 12:48", agent: "A. Mercer", duration: "25m", note: "Validated NAC posture, confirmed reproduction." },
      { at: "Today · 11:05", agent: "A. Mercer", duration: "20m", note: "Reproduced on macOS 14.4.1." },
    ],
  },
  "DES-1831": {
    timeline: [
      { type: "sla_warning",    at: "45 min ago", title: "SLA breached",       body: "First-response target missed. Operations alerted.",       meta: "SLA",          internal: false },
      { type: "agent_reply",    at: "1 hr ago",   title: "Jordan Okonkwo",     body: "Restarted the print spooler service and queued a remote diagnostic.", meta: "Public reply", internal: false },
      { type: "internal_note",  at: "1 hr ago",   title: "Jordan Okonkwo",     body: "Print server is on legacy build — flagging for asset refresh.",        meta: "Internal note", internal: true  },
      { type: "assignment",     at: "3 hr ago",   title: "Assigned",           body: "Routed to Jordan Okonkwo.",                                            meta: "Assignment",   internal: false },
    ],
    attachments: [{ name: "spooler-trace.log", size: "210 KB", who: "Jordan Okonkwo", when: "1 hr ago" }],
    worklog:     [{ at: "1 hr ago", agent: "J. Okonkwo", duration: "35m", note: "Service restart + remote diagnostic." }],
  },
  "DES-1819": {
    timeline: [
      { type: "agent_reply",    at: "30 min ago", title: "Alex Mercer",        body: "Asked finance group to capture iOS console logs during MFA challenge.", meta: "Public reply", internal: false },
      { type: "internal_note",  at: "1 hr ago",   title: "Alex Mercer",        body: "Likely related to recent identity provider config change — checking with Identity team.", meta: "Internal note", internal: true },
      { type: "assignment",     at: "2 hr ago",   title: "Assigned",           body: "Routed to Alex Mercer.",                                                                   meta: "Assignment",   internal: false },
    ],
    attachments: [],
    worklog:     [{ at: "1 hr ago", agent: "A. Mercer", duration: "15m", note: "Cross-team check with Identity team." }],
  },
  "DES-1805": {
    timeline: [
      { type: "sla_warning",    at: "8 min ago",  title: "Approaching SLA",    body: "30 minutes remaining on first-response target.",                       meta: "SLA",          internal: false },
      { type: "internal_note",  at: "12 min ago", title: "Manager",            body: "Unassigned — needs immediate routing for HR-driven start dates.",       meta: "Internal note", internal: true  },
    ],
    attachments: [],
    worklog: [],
  },
};

/** Returns timeline, attachments, worklog for a ticket id, with safe fallbacks. */
export function getManagerTicketDetail(ticketId) {
  const extras = MANAGER_TICKET_DETAILS[ticketId];
  return {
    timeline:    extras?.timeline    || FALLBACK_TIMELINE,
    attachments: extras?.attachments || FALLBACK_ATTACHMENTS,
    worklog:     extras?.worklog     || FALLBACK_WORKLOG,
  };
}

export const MANAGER_TICKET_FILTER_OPTIONS = {
  status: ["All statuses", ...STATUS_ORDER],
  priority: ["All priorities", ...PRIORITIES],
  sla: ["All SLA", "Safe", "At risk", "Breached", "Paused"],
};

/* ---------------- Dashboard — operational right-now ---------------- */

/** Live ticket queue snapshot (today). */
export const MANAGER_QUEUE_NOW = {
  newToday: 27,
  inProgress: 142,
  waitingCustomer: 38,
  resolvedToday: 31,
};

/* ---------------- Dashboard — interactive analytics ---------------- */

/** Date-range presets used by the dashboard filter bar. */
export const MANAGER_DASHBOARD_RANGES = [
  { id: "today", label: "Today" },
  { id: "7d",    label: "Last 7 days", default: true },
  { id: "30d",   label: "Last 30 days" },
];

/** Filter options surfaced in the dashboard filter bar. */
export const MANAGER_DASHBOARD_FILTERS = {
  product: [
    "All products",
    "Destrova Identity",
    "Network",
    "Endpoint",
    "Microsoft 365",
    "Print",
    "Other",
  ],
  priority: ["All priorities", "High", "Medium", "Low"],
  status: ["All statuses", "New", "In Progress", "Waiting for Customer", "Resolved", "Closed"],
};

/** KPI values per range — KPIs respond to the filter bar. */
export const MANAGER_DASHBOARD_KPIS = {
  today: { breaches: 4,  atRisk: 6,  unassigned: 2,  newCount: 27,  resolved: 31  },
  "7d":  { breaches: 12, atRisk: 24, unassigned: 6,  newCount: 192, resolved: 218 },
  "30d": { breaches: 38, atRisk: 92, unassigned: 14, newCount: 824, resolved: 791 },
};

/**
 * Ticket-flow series per range and per comparison window.
 *  - axis: x-axis labels
 *  - current / previous / lastWeek: matched-length arrays of { created, resolved }
 */
export const MANAGER_DASHBOARD_FLOW = {
  today: {
    axis: ["00", "04", "08", "12", "16", "20"],
    current:  [{ created: 2, resolved: 1 }, { created: 3, resolved: 2 }, { created: 6, resolved: 4 }, { created: 9, resolved: 7 }, { created: 5, resolved: 8 }, { created: 2, resolved: 9 }],
    previous: [{ created: 3, resolved: 2 }, { created: 4, resolved: 3 }, { created: 5, resolved: 5 }, { created: 7, resolved: 6 }, { created: 6, resolved: 7 }, { created: 3, resolved: 6 }],
    lastWeek: [{ created: 2, resolved: 2 }, { created: 5, resolved: 3 }, { created: 7, resolved: 6 }, { created: 8, resolved: 8 }, { created: 4, resolved: 7 }, { created: 1, resolved: 5 }],
  },
  "7d": {
    axis: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    current:  [{ created: 38, resolved: 30 }, { created: 42, resolved: 36 }, { created: 35, resolved: 38 }, { created: 48, resolved: 41 }, { created: 51, resolved: 47 }, { created: 22, resolved: 28 }, { created: 18, resolved: 24 }],
    previous: [{ created: 30, resolved: 28 }, { created: 36, resolved: 33 }, { created: 32, resolved: 30 }, { created: 41, resolved: 38 }, { created: 44, resolved: 40 }, { created: 24, resolved: 22 }, { created: 19, resolved: 19 }],
    lastWeek: [{ created: 33, resolved: 31 }, { created: 39, resolved: 35 }, { created: 37, resolved: 36 }, { created: 44, resolved: 39 }, { created: 47, resolved: 42 }, { created: 21, resolved: 25 }, { created: 17, resolved: 21 }],
  },
  "30d": {
    axis: ["W1", "W2", "W3", "W4"],
    current:  [{ created: 188, resolved: 171 }, { created: 204, resolved: 198 }, { created: 222, resolved: 213 }, { created: 210, resolved: 209 }],
    previous: [{ created: 172, resolved: 160 }, { created: 184, resolved: 175 }, { created: 198, resolved: 188 }, { created: 192, resolved: 188 }],
    lastWeek: [{ created: 180, resolved: 168 }, { created: 192, resolved: 184 }, { created: 210, resolved: 200 }, { created: 198, resolved: 196 }],
  },
};

/** Product breakdown per range — feeds the "Breakdown by product" panel. */
export const MANAGER_DASHBOARD_PRODUCTS = {
  today: [
    { name: "Network",           count: 9,  pct: 33, deltaPct: 4  },
    { name: "Destrova Identity", count: 7,  pct: 26, deltaPct: -2 },
    { name: "Endpoint",          count: 5,  pct: 19, deltaPct: 1  },
    { name: "Microsoft 365",     count: 3,  pct: 11, deltaPct: 0  },
    { name: "Print",             count: 2,  pct: 7,  deltaPct: -1 },
    { name: "Other",             count: 1,  pct: 4,  deltaPct: 0  },
  ],
  "7d": [
    { name: "Network",           count: 64, pct: 33, deltaPct: 6  },
    { name: "Destrova Identity", count: 47, pct: 24, deltaPct: 3  },
    { name: "Endpoint",          count: 35, pct: 18, deltaPct: -2 },
    { name: "Microsoft 365",     count: 24, pct: 13, deltaPct: 9  },
    { name: "Print",             count: 13, pct: 7,  deltaPct: -11},
    { name: "Other",             count: 9,  pct: 5,  deltaPct: 0  },
  ],
  "30d": [
    { name: "Network",           count: 272, pct: 33, deltaPct: 8  },
    { name: "Destrova Identity", count: 198, pct: 24, deltaPct: 5  },
    { name: "Endpoint",          count: 152, pct: 18, deltaPct: -1 },
    { name: "Microsoft 365",     count: 99,  pct: 12, deltaPct: 12 },
    { name: "Print",             count: 58,  pct: 7,  deltaPct: -8 },
    { name: "Other",             count: 45,  pct: 6,  deltaPct: 1  },
  ],
};

/** SLA insights — one short, action-driving sentence per range. */
export const MANAGER_DASHBOARD_SLA_INSIGHT = {
  today: "3 tickets require action in the next 2 hours.",
  "7d":  "12 tickets at risk this week — 3 require action in the next 2 hours.",
  "30d": "92 tickets at risk this period — review SLA pressure on Endpoint and Print.",
};

/** Compressed activity feed for the dashboard. */
export const MANAGER_RECENT_ACTIVITY = [
  { id: "a1", kind: "create",   actor: "Customer · Northwind",   text: "DES-1842 opened — VPN client disconnects after sleep/wake", meta: "12 min ago" },
  { id: "a2", kind: "assign",   actor: "A. Mercer",              text: "Took ownership of DES-1842",                                meta: "10 min ago" },
  { id: "a3", kind: "breached", actor: "System",                 text: "DES-1831 breached SLA — Print queue stalled",               meta: "45 min ago" },
  { id: "a4", kind: "resolve",  actor: "S. Park",                text: "Resolved DES-1828 — Quarterly access review export",        meta: "1 hr ago" },
  { id: "a5", kind: "comment",  actor: "J. Okonkwo",             text: "Replied on DES-1839 — Enable SAML SSO",                     meta: "1 hr ago" },
  { id: "a6", kind: "reassign", actor: "Manager",                text: "Reassigned DES-1819 to A. Mercer",                          meta: "2 hr ago" },
];
