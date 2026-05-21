/**
 * Destrova admin — visual tokens.
 *
 * Admin reuses the manager design language (same shell, same surfaces, same
 * accents) but tilts denser and more system-oriented. Layouts use tighter
 * spacing and tables instead of cards, but the colour palette is unchanged.
 */
export {
  MANAGER_COLORS as ADMIN_COLORS,
  MANAGER_STATUS as ADMIN_STATUS,
  MANAGER_TONES as ADMIN_TONES,
  MANAGER_STATUS_TONES as ADMIN_STATUS_TONES,
  MANAGER_ACCENT_LINES as ADMIN_ACCENT_LINES,
  MANAGER_CANVAS_GLOW as ADMIN_CANVAS_GLOW,
  MANAGER_SHADOWS as ADMIN_SHADOWS,
} from "../manager/managerTokens";

/** Health-status accent — used by header indicator + System Health page. */
export const ADMIN_HEALTH_TONE = {
  healthy:  { fg: "#1F7A5C", bg: "rgba(31,122,92,0.10)", dot: "#22C55E", label: "Healthy" },
  degraded: { fg: "#A56400", bg: "rgba(165,100,0,0.10)", dot: "#F59E0B", label: "Degraded" },
  critical: { fg: "#A8243B", bg: "rgba(168,36,59,0.10)", dot: "#EF4444", label: "Critical" },
};

/** Severity tone for warnings / audit / error rows. */
export const ADMIN_LEVEL_TONE = {
  info:  { fg: "#34508C", bg: "rgba(52,80,140,0.10)" },
  warn:  { fg: "#A56400", bg: "rgba(165,100,0,0.10)" },
  error: { fg: "#A8243B", bg: "rgba(168,36,59,0.10)" },
};
