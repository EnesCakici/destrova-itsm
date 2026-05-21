import { useMemo, useState } from "react";
import { getRoleDefaultLanding, getRoleShellConfig, SHELL_ROLES } from "./roleConfig";
import { SHELL_ICON_MAP } from "./shellIconMap";
import { agentChromeSurface, enterpriseSidebar } from "./enterpriseShellTheme";
import { IconQueue } from "../shared/DestrovaIcons";

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
 * Agent sidebar: same frosted surface as topbar; nav tuned for light chrome (readable slate text).
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
        "relative flex shrink-0 flex-col border-r border-slate-200/80 shadow-[inset_-1px_0_0_rgba(255,255,255,0.6)]",
        agentChromeSurface,
        enterpriseSidebar.transition,
      ].join(" ")}
    >
      <nav className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-2 pb-2 pt-3">
        {groups.map((group, gi) => (
          <div key={group.key} className="flex flex-col">
            {expanded ? (
              <p
                className={[
                  "mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500",
                  gi === 0 ? "mt-0" : "mt-5",
                ].join(" ")}
              >
                {group.label}
              </p>
            ) : (
              <div className={gi === 0 ? "h-1 shrink-0" : "h-3 shrink-0"} aria-hidden />
            )}
            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const active = item.id === currentId;
                const IconCmp = SHELL_ICON_MAP[item.icon] || IconQueue;
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
                      "group flex shrink-0 items-center border-0 text-sm font-medium leading-snug outline-none active:scale-[0.98]",
                      expanded ? "w-full justify-start gap-3 px-3 text-left" : "mx-auto w-11 justify-center px-0",
                      active
                        ? "text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)] [background:linear-gradient(135deg,#2563EB,#1D4ED8)]"
                        : "text-slate-700 hover:bg-slate-900/[0.06] hover:text-slate-900",
                    ].join(" ")}
                  >
                    <IconCmp
                      className={["h-5 w-5 shrink-0", active ? "text-white" : "text-slate-600 group-hover:text-slate-900"].join(" ")}
                      aria-hidden
                    />
                    {expanded ? (
                      <>
                        <span className="min-w-0 flex-1 truncate font-medium text-inherit">{item.label}</span>
                        {badge != null ? (
                          <span
                            className={[
                              "ml-auto flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center rounded-full px-2 text-[11px] font-semibold tabular-nums",
                              active ? "bg-white/25 text-white" : "bg-slate-200/90 text-slate-700",
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
          </div>
        ))}
      </nav>

      <div className={`mt-auto shrink-0 px-2 pb-3 pt-2 ${expanded ? "" : "flex justify-center"}`}>
        {expanded ? (
          <div
            className="flex items-center gap-3 rounded-xl bg-slate-900/[0.04] px-3 py-2.5 shadow-none"
            title="All systems operational"
          >
            <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800">Operational</p>
              <p className="truncate text-xs font-medium text-slate-500">All services healthy</p>
            </div>
          </div>
        ) : (
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900/[0.04]"
            title="All systems operational"
          >
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]" />
          </div>
        )}
      </div>
    </aside>
  );
}
