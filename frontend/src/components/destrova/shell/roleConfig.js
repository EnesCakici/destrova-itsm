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
      { id: "inbox", navKey: "inbox", label: "Inbox", icon: "inbox", badge: 12, section: "navigation" },
      { id: "worklogSummary", navKey: "worklog", label: "Worklog", icon: "clock", section: "views" },
    ],
    topbar: ["globalSearch", "notifications", "profile"],
  },
  [SHELL_ROLES.MANAGER]: {
    defaultLanding: "dashboard",
    sidebar: [
      { id: "dashboard", navKey: "dashboard", label: "Dashboard", icon: "dashboard" },
      { id: "allTickets", navKey: "allTickets", label: "All Tickets", icon: "ticket" },
      { id: "slaMonitor", navKey: "slaMonitor", label: "SLA Monitor", icon: "shieldCheck" },
      { id: "teamWorkload", navKey: "teamWorkload", label: "Team Workload", icon: "users" },
      { id: "teams", navKey: "teams", label: "Teams", icon: "userGroup" },
      { id: "reports", navKey: "reports", label: "Reports", icon: "report" },
    ],
    topbar: ["notifications", "profile"],
  },
  [SHELL_ROLES.ADMIN]: {
    defaultLanding: "overview",
    sidebar: [
      { id: "overview", navKey: "overview", label: "Overview", icon: "overview" },
      { id: "usersRoles", navKey: "usersRoles", label: "Users & Roles", icon: "users" },
      { id: "productsCatalog", navKey: "products", label: "Products", icon: "cube" },
    ],
    topbar: ["notifications", "profile"],
  },
  [SHELL_ROLES.CUSTOMER]: {
    defaultLanding: "myTickets",
    sidebar: [
      { id: "myTickets", navKey: "myTickets", label: "My Tickets", icon: "ticket", section: "navigation" },
      { id: "newTicket", navKey: "newRequest", label: "New Request", icon: "documentPlus", section: "navigation" },
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
