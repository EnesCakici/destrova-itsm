import { MANAGER_CANVAS_GLOW, MANAGER_COLORS } from "../managerTokens";

/**
 * Page chrome for manager views: layered canvas (tinted, never flat),
 * centered max-width column, page title block, and slot for actions.
 *
 * Use spacing (not borders) to separate sections inside `children`.
 */
export default function ManagerSurface({ eyebrow, title, description, actions, children, max = "max-w-7xl" }) {
  return (
    <div
      className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto"
      style={{
        backgroundColor: MANAGER_COLORS.canvas,
        backgroundImage: MANAGER_CANVAS_GLOW,
      }}
    >
      {/* Top hairline — anchors the canvas without being a border. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(39,39,87,0) 0%, rgba(39,39,87,0.18) 50%, rgba(39,39,87,0) 100%)",
        }}
      />

      <div className={`relative mx-auto w-full ${max} px-5 py-8 md:px-8 md:py-10`}>
        {(eyebrow || title || description || actions) && (
          <header className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              {eyebrow ? (
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-block h-[3px] w-7 rounded-full"
                    style={{
                      backgroundImage:
                        "linear-gradient(90deg, rgba(39,39,87,0.5) 0%, rgba(39,39,87,0.18) 100%)",
                    }}
                  />
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                    style={{ color: MANAGER_COLORS.muted }}
                  >
                    {eyebrow}
                  </p>
                </div>
              ) : null}
              {title ? (
                <h1
                  className="mt-2.5 text-2xl font-semibold tracking-tight md:text-[1.75rem]"
                  style={{ color: MANAGER_COLORS.dark }}
                >
                  {title}
                </h1>
              ) : null}
              {description ? (
                <p
                  className="mt-2 max-w-2xl text-sm leading-relaxed md:text-[15px]"
                  style={{ color: MANAGER_COLORS.support }}
                >
                  {description}
                </p>
              ) : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </header>
        )}
        <div className="space-y-8">{children}</div>
      </div>
    </div>
  );
}
