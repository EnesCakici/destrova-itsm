import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getRoleDefaultLanding, getRoleShellConfig, SHELL_ROLES } from "./roleConfig";
import { SHELL_ICON_MAP } from "./shellIconMap";
import { enterpriseSidebar, enterpriseSidebarSurface } from "./enterpriseShellTheme";
import { IconDashboard } from "../shared/DestrovaIcons";

const SECTION_I18N_KEYS = {
  navigation: "nav.sectionNavigation",
  views: "nav.sectionViews",
  tools: "nav.sectionTools",
  default: "nav.sectionNavigation",
};

function groupNavItems(items, t) {
  const groups = [];
  let current = null;
  for (const item of items) {
    const key = item.section || "default";
    if (!current || current.key !== key) {
      const sectionKey = SECTION_I18N_KEYS[key] || SECTION_I18N_KEYS.default;
      current = {
        key,
        label: t(sectionKey),
        items: [],
      };
      groups.push(current);
    }
    current.items.push(item);
  }
  return groups;
}

function resolveNavLabel(item, t) {
  const key = item.navKey || item.id;
  const translated = t(`nav.${key}`, { defaultValue: "" });
  if (translated) return translated;
  return item.label || key;
}

/**
 * Enterprise sidebar — soft blue active row, transparent inactive (all AppShell roles).
 */
export default function Sidebar({
  role = SHELL_ROLES.AGENT,
  activeId,
  onSelect,
  pinnedExpanded = false,
  id = "destrova-agent-sidebar",
}) {
  const { t } = useTranslation("common");
  const config = getRoleShellConfig(role);
  const fallbackId = getRoleDefaultLanding(role);
  const currentId = activeId || fallbackId;
  const [hoverExpand, setHoverExpand] = useState(false);

  const expanded = pinnedExpanded || hoverExpand;
  const widthPx = expanded ? enterpriseSidebar.expandedWidth : enterpriseSidebar.collapsedWidth;
  const groups = useMemo(
    () => groupNavItems(config.sidebar || [], t),
    [config.sidebar, t],
  );

  return (
    <aside
      id={id}
      style={{ width: `${widthPx}px` }}
      onMouseEnter={() => setHoverExpand(true)}
      onMouseLeave={() => setHoverExpand(false)}
      className={[enterpriseSidebarSurface, enterpriseSidebar.transition].join(" ")}
    >
      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto px-3 pb-3 pt-4">
        {groups.map((group, gi) => (
          <div key={group.key} className="flex flex-col gap-1">
            {expanded && groups.length > 1 ? (
              <p
                className={[
                  "px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500",
                  gi === 0 ? "mt-0 mb-0.5" : "mt-4 mb-0.5",
                ].join(" ")}
              >
                {group.label}
              </p>
            ) : null}
            {group.items.map((item) => {
              const active = item.id === currentId;
              const label = resolveNavLabel(item, t);
              const IconCmp = SHELL_ICON_MAP[item.icon] || IconDashboard;
              const badge = item.badge;

              return (
                <button
                  key={item.id}
                  type="button"
                  title={label}
                  onClick={() => onSelect?.(item.id)}
                  className={[
                    enterpriseSidebar.navItemHeightClass,
                    enterpriseSidebar.navItemRadius,
                    enterpriseSidebar.itemTransition,
                    "destrova-sidebar-nav-item group flex shrink-0 items-center border-0 outline-none",
                    active ? "destrova-sidebar-nav-item--active is-active" : "",
                    expanded
                      ? "w-full justify-start gap-3 px-3 py-2.5 text-left text-[15px]"
                      : "mx-auto h-11 w-11 justify-center p-0",
                    active ? enterpriseSidebar.navActiveSoft : enterpriseSidebar.navInactiveSoft,
                  ].join(" ")}
                >
                  {active ? (
                    <span
                      className="absolute bottom-2.5 left-1.5 top-2.5 w-[3px] rounded-full bg-blue-600 shadow-[0_0_0_1px_rgba(37,99,235,0.25)]"
                      aria-hidden
                    />
                  ) : null}
                  <IconCmp
                    className={[
                      enterpriseSidebar.navIconClass,
                      "stroke-[1.65]",
                      active
                        ? enterpriseSidebar.navIconActiveSoft
                        : enterpriseSidebar.navIconInactiveSoft,
                    ].join(" ")}
                    aria-hidden
                  />
                  {expanded ? (
                    <>
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                      {badge != null ? (
                        <span
                          className={[
                            "ml-auto flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                            active
                              ? "bg-[rgba(37,99,235,0.08)] text-blue-700 ring-1 ring-[rgba(37,99,235,0.12)]"
                              : "text-slate-600 group-hover:text-blue-600",
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
    </aside>
  );
}
