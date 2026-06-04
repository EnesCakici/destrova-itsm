import { useMemo, useState } from "react";
import { getRoleDefaultLanding, getRoleShellConfig, SHELL_ROLES } from "./roleConfig";
import { SHELL_ICON_MAP } from "./shellIconMap";
import { enterpriseSidebar, enterpriseSidebarSurface } from "./enterpriseShellTheme";
import { IconDashboard } from "../shared/DestrovaIcons";

const SECTION_LABELS = {
  navigation: "Navigation",
  views: "Views",
  tools: "Tools",
  default: "Navigation",
};

function groupNavItems(items) {
  const groups = [];
  let current = null;
  for (const item of items) {
    const key = item.section || "default";
    if (!current || current.key !== key) {
      current = {
        key,
        label: SECTION_LABELS[key] || String(key).replace(/^\w/, (c) => c.toUpperCase()),
        items: [],
      };
      groups.push(current);
    }
    current.items.push(item);
  }
  return groups;
}

/**
 * Enterprise sidebar — white panel, outline icon + label, solid blue active row.
 * Collapse/expand, routing, and badges unchanged.
 */
export default function Sidebar({
  role = SHELL_ROLES.AGENT,
  activeId,
  onSelect,
  pinnedExpanded = false,
  id = "destrova-agent-sidebar",
}) {
  const config = getRoleShellConfig(role);
  const fallbackId = getRoleDefaultLanding(role);
  const currentId = activeId || fallbackId;
  const [hoverExpand, setHoverExpand] = useState(false);

  const expanded = pinnedExpanded || hoverExpand;
  const widthPx = expanded ? enterpriseSidebar.expandedWidth : enterpriseSidebar.collapsedWidth;
  const groups = useMemo(() => groupNavItems(config.sidebar || []), [config.sidebar]);

  return (
    <aside
      id={id}
      style={{ width: `${widthPx}px` }}
      onMouseEnter={() => setHoverExpand(true)}
      onMouseLeave={() => setHoverExpand(false)}
      className={[
        "relative flex shrink-0 flex-col",
        enterpriseSidebarSurface,
        enterpriseSidebar.transition,
      ].join(" ")}
    >
      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto px-3 pb-3 pt-4">
        {groups.map((group, gi) => (
          <div key={group.key} className="flex flex-col gap-1">
            {expanded && groups.length > 1 ? (
              <p
                className={[
                  "px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400",
                  gi === 0 ? "mt-0 mb-0.5" : "mt-4 mb-0.5",
                ].join(" ")}
              >
                {group.label}
              </p>
            ) : null}
            {group.items.map((item) => {
              const active = item.id === currentId;
                const IconCmp = SHELL_ICON_MAP[item.icon] || IconDashboard;
              const badge = item.badge;

              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  onClick={() => onSelect?.(item.id)}
                  className={[
                    enterpriseSidebar.navItemHeightClass,
                    enterpriseSidebar.navItemRadius,
                    enterpriseSidebar.itemTransition,
                    "group flex shrink-0 items-center border-0 outline-none",
                    expanded
                      ? "w-full justify-start gap-3 px-3 py-2.5 text-left text-[15px]"
                      : "mx-auto h-11 w-11 justify-center p-0",
                    active ? enterpriseSidebar.navActive : enterpriseSidebar.navInactive,
                  ].join(" ")}
                >
                  <IconCmp
                    className={[
                      enterpriseSidebar.navIconClass,
                      "stroke-[1.65]",
                      active ? "text-white" : "text-slate-600 group-hover:text-slate-900",
                    ].join(" ")}
                    aria-hidden
                  />
                  {expanded ? (
                    <>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {badge != null ? (
                        <span
                          className={[
                            "ml-auto flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                            active ? "bg-white/20 text-white" : "text-slate-500",
                          ].join(" ")}
                        >
                          {badge}
                        </span>
                      ) : null}
                    </>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div
        className={[
          "mt-auto shrink-0 border-t border-gray-100 px-3 py-3",
          expanded ? "" : "flex justify-center",
        ].join(" ")}
      >
        {expanded ? (
          <div className="flex items-center gap-2 px-1" title="All systems operational">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
            <span className="text-xs font-medium text-slate-500">All systems operational</span>
          </div>
        ) : (
          <span
            className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"
            title="All systems operational"
            aria-hidden
          />
        )}
      </div>
    </aside>
  );
}
