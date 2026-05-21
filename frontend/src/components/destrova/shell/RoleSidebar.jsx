import { IconQueue } from "../shared/DestrovaIcons";
import { getRoleDefaultLanding, getRoleShellConfig, SHELL_ROLES } from "./roleConfig";
import { SHELL_ICON_MAP } from "./shellIconMap";

export default function RoleSidebar({ role, activeId, onSelect }) {
  const config       = getRoleShellConfig(role);
  const fallbackId   = getRoleDefaultLanding(role);
  const currentId    = activeId || fallbackId;
  const isCustomerRole = role === SHELL_ROLES.CUSTOMER;
  const sidebarWidth = "w-[76px]";

  return (
    <aside
      className={[
        "relative flex shrink-0 flex-col items-stretch pb-3 pt-3 transition-[width] duration-200 ease-out",
        sidebarWidth,
        isCustomerRole
          ? "border-r border-indigo-900/50 bg-[#1E1B4B]"
          : "border-r border-destrova-border bg-destrova-sidebar dark:border-destrova-borderDark",
      ].join(" ")}
    >
      {!isCustomerRole ? (
        <div className="flex flex-col items-center">
          <div className="flex h-16 w-full items-center justify-center px-2">
            <a
              href="/"
              title="Destrova"
              aria-label="Destrova"
              className="group relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-destrova-brand text-[15px] font-bold leading-none tracking-tight text-white shadow-destrova-ring ring-1 ring-white/20 transition-transform duration-200 hover:-translate-y-px"
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-[#7d7db0] to-[#4f4f84] text-[20px] font-bold leading-none text-white shadow-[0_6px_14px_-8px_rgba(0,0,0,0.5)] ring-1 ring-white/20">
                D
              </span>
              <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
              <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[14px] ring-1 ring-inset ring-white/10" />
            </a>
          </div>
          <span aria-hidden className="my-3 h-px w-8 rounded-full bg-gradient-to-r from-transparent via-slate-300/70 to-transparent" />
        </div>
      ) : null}

      {/* ── Customer + Manager/Admin navigation ───────────────────────────── */}
      <nav className={`flex flex-1 flex-col gap-1 px-2 ${isCustomerRole ? "pt-2" : "items-center"}`}>
          {config.sidebar.map((item) => {
            const active  = item.id === currentId;
            const IconCmp = SHELL_ICON_MAP[item.icon] || IconQueue;

            return (
              <button
                key={item.id}
                type="button"
                title={item.label}
                onClick={() => onSelect?.(item.id)}
                className={[
                  "group relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150",
                  isCustomerRole
                    ? active
                      ? "bg-white/[0.13] text-white ring-1 ring-inset ring-white/10"
                      : "text-indigo-200/70 hover:bg-white/[0.08] hover:text-white"
                    : active
                      ? "bg-white text-destrova-primary shadow-[0_1px_0_rgba(15,23,42,0.04),0_4px_12px_-6px_rgba(80,80,129,0.32)] ring-1 ring-inset ring-indigo-200/60"
                      : "text-slate-500 hover:bg-white/70 hover:text-destrova-inkStrong hover:ring-1 hover:ring-inset hover:ring-slate-200/80",
                ].join(" ")}
              >
                {active ? (
                  <span
                    aria-hidden
                    className={[
                      "absolute top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full",
                      isCustomerRole ? "-left-3 bg-indigo-400" : "-left-3 bg-destrova-primary",
                    ].join(" ")}
                  />
                ) : null}
                <IconCmp className="h-[18px] w-[18px]" />
              </button>
            );
          })}
      </nav>

      <div className="mt-2 flex justify-center">
        <span
          aria-hidden
          className={[
            "inline-block h-1.5 w-1.5 animate-pulse-soft rounded-full ring-2",
            isCustomerRole ? "bg-emerald-400 ring-[#0F0E47]" : "bg-emerald-500/80 ring-emerald-100",
          ].join(" ")}
          title="All systems operational"
        />
      </div>
    </aside>
  );
}
