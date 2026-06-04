/**
 * Destrova admin — visual tokens.
 *
 * Admin reuses the manager design language (same shell, same surfaces, same
 * accents) but tilts denser and more system-oriented. Layouts use tighter
 * spacing and tables instead of cards; palette follows saasPlatformTokens
 * via managerTokens re-exports.
 *
 * Visual source: saasPlatformTokens — keep export names stable for admin views.
 */
import { SAAS_SEMANTIC, SAAS_STATUS } from "../shared/saasPlatformTokens.js";

export { SAAS_BUTTON } from "../shared/saasPlatformTokens.js";

export {
  MANAGER_COLORS as ADMIN_COLORS,
  MANAGER_STATUS as ADMIN_STATUS,
  MANAGER_TONES as ADMIN_TONES,
  MANAGER_STATUS_TONES as ADMIN_STATUS_TONES,
  MANAGER_ACCENT_LINES as ADMIN_ACCENT_LINES,
  MANAGER_CANVAS_GLOW as ADMIN_CANVAS_GLOW,
  MANAGER_SHADOWS as ADMIN_SHADOWS,
  MANAGER_RADIUS as ADMIN_RADIUS,
  MANAGER_CHROME as ADMIN_CHROME,
} from "../manager/managerTokens";

/** Health-status accent — used by header indicator + System Health page. */
export const ADMIN_HEALTH_TONE = {
  healthy: {
    fg: SAAS_SEMANTIC.success,
    bg: SAAS_STATUS.safe.bg,
    dot: SAAS_SEMANTIC.success,
    label: "Healthy",
  },
  degraded: {
    fg: SAAS_SEMANTIC.warning,
    bg: SAAS_STATUS.atRisk.bg,
    dot: SAAS_SEMANTIC.warning,
    label: "Degraded",
  },
  critical: {
    fg: SAAS_SEMANTIC.danger,
    bg: SAAS_STATUS.breached.bg,
    dot: SAAS_SEMANTIC.danger,
    label: "Critical",
  },
};

/** Severity tone for warnings / audit / error rows. */
export const ADMIN_LEVEL_TONE = {
  info: { fg: SAAS_SEMANTIC.info, bg: "rgba(37,99,235,0.10)" },
  warn: { fg: SAAS_SEMANTIC.warning, bg: SAAS_STATUS.atRisk.bg },
  error: { fg: SAAS_SEMANTIC.danger, bg: SAAS_STATUS.breached.bg },
};
