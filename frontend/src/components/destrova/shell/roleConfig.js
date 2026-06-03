export const SHELL_ROLES = {
  AGENT: "agent",
  MANAGER: "manager",
  ADMIN: "admin",
  CUSTOMER: "customer",
};

export const ROLE_SHELL_CONFIG = {
  [SHELL_ROLES.AGENT]: {
    defaultLanding: "inbox",
    sidebar: [
      { id: "inbox", label: "Inbox", icon: "inbox", badge: 12, section: "navigation" },
      { id: "worklogSummary", label: "Worklog", icon: "clock", section: "views" },
    ],
    topbar: ["globalSearch", "notifications", "profile"],
  },
  [SHELL_ROLES.MANAGER]: {
    defaultLanding: "dashboard",
    sidebar: [
      { id: "dashboard", label: "Dashboard", icon: "chart" },
      { id: "allTickets", label: "All Tickets", icon: "queue" },
      { id: "slaMonitor", label: "SLA Monitor", icon: "bolt" },
      { id: "teamWorkload", label: "Team Workload", icon: "users" },
      { id: "teams", label: "Teams", icon: "workflow" },
      { id: "reports", label: "Reports", icon: "report" },
    ],
    topbar: ["globalSearch", "notifications", "profile"],
  },
  [SHELL_ROLES.ADMIN]: {
    defaultLanding: "overview",
    sidebar: [
      { id: "overview",         label: "Overview",       icon: "chart" },
      { id: "usersRoles",       label: "Users & Roles",  icon: "users" },
      { id: "productsCatalog",  label: "Products",       icon: "catalog" },
    ],
    topbar: ["globalSearch", "notifications", "profile"],
  },
  [SHELL_ROLES.CUSTOMER]: {
    defaultLanding: "myTickets",
    sidebar: [
      { id: "myTickets", label: "My Tickets", icon: "clipboardList", section: "navigation" },
      { id: "newTicket", label: "New Request", icon: "plus", section: "navigation" },
    ],
    topbar: ["newTicket", "notifications", "profile"],
  },
};

export function getRoleShellConfig(role) {
  return ROLE_SHELL_CONFIG[role] ?? ROLE_SHELL_CONFIG[SHELL_ROLES.AGENT];
}

export function getRoleDefaultLanding(role) {
  return getRoleShellConfig(role).defaultLanding;
}

export function getRoleNavItem(role, sectionId) {
  const config = getRoleShellConfig(role);
  return config.sidebar.find((item) => item.id === sectionId) || config.sidebar[0];
}
