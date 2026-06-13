/**
 * Reusable Tailwind / design tokens for enterprise shell (Linear / Stripe–adjacent).
 * Prefer importing these in Sidebar + Topbar for consistency.
 */

/** Sidebar — enterprise white rail (all roles). */
export const enterpriseSidebarSurface = "destrova-enterprise-sidebar bg-white border-r border-slate-200/60 shadow-[inset_-1px_0_0_rgba(255,255,255,0.9)]";

/** @deprecated Use enterpriseSidebarSurface — kept for imports. */
export const enterpriseSidebarSurfaceManager = enterpriseSidebarSurface;

export const enterpriseSidebar = {
  collapsedWidth: 72,
  expandedWidth: 260,
  navItemHeightClass: "min-h-[44px]",
  navItemRadius: "rounded-lg",
  transition: "transition-[width] duration-200 ease-out",
  itemTransition: "transition-[color,background-color] duration-150 ease-out",
  navIconClass: "h-5 w-5 shrink-0",
  navInactive:
    "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
  navActive:
    "font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
  /** Manager — crisp inactive (transparent); active = elevated white + blue accent. */
  navInactiveSoft:
    "font-medium text-slate-800 bg-transparent hover:text-blue-700 hover:bg-[rgba(37,99,235,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
  navActiveSoft:
    "relative font-semibold text-blue-700 bg-white shadow-[0_1px_3px_rgba(37,99,235,0.10),0_0_0_1px_rgba(37,99,235,0.16)] hover:shadow-[0_2px_10px_rgba(37,99,235,0.12),0_0_0_1px_rgba(37,99,235,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
  navIconInactiveSoft: "text-slate-700 group-hover:text-blue-600",
  navIconActiveSoft: "text-blue-600",
};

export const enterpriseTopbar = {
  heightClass: "h-16",
  transition: "transition-[background-color,box-shadow] duration-200 ease-out",
};

/** Topbar icon controls — matches sidebar soft nav (hamburger, bell, profile). */
export const enterpriseTopbarControl = {
  base:
    "destrova-topbar-icon-btn group border-0 bg-transparent outline-none transition-[color,background-color,box-shadow,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:ring-offset-2",
  inactive:
    "text-slate-700 hover:text-blue-700 hover:bg-[rgba(37,99,235,0.06)] active:scale-[0.98]",
  active:
    "relative text-blue-700 bg-white shadow-[0_1px_3px_rgba(37,99,235,0.10),0_0_0_1px_rgba(37,99,235,0.16)] hover:shadow-[0_2px_10px_rgba(37,99,235,0.12),0_0_0_1px_rgba(37,99,235,0.22)] active:scale-[0.98]",
  iconInactive: "text-slate-700 group-hover:text-blue-600",
  iconActive: "text-blue-600",
  square: "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
  profile: "inline-flex h-10 items-center gap-2 rounded-xl py-1 pl-1 pr-2 text-sm font-medium",
  avatarInactive:
    "flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-800 transition-colors duration-150 group-hover:bg-[rgba(37,99,235,0.08)] group-hover:text-blue-700",
  avatarActive:
    "flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(37,99,235,0.08)] text-xs font-semibold text-blue-700 ring-1 ring-[rgba(37,99,235,0.12)]",
  logout:
    "destrova-profile-logout-btn group flex w-full items-center gap-2.5 rounded-xl border-0 bg-transparent px-3.5 py-2.5 text-left text-sm font-semibold text-red-600 transition-all duration-150 ease-out hover:bg-[rgba(239,68,68,0.06)] hover:text-red-700 hover:shadow-[0_1px_3px_rgba(239,68,68,0.08),0_0_0_1px_rgba(239,68,68,0.12)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 focus-visible:ring-offset-2",
  logoutIcon: "h-4 w-4 shrink-0 text-red-600 transition-colors duration-150 group-hover:text-red-700",
};

/** @param {{ active?: boolean, variant?: "square" | "profile" }} opts */
export function topbarControlClass({ active = false, variant = "square" } = {}) {
  const size =
    variant === "profile" ? enterpriseTopbarControl.profile : enterpriseTopbarControl.square;
  return [
    enterpriseTopbarControl.base,
    size,
    active ? enterpriseTopbarControl.active : enterpriseTopbarControl.inactive,
  ].join(" ");
}

/** Agent topbar + sidebar shared frosted surface (keep in sync). */
export const agentChromeSurface =
  "bg-[rgba(255,255,255,0.72)] backdrop-blur-[12px] supports-[backdrop-filter]:bg-[rgba(255,255,255,0.62)]";

/** Shared global search field chrome (agent, manager, admin topbars). */
export const enterpriseSearchField =
  "group flex h-10 w-full items-center gap-2 rounded-xl border border-transparent bg-[#F1F5F9] px-3 transition-[background-color,border-color,box-shadow] duration-200 ease-out focus-within:border-transparent focus-within:bg-white focus-within:shadow-[0_0_0_2px_#2563EB,0_4px_14px_-4px_rgba(37,99,235,0.2)]";

/** Manager workspace — clean white shell (no slate-gray canvas). */
export const managerWorkspaceCanvas = "bg-white";

/** SaaS workspace canvas — flat #F8FAFC, no purple radial glow. */
export const saasWorkspaceCanvas = "bg-destrova-saas-canvas";
