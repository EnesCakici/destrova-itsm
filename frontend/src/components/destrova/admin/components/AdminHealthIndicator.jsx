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
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold tracking-tight text-gray-800 shadow-[0_1px_2px_rgba(15,23,42,0.05)] outline-none transition-colors duration-150 hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:ring-offset-2"
    >
      <span
        aria-hidden
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: tone.dot, boxShadow: `0 0 0 3px ${tone.bg}` }}
      />
      <span className="hidden text-gray-800 md:inline">
        System <span style={{ color: tone.fg }}>{tone.label.toLowerCase()}</span>
      </span>
    </button>
  );
}
