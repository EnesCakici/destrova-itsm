/** Mock data for agent Worklog Summary preview (no API). */

export const WORKLOG_SUMMARY_KPIS = {
  totalLogged: { label: "5h 32m", trend: "+12% from yesterday", trendUp: true },
  ticketsWorked: { label: "12", trend: null },
  avgPerTicket: { label: "27 min", trend: null },
  responseTime: { label: "4.2 min", trend: null },
};

export const WORKLOG_ACTIVITY = [
  {
    id: "1",
    time: "09:14",
    type: "reply",
    ticketId: "DES-1842",
    title: "Replied to ticket DES-1842",
    context: "Northwind Trading · VPN Issue",
    duration: "+12 min",
  },
  {
    id: "2",
    time: "10:32",
    type: "internal",
    ticketId: "DES-1839",
    title: "Added internal note — DES-1839",
    context: "Acme Corp · SAML Setup",
    duration: "+5 min",
  },
  {
    id: "3",
    time: "11:05",
    type: "worklog",
    ticketId: "DES-1836",
    title: "Logged work — DES-1836",
    context: "Contoso Ltd · Migration",
    duration: "+30 min",
  },
  {
    id: "4",
    time: "13:20",
    type: "reply",
    ticketId: "DES-1831",
    title: "Replied to ticket DES-1831",
    context: "Fabrikam Inc · Queue Issue",
    duration: "+8 min",
  },
];

export const WORKLOG_DISTRIBUTION = [
  { key: "reply", label: "Reply", pct: 48, barClass: "bg-blue-600" },
  { key: "internal", label: "Internal", pct: 22, barClass: "bg-violet-500" },
  { key: "worklog", label: "Worklog", pct: 30, barClass: "bg-slate-500" },
];

export const WORKLOG_INSIGHTS = [
  { label: "Peak activity", value: "10:00 – 12:00" },
  { label: "Most worked product", value: "Identity" },
  { label: "Avg focus session", value: "26 min" },
];

export const WORKLOG_PRODUCT_OPTIONS = [
  { value: "all", label: "All products" },
  { value: "identity", label: "Identity" },
  { value: "vpn", label: "VPN & Network" },
  { value: "m365", label: "Microsoft 365" },
];
