/**
 * Reusable Tailwind / design tokens for enterprise shell (Linear / Stripe–adjacent).
 * Prefer importing these in Sidebar + Topbar for consistency.
 */

export const enterpriseSidebar = {
  collapsedWidth: 72,
  expandedWidth: 260,
  navItemHeightClass: "h-11", // 44px
  navItemRadius: "rounded-xl", // 12px
  transition: "transition-[width] duration-200 ease-out",
  itemTransition: "transition-[color,background-color,box-shadow,transform] duration-150 ease-out",
};

export const enterpriseTopbar = {
  heightClass: "h-16",
  transition: "transition-[background-color,box-shadow] duration-200 ease-out",
};

/** Agent topbar + sidebar shared frosted surface (keep in sync). */
export const agentChromeSurface =
  "bg-[rgba(255,255,255,0.72)] backdrop-blur-[12px] supports-[backdrop-filter]:bg-[rgba(255,255,255,0.62)]";
