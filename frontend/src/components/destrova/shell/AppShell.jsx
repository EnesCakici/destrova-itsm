import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { DestrovaShellProvider } from "./AgentShellContext";
import { getRoleDefaultLanding, SHELL_ROLES } from "./roleConfig";
import { saasWorkspaceCanvas } from "./enterpriseShellTheme";

/*
 * Destrova workspace shell: Topbar + Sidebar + scrollable main (all roles).
 * Enterprise frosted chrome + 72px collapsible sidebar for agent, customer, manager, admin.
 */
function shellSidebarId(role) {
  if (role === SHELL_ROLES.CUSTOMER) return "destrova-customer-sidebar";
  if (role === SHELL_ROLES.MANAGER) return "destrova-manager-sidebar";
  if (role === SHELL_ROLES.ADMIN) return "destrova-admin-sidebar";
  return "destrova-agent-sidebar";
}

export default function AppShell({ role, activeNavId, onNavChange, children, onTopbarAction }) {
  const fallbackActive = getRoleDefaultLanding(role);
  /** Pinned = sidebar stays at expanded width (260px); unpinned = 72px until hover. */
  const [workspaceSidebarPinned, setWorkspaceSidebarPinned] = useState(false);
  const sidebarDomId = shellSidebarId(role);
  const outerCanvasClass =
    role === SHELL_ROLES.AGENT
      ? "bg-destrova-agent-canvas"
      : role === SHELL_ROLES.CUSTOMER
        ? "bg-white"
        : saasWorkspaceCanvas;

  return (
    <div id="destrova-preview-root">
      <div
        className={[
          "h-screen max-h-screen min-h-0 min-w-0 overflow-hidden font-sans text-slate-900 antialiased",
          outerCanvasClass,
        ].join(" ")}
      >
        <div className="flex h-full min-h-0 min-w-0 flex-col">
          <DestrovaShellProvider>
            <div className="shrink-0">
              <Topbar
                role={role}
                onTopbarAction={onTopbarAction}
                sidebarPinned={workspaceSidebarPinned}
                onSidebarToggle={() => setWorkspaceSidebarPinned((p) => !p)}
                sidebarControlsId={sidebarDomId}
              />
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
              <Sidebar
                id={sidebarDomId}
                role={role}
                activeId={activeNavId || fallbackActive}
                onSelect={onNavChange}
                pinnedExpanded={workspaceSidebarPinned}
              />
              <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
            </div>
          </DestrovaShellProvider>
        </div>
      </div>
    </div>
  );
}
