/**
 * Reusable Tailwind / design tokens for enterprise shell (Linear / Stripe–adjacent).
 * Prefer importing these in Sidebar + Topbar for consistency.
 */

/** Sidebar — flat white panel (reference: icon + label, blue active pill). */
export const enterpriseSidebarSurface = "bg-white border-r border-gray-200/80";

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
};

export const enterpriseTopbar = {
  heightClass: "h-16",
  transition: "transition-[background-color,box-shadow] duration-200 ease-out",
};

/** Agent topbar + sidebar shared frosted surface (keep in sync). */
export const agentChromeSurface =
  "bg-[rgba(255,255,255,0.72)] backdrop-blur-[12px] supports-[backdrop-filter]:bg-[rgba(255,255,255,0.62)]";

/** Shared global search field chrome (agent, manager, admin topbars). */
export const enterpriseSearchField =
  "group flex h-10 w-full items-center gap-2 rounded-xl border border-transparent bg-[#F1F5F9] px-3 transition-[background-color,border-color,box-shadow] duration-200 ease-out focus-within:border-transparent focus-within:bg-white focus-within:shadow-[0_0_0_2px_#2563EB,0_4px_14px_-4px_rgba(37,99,235,0.2)]";

/** SaaS workspace canvas — flat #F8FAFC, no purple radial glow. */
export const saasWorkspaceCanvas = "bg-destrova-saas-canvas";
