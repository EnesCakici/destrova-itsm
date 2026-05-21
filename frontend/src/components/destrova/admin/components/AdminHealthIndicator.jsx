import { useMemo } from "react";
import { ADMIN_HEALTH_TONE } from "../adminTokens";
import { deriveOverallHealth } from "../data/adminMock";
import { useAdminWorkspace } from "./AdminWorkspaceContext";

/**
 * Topbar System Health indicator.
 *
 * Reads the overall health from `deriveOverallHealth()` (mock) and renders a
 * compact pill — clicking it opens Overview (detailed health UI can move here when API exists).
 */
export default function AdminHealthIndicator() {
  const { navigateTo } = useAdminWorkspace();
  const status = useMemo(() => deriveOverallHealth(), []);
  const tone = ADMIN_HEALTH_TONE[status] || ADMIN_HEALTH_TONE.healthy;

  return (
    <button
      type="button"
      title={`System status — ${tone.label}. Open overview.`}
      onClick={() => navigateTo("overview")}
      className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold tracking-tight transition-[background-color] duration-150 hover:bg-[rgba(39,39,87,0.06)]"
      style={{ color: tone.fg }}
    >
      <span
        aria-hidden
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: tone.dot, boxShadow: `0 0 0 3px ${tone.bg}` }}
      />
      <span className="hidden md:inline">System {tone.label.toLowerCase()}</span>
    </button>
  );
}
