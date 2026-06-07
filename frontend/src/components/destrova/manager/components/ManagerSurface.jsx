import { SAAS_PORTAL_CANVAS } from "../../shared/saasPlatformTokens";
import { MANAGER_ACCENT_LINES, MANAGER_CANVAS_GLOW, MANAGER_PAGE } from "../managerTokens";

function ManagerPageHeaderStrip({ eyebrow, title, description, actions }) {
  return (
    <header className={`${MANAGER_PAGE.pageHeaderStrip} ${MANAGER_PAGE.pageHeaderStripSpaced}`}>
      <div className={MANAGER_PAGE.pageHeaderStripInner}>
        <div className="min-w-0">
          {eyebrow ? (
            <div className="flex items-center gap-2">
              <span aria-hidden className={MANAGER_PAGE.pageHeaderAccent} />
              <p className={MANAGER_PAGE.pageHeaderEyebrow}>{eyebrow}</p>
            </div>
          ) : null}
          {title ? <h1 className={MANAGER_PAGE.pageHeaderTitle}>{title}</h1> : null}
          {description ? <p className={MANAGER_PAGE.pageHeaderDesc}>{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

function ManagerHeroHeader({ eyebrow, title, description, actions }) {
  return (
    <header className={`${MANAGER_PAGE.heroBanner} mb-8 md:mb-10`}>
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-12 h-48 w-48 rounded-full bg-blue-400/20 blur-2xl"
      />
      <div className={`relative ${MANAGER_PAGE.heroRow}`}>
        <div className="min-w-0">
          {eyebrow ? (
            <div className="flex items-center gap-2.5">
              <span aria-hidden className="inline-block h-[3px] w-9 shrink-0 rounded-full bg-white/80" />
              <p className={MANAGER_PAGE.heroBannerEyebrow}>{eyebrow}</p>
            </div>
          ) : null}
          {title ? <h1 className={MANAGER_PAGE.heroBannerTitle}>{title}</h1> : null}
          {description ? <p className={MANAGER_PAGE.heroBannerDesc}>{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div> : null}
      </div>
    </header>
  );
}

/**
 * Page chrome for manager views: flat SAAS canvas (#F8FAFC), optional subtle glow,
 * centered max-width column, page title block, and slot for actions.
 *
 * `hero` — dashboard only (blue marketing banner).
 * Default — thin slate strip for ops / list / detail list pages.
 */
export default function ManagerSurface({ eyebrow, title, description, actions, children, max = "max-w-7xl", hero = false }) {
  const showHeader = eyebrow || title || description || actions;

  return (
    <div
      className="destrova-manager-surface relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto"
      style={{
        backgroundColor: SAAS_PORTAL_CANVAS.manager,
        backgroundImage: MANAGER_CANVAS_GLOW || undefined,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ backgroundImage: MANAGER_ACCENT_LINES.default }}
      />

      <div className={`relative mx-auto w-full ${max} px-5 py-8 md:px-8 md:py-10`}>
        {showHeader ? (
          hero ? (
            <ManagerHeroHeader
              eyebrow={eyebrow}
              title={title}
              description={description}
              actions={actions}
            />
          ) : (
            <ManagerPageHeaderStrip
              eyebrow={eyebrow}
              title={title}
              description={description}
              actions={actions}
            />
          )
        ) : null}
        <div className="space-y-8">{children}</div>
      </div>
    </div>
  );
}
