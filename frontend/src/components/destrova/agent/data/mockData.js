/** Isolated mock data for Destrova workspace preview only. */

export const TICKET_STATUSES = [
  "New",
  "In Progress",
  "Waiting for Customer",
  "Resolved",
  "Closed",
];

export const PRIORITIES = ["High", "Medium", "Low"];

export const SLA_STATES = ["Safe", "At Risk", "Breached", "Paused"];

export const MOCK_TICKETS = [
  {
    id: "DES-1842",
    title: "VPN client disconnects after sleep/wake on macOS Sonoma",
    customer: "Northwind Trading",
    requester: "Elena Volkov",
    requesterEmail: "elena.volkov@northwind.trading",
    category: "Network Access",
    productName: "Destrova Network Access",
    status: "In Progress",
    priority: "High",
    assignee: "A. Mercer",
    unread: 2,
    updatedAt: "12 min ago",
    updatedRank: 100,
    slaState: "At Risk",
    slaDue: "Due in 1h 20m",
    slaDueAt: "2026-04-24T20:00:00.000Z",
    createdAt: "2026-04-19T14:00:00.000Z",
  },
  {
    id: "DES-1839",
    title: "Enable SAML SSO for subsidiary tenant",
    customer: "Acme Corporation",
    requester: "Jordan Lee",
    requesterEmail: "jordan.lee@acme.example",
    category: "Identity",
    productName: "Destrova Identity",
    status: "Waiting for Customer",
    priority: "Medium",
    assignee: "You",
    unread: 0,
    updatedAt: "1 hr ago",
    updatedRank: 90,
    slaState: "Safe",
    slaDue: "Due in 18h",
    slaDueAt: "2026-04-25T10:00:00.000Z",
    createdAt: "2026-04-18T09:30:00.000Z",
  },
  {
    id: "DES-1836",
    title: "Exchange Online migration — batch 4 validation",
    customer: "Contoso Ltd",
    requester: "Samira Haddad",
    requesterEmail: "samira.h@contoso.example",
    category: "Microsoft 365",
    productName: "Destrova Microsoft 365",
    status: "New",
    priority: "Medium",
    assignee: null,
    unread: 1,
    updatedAt: "2 hr ago",
    updatedRank: 80,
    slaState: "Safe",
    slaDue: "Due in 40h",
    slaDueAt: "2026-04-26T18:00:00.000Z",
    createdAt: "2026-04-22T11:00:00.000Z",
  },
  {
    id: "DES-1831",
    title: "Print queue stalled on branch print server",
    customer: "Fabrikam Industries",
    requester: "Chris Nguyen",
    requesterEmail: "c.nguyen@fabrikam.example",
    category: "Print",
    productName: "Destrova Print Services",
    status: "In Progress",
    priority: "Low",
    assignee: "J. Okonkwo",
    unread: 0,
    updatedAt: "3 hr ago",
    updatedRank: 70,
    slaState: "Breached",
    slaDue: "Breached 45m ago",
    slaDueAt: "2026-04-23T16:00:00.000Z",
    createdAt: "2026-04-10T08:15:00.000Z",
  },
  {
    id: "DES-1828",
    title: "Quarterly access review export for ITGC",
    customer: "Litware Inc",
    requester: "Priya Shah",
    requesterEmail: "priya.shah@litware.example",
    category: "GRC",
    productName: "Destrova GRC",
    status: "Resolved",
    priority: "Medium",
    assignee: "You",
    unread: 0,
    updatedAt: "Yesterday",
    updatedRank: 60,
    slaState: "Paused",
    slaDue: "Paused — awaiting requester",
    slaDueAt: null,
    createdAt: "2026-03-28T12:00:00.000Z",
  },
  {
    id: "DES-1824",
    title: "Hardware refresh — asset record mismatch",
    customer: "Adventure Works",
    requester: "Morgan Ellis",
    requesterEmail: "morgan.ellis@adventure.example",
    category: "Endpoint",
    productName: "Destrova Endpoint",
    status: "Closed",
    priority: "Low",
    assignee: "S. Park",
    unread: 0,
    updatedAt: "Apr 18",
    updatedRank: 50,
    slaState: "Safe",
    slaDue: "Met",
    slaDueAt: "2026-04-15T12:00:00.000Z",
    createdAt: "2026-04-01T10:00:00.000Z",
  },
];

