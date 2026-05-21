/**
 * Mock data for the Destrova Admin panel.
 *
 * Everything here is preview/UI-only. Wire each export to the backend when
 * integrating; the shape below is the contract the views consume.
 */

/* ──────────────── Users & Roles ──────────────── */
export const ADMIN_ROLES = ["Agent", "Manager", "Admin", "Customer"];
export const ADMIN_DEPARTMENTS = ["Network", "Identity", "Endpoint", "Print", "Microsoft 365", "Operations", "—"];
export const ADMIN_USER_STATUSES = ["Active", "Disabled"];

export const ADMIN_USERS = [
  { id: "u-001", name: "Alex Mercer",        email: "alex.mercer@destrova.io",    role: "Agent",    status: "Active",    department: "Network",       maxOpen: 18 },
  { id: "u-002", name: "Jordan Okonkwo",     email: "jordan.okonkwo@destrova.io", role: "Agent",    status: "Active",    department: "Print",         maxOpen: 16 },
  { id: "u-003", name: "Riya Shah",          email: "riya.shah@destrova.io",      role: "Agent",    status: "Active",    department: "Identity",      maxOpen: 14 },
  { id: "u-004", name: "Theo Brandt",        email: "theo.brandt@destrova.io",    role: "Agent",    status: "Active",    department: "Endpoint",      maxOpen: 16 },
  { id: "u-005", name: "Maya Lindgren",      email: "maya.lindgren@destrova.io",  role: "Agent",    status: "Active",    department: "Microsoft 365", maxOpen: 12 },
  { id: "u-006", name: "Chen Wu",            email: "chen.wu@destrova.io",        role: "Agent",    status: "Disabled", department: "Network",       maxOpen: 10 },
  { id: "u-007", name: "Sara Khalil",        email: "sara.khalil@destrova.io",    role: "Manager",  status: "Active",    department: "Operations",    maxOpen: 0  },
  { id: "u-008", name: "Devon Park",         email: "devon.park@destrova.io",     role: "Manager",  status: "Active",    department: "Operations",    maxOpen: 0  },
  { id: "u-009", name: "Isobel Vance",       email: "isobel.vance@destrova.io",   role: "Admin",    status: "Active",    department: "—",             maxOpen: 0  },
  { id: "u-010", name: "Elena Volkov",       email: "elena@northwind.example",    role: "Customer", status: "Active",    department: "—",             maxOpen: 0  },
  { id: "u-011", name: "Kalei Park",         email: "kalei@halcyon.example",      role: "Customer", status: "Disabled", department: "—",             maxOpen: 0  },
];

/**
 * Single source of truth for role-aware fields in the Add/Edit User forms
 * AND for what the Users & Roles table renders in the "Max open" column.
 *
 * Edit this object to change form behavior across:
 *   • AdminModalsHost.jsx → UserModal
 *   • AdminUsersRolesView.jsx → UserDrawer
 *   • AdminUsersRolesView.jsx → "Max open" table column
 */
export const ADMIN_USER_ROLE_RULES = {
  Agent: {
    showDepartment: true,
    showMaxOpen:    true,
    helper:         "",
  },
  Manager: {
    showDepartment: true,
    showMaxOpen:    false,
    helper:         "Managers oversee workload but do not use agent capacity by default.",
  },
  Admin: {
    showDepartment: false,
    showMaxOpen:    false,
    helper:         "Admins configure the system and do not receive ticket workload.",
  },
  Customer: {
    showDepartment: false,
    showMaxOpen:    false,
    helper:         "Customers do not belong to agent departments or ticket capacity policies.",
  },
};

export function adminUserRoleRules(role) {
  return ADMIN_USER_ROLE_RULES[role] || ADMIN_USER_ROLE_RULES.Agent;
}

/* ──────────────── Products / Catalog ──────────────── */
/** Örnek / yedek liste: Admin ürün API’si yanıt vermezse AdminProductsCatalogView bu veriyi gösterir. */
export const ADMIN_PRODUCT_STATUSES = ["Active", "Passive"];

/** Product entity ile uyumlu sabit kategoriler. */
export const ADMIN_PRODUCT_CATEGORIES = [
  "Identity",
  "Security",
  "Productivity & Communication",
  "Other",
];
export const ADMIN_VERSION_STATUSES = ["Active", "Deprecated"];

export const ADMIN_PRODUCTS = [
  {
    id: "p-network",
    name: "Destrova Network",
    description: "Corporate networking, VPN, NAC and posture services.",
    status: "Active",
    createdAt: "2024-04-12",
    versions: [
      { id: "v-net-32",  name: "v3.2", status: "Active",     released: "2026-02-04" },
      { id: "v-net-31",  name: "v3.1", status: "Active",     released: "2025-09-18" },
      { id: "v-net-30",  name: "v3.0", status: "Deprecated", released: "2025-04-22" },
    ],
  },
  {
    id: "p-identity",
    name: "Destrova Identity",
    description: "SSO, MFA, conditional access and lifecycle automation.",
    status: "Active",
    createdAt: "2023-11-30",
    versions: [
      { id: "v-id-22",   name: "v2.2", status: "Active",     released: "2026-01-15" },
      { id: "v-id-21",   name: "v2.1", status: "Deprecated", released: "2025-07-10" },
    ],
  },
  {
    id: "p-endpoint",
    name: "Destrova Endpoint",
    description: "Workstation management, posture and remote diagnostics.",
    status: "Active",
    createdAt: "2024-06-04",
    versions: [
      { id: "v-end-14",  name: "v1.4", status: "Active",     released: "2026-03-21" },
      { id: "v-end-13",  name: "v1.3", status: "Active",     released: "2025-12-02" },
    ],
  },
  {
    id: "p-print",
    name: "Destrova Print",
    description: "Print queue, follow-me printing and spooler diagnostics.",
    status: "Passive",
    createdAt: "2022-03-18",
    versions: [
      { id: "v-print-09", name: "v0.9", status: "Deprecated", released: "2024-08-09" },
    ],
  },
];

/* ──────────────── Overview (derived snapshot) ──────────────── */
/** Placeholder until health API exists. */
export function deriveOverallHealth() {
  return "healthy";
}

export const ADMIN_OVERVIEW_WARNINGS = [
  { id: "w-1", level: "info",  text: "Review user roles and product catalog regularly to match operational needs." },
  { id: "w-2", level: "info",  text: "Wire the overview to live APIs when backend endpoints are ready." },
];

/** Placeholder list — replace with API-driven audit/activity when available. */
export const ADMIN_OVERVIEW_RECENT_ACTIVITY = [];

export function adminOverviewSnapshot() {
  return {
    totalUsers:     ADMIN_USERS.length,
    activeAgents:   ADMIN_USERS.filter((u) => u.role === "Agent" && u.status === "Active").length,
    activeProducts: ADMIN_PRODUCTS.filter((p) => p.status === "Active").length,
    health:         deriveOverallHealth(),
  };
}
