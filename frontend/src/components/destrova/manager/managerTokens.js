/**
 * Destrova manager — strict palette.
 * Reused across all manager views; NEVER introduce ad-hoc colors here.
 */
export const MANAGER_COLORS = {
  ink: "#272757",       // primary text + brand
  support: "#505081",   // secondary text + accents
  muted: "#8686AC",     // labels, meta
  dark: "#0F0E47",      // strongest emphasis (numbers, anchors)
  surface: "#FFFFFF",
  canvas: "#EFF0F6",    // soft cool gray-blue page background
  hairline: "rgba(39,39,87,0.08)",
};

/** Reserved status accents — used ONLY on indicators, never on layout. */
export const MANAGER_STATUS = {
  safe: { fg: "#1F7A5C", bg: "rgba(31,122,92,0.10)" },
  atRisk: { fg: "#A56400", bg: "rgba(165,100,0,0.10)" },
  breached: { fg: "#A8243B", bg: "rgba(168,36,59,0.10)" },
  paused: { fg: "#505081", bg: "rgba(80,80,129,0.10)" },
};

/**
 * Surface tones — drive the depth-and-hierarchy system.
 * Each tone returns the *background gradient* a card uses.
 *
 * Rules of use:
 *   default  → soft white card (subtle off-white gradient)
 *   primary  → tinted indigo card (KPIs, active focus surfaces)
 *   accent   → important sections (critical tickets, breach lists)
 *   neutral  → calm gray-blue panels (charts, neutral lists)
 *   muted    → backdrop panels (filter trays, secondary surfaces)
 */
export const MANAGER_TONES = {
  default: {
    background:
      "linear-gradient(180deg, #FFFFFF 0%, #FAFBFE 100%)",
    hover:
      "linear-gradient(180deg, #FFFFFF 0%, #F4F5FB 100%)",
    edge: "rgba(39,39,87,0.05)", // soft inner edge for definition
  },
  primary: {
    background:
      "linear-gradient(180deg, rgba(39,39,87,0.06) 0%, rgba(39,39,87,0.015) 65%, rgba(255,255,255,0.85) 100%)",
    hover:
      "linear-gradient(180deg, rgba(39,39,87,0.085) 0%, rgba(39,39,87,0.02) 65%, rgba(255,255,255,0.9) 100%)",
    edge: "rgba(39,39,87,0.07)",
  },
  accent: {
    background:
      "linear-gradient(180deg, rgba(80,80,129,0.10) 0%, rgba(39,39,87,0.04) 50%, rgba(255,255,255,0.85) 100%)",
    hover:
      "linear-gradient(180deg, rgba(80,80,129,0.13) 0%, rgba(39,39,87,0.06) 50%, rgba(255,255,255,0.9) 100%)",
    edge: "rgba(39,39,87,0.10)",
  },
  neutral: {
    background:
      "linear-gradient(180deg, rgba(134,134,172,0.08) 0%, rgba(134,134,172,0.02) 60%, #FFFFFF 100%)",
    hover:
      "linear-gradient(180deg, rgba(134,134,172,0.11) 0%, rgba(134,134,172,0.03) 60%, #FFFFFF 100%)",
    edge: "rgba(80,80,129,0.06)",
  },
  muted: {
    background:
      "linear-gradient(180deg, rgba(39,39,87,0.04) 0%, rgba(39,39,87,0.015) 100%)",
    hover:
      "linear-gradient(180deg, rgba(39,39,87,0.06) 0%, rgba(39,39,87,0.02) 100%)",
    edge: "rgba(39,39,87,0.06)",
  },
};

/**
 * Status-toned card backgrounds — only for high-signal cards (e.g. SLA breached metric).
 * Stay restrained: never fully saturated, always end into white.
 */
export const MANAGER_STATUS_TONES = {
  safe:
    "linear-gradient(180deg, rgba(31,122,92,0.10) 0%, rgba(31,122,92,0.025) 55%, #FFFFFF 100%)",
  atRisk:
    "linear-gradient(180deg, rgba(165,100,0,0.10) 0%, rgba(165,100,0,0.025) 55%, #FFFFFF 100%)",
  breached:
    "linear-gradient(180deg, rgba(168,36,59,0.10) 0%, rgba(168,36,59,0.025) 55%, #FFFFFF 100%)",
  paused:
    "linear-gradient(180deg, rgba(80,80,129,0.08) 0%, rgba(80,80,129,0.02) 55%, #FFFFFF 100%)",
};

/**
 * Decorative gradient lines applied to the top of cards/sections.
 * Length is `100%`, height is 1–2px. They visually anchor the card
 * without acting like a thick border.
 */
export const MANAGER_ACCENT_LINES = {
  default:
    "linear-gradient(90deg, rgba(39,39,87,0) 0%, rgba(39,39,87,0.22) 50%, rgba(39,39,87,0) 100%)",
  primary:
    "linear-gradient(90deg, rgba(39,39,87,0) 0%, rgba(39,39,87,0.32) 50%, rgba(39,39,87,0) 100%)",
  accent:
    "linear-gradient(90deg, rgba(39,39,87,0) 0%, rgba(15,14,71,0.42) 50%, rgba(39,39,87,0) 100%)",
  safe:
    "linear-gradient(90deg, rgba(31,122,92,0) 0%, rgba(31,122,92,0.45) 50%, rgba(31,122,92,0) 100%)",
  atRisk:
    "linear-gradient(90deg, rgba(165,100,0,0) 0%, rgba(165,100,0,0.45) 50%, rgba(165,100,0,0) 100%)",
  breached:
    "linear-gradient(90deg, rgba(168,36,59,0) 0%, rgba(168,36,59,0.55) 50%, rgba(168,36,59,0) 100%)",
};

/**
 * Canvas decoration: a subtle ambient wash over the page background so the
 * canvas itself is layered (not a flat fill). Stack as a `backgroundImage`
 * on top of `MANAGER_COLORS.canvas`.
 */
export const MANAGER_CANVAS_GLOW =
  "radial-gradient(60rem 36rem at 8% -8%, rgba(39,39,87,0.10), transparent 60%)," +
  " radial-gradient(50rem 28rem at 100% 0%, rgba(80,80,129,0.07), transparent 60%)," +
  " linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 200px)";

/**
 * Shadows.
 *  - surface : default card lift (calm)
 *  - elevated: section cards / charts
 *  - kpi     : tinted KPI lift (slightly stronger so tint reads as elevation)
 *  - hover   : lifted state (cards & rows)
 *  - inset   : subtle inset highlight for tinted surfaces
 */
export const MANAGER_SHADOWS = {
  surface:
    "0 1px 0 rgba(255,255,255,0.6) inset, 0 1px 2px rgba(15,14,71,0.04), 0 12px 40px -28px rgba(15,14,71,0.18)",
  elevated:
    "0 1px 0 rgba(255,255,255,0.7) inset, 0 2px 4px rgba(15,14,71,0.05), 0 24px 60px -32px rgba(15,14,71,0.28)",
  kpi:
    "0 1px 0 rgba(255,255,255,0.7) inset, 0 1px 2px rgba(15,14,71,0.05), 0 18px 50px -32px rgba(15,14,71,0.28)",
  hover:
    "0 1px 0 rgba(255,255,255,0.7) inset, 0 2px 6px rgba(15,14,71,0.06), 0 28px 72px -32px rgba(15,14,71,0.32)",
  inset:
    "0 1px 0 rgba(255,255,255,0.6) inset, 0 0 0 1px rgba(39,39,87,0.04) inset",
};