/** Base fields merged with list row (`customer` = organization). */
export const MOCK_TICKET_DETAIL = {
  id: "DES-1842",
  title: "VPN client disconnects after sleep/wake on macOS Sonoma",
  organization: "Northwind Trading",
  requesterName: "Elena Volkov",
  requesterEmail: "elena.volkov@northwind.trading",
  productName: "Destrova Network Access",
  status: "In Progress",
  priority: "High",
  openedAt: "Apr 20, 2026 · 09:14",
  updatedAt: "Apr 21, 2026 · 14:02",
};

export const MOCK_TIMELINE = [
  {
    type: "sla_warning",
    at: "Today · 13:58",
    title: "First response SLA at risk",
    body: "Target will breach in 1h 20m without an agent reply on the external thread.",
    meta: "SLA",
  },
  {
    type: "customer_reply",
    at: "Today · 13:12",
    title: "Elena Volkov",
    body: "It reproduces after sleep and wake. Console output from the VPN client is attached.",
    meta: "Customer reply",
  },
  {
    type: "agent_reply",
    at: "Today · 12:48",
    title: "Alex Mercer",
    body: "Thanks for the logs — we are validating NAC posture and split-tunnel behavior on 14.4.1 with corporate profile v3.2.",
    meta: "Agent reply",
  },
  {
    type: "internal_note",
    at: "Today · 11:40",
    title: "Alex Mercer",
    body: "Suspect captive portal redirect + DNS when returning from sleep. Not customer-visible.",
    meta: "Internal note",
  },
  {
    type: "worklog",
    at: "Today · 11:05",
    title: "Alex Mercer",
    body: "Investigation — reproduced on macOS 14.4.1 with corporate VPN profile v3.2.",
    meta: "Worklog · 25m",
  },
  {
    type: "assignment",
    at: "Today · 09:02",
    title: "Assignment updated",
    body: "Assigned from Network queue to Alex Mercer.",
    meta: "Assignment",
  },
  {
    type: "status_change",
    at: "Yesterday · 16:30",
    title: "Status changed",
    body: "New → In Progress",
    meta: "Status",
  },
  {
    type: "attachment",
    at: "Yesterday · 16:28",
    title: "Attachment added",
    body: "vpn-client-logs.zip · 1.2 MB",
    meta: "Requester upload",
  },
  {
    type: "transfer",
    at: "Yesterday · 10:15",
    title: "Ticket transferred",
    body: "From Endpoint Services to Network Operations (escalation).",
    meta: "Transfer",
  },
  {
    type: "closure",
    at: "Apr 18 · 17:00",
    title: "Ticket closed",
    body: "Closed after resolution verified with requester; VPN profile v3.2.2 rolled out to pilot group.",
    meta: "Closure",
  },
];

export const MOCK_PEOPLE = [
  { role: "Assignee", name: "Alex Mercer", email: "alex.mercer@destrova.example" },
  { role: "Requester", name: "Elena Volkov", email: "elena.volkov@northwind.trading" },
];

export const MOCK_ATTACHMENTS = [
  { name: "vpn-client-logs.zip", size: "1.2 MB", who: "Requester", when: "Yesterday" },
  { name: "packet-capture-filter.txt", size: "4 KB", who: "Alex Mercer", when: "Today" },
];

const FALLBACK_TIMELINE = [
  {
    type: "status_change",
    at: "Recent",
    title: "Status changed",
    body: "New → In Progress",
    meta: "Status",
  },
  {
    type: "internal_note",
    at: "Earlier",
    title: "Alex Mercer",
    body: "Initial triage notes are recorded on this ticket.",
    meta: "Internal note",
  },
];

const FALLBACK_ATTACHMENTS = [{ name: "screenshot.png", size: "86 KB", who: "Requester", when: "This week" }];

const FALLBACK_PEOPLE = [
  { role: "Assignee", name: "Alex Mercer", email: "alex.mercer@destrova.example" },
  { role: "Requester", name: "Requester", email: "requester@organization.example" },
];

/** Rich mock only for DES-1842; other rows still render a coherent preview. */
export function getWorkspaceExtras(ticketId) {
  if (ticketId === "DES-1842") {
    return {
      timeline: MOCK_TIMELINE,
      attachments: MOCK_ATTACHMENTS,
      people: MOCK_PEOPLE,
    };
  }
  return {
    timeline: FALLBACK_TIMELINE,
    attachments: FALLBACK_ATTACHMENTS,
    people: FALLBACK_PEOPLE,
  };
}
