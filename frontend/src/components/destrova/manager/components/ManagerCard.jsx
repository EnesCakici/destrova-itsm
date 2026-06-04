import { useState } from "react";
import {
  MANAGER_ACCENT_LINES,
  MANAGER_COLORS,
  MANAGER_SHADOWS,
  MANAGER_STATUS_TONES,
  MANAGER_TONES,
} from "../managerTokens";

/**
 * Layered card surface for manager views.
 *
 * Tones drive the depth-and-hierarchy system:
 *   - default : calm white (slight off-white gradient)
 *   - primary : blue-tint KPI / focus surfaces
 *   - accent  : important sections (critical lists)
 *   - neutral : soft gray (charts, neutral panels)
 *   - muted   : backdrop trays (filter strips)
 *   - safe / atRisk / breached / paused : status-toned (use sparingly)
 *
 * Always pairs with a 1px decorative top accent line — never a thick border.
 */
export default function ManagerCard({
  children,
  className = "",
  padding = "p-6",
  elevated = false,
  tone = "default",
  topAccent = true,
  interactive = false,
  as: As = "section",
  style,
  ...rest
}) {
  const [hovered, setHovered] = useState(false);

  const isStatusTone = Boolean(MANAGER_STATUS_TONES[tone]);
  const toneCfg = MANAGER_TONES[tone] || MANAGER_TONES.default;

  // background
  const background = isStatusTone
    ? MANAGER_STATUS_TONES[tone]
    : interactive && hovered
      ? toneCfg.hover
      : toneCfg.background;

  // shadow scaling — interactive cards lift on hover
  const baseShadow = elevated ? MANAGER_SHADOWS.elevated : MANAGER_SHADOWS.surface;
  const shadow = interactive && hovered ? MANAGER_SHADOWS.hover : baseShadow;

  // soft inner edge — replaces traditional borders
  const edge = isStatusTone ? MANAGER_COLORS.hairline : toneCfg.edge;

  // accent line — pick a hue tied to the tone
  const accentKind = isStatusTone
    ? tone
    : tone === "primary"
      ? "primary"
      : tone === "accent"
        ? "accent"
        : "default";
  const accentLine = MANAGER_ACCENT_LINES[accentKind] || MANAGER_ACCENT_LINES.default;

  return (
    <As
      className={`group relative overflow-hidden rounded-saas-card ${padding} ${
        interactive ? "cursor-pointer" : ""
      } ${className}`}
      style={{
        backgroundImage: background,
        backgroundColor: MANAGER_COLORS.surface,
        boxShadow: `${shadow}, 0 0 0 1px ${edge} inset`,
        transition:
          "transform 220ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 220ms cubic-bezier(0.4, 0, 0.2, 1), background-image 220ms ease",
        transform: interactive && hovered ? "translateY(-1px)" : "translateY(0)",
        ...style,
      }}
      onMouseEnter={interactive ? () => setHovered(true) : undefined}
      onMouseLeave={interactive ? () => setHovered(false) : undefined}
      {...rest}
    >
      {topAccent ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ backgroundImage: accentLine }}
        />
      ) : null}
      {children}
    </As>
  );
}

export function ManagerCardHeader({ title, hint, action }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2
          className="text-base font-semibold tracking-tight"
          style={{ color: MANAGER_COLORS.dark }}
        >
          {title}
        </h2>
        {hint ? (
          <p
            className="mt-1 text-xs"
            style={{ color: MANAGER_COLORS.muted }}
          >
            {hint}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
