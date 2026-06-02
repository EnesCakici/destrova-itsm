import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { AgentShellProvider } from "./AgentShellContext";
import { getRoleDefaultLanding, SHELL_ROLES } from "./roleConfig";

/*
 * Destrova workspace shell: Topbar + Sidebar + scrollable main (all roles).
 */
export default function AppShell({ role, activeNavId, onNavChange, topbarTitle, children, onTopbarAction }) {
  const fallbackActive = getRoleDefaultLanding(role);
  const useDestrovaWorkspace = role === SHELL_ROLES.AGENT || role === SHELL_ROLES.CUSTOMER;
  /** Pinned = sidebar stays at expanded width (260px); unpinned = 72px until hover. */
  const [workspaceSidebarPinned, setWorkspaceSidebarPinned] = useState(false);
  const sidebarDomId = role === SHELL_ROLES.CUSTOMER ? "destrova-customer-sidebar" : "destrova-agent-sidebar";

  return (
    <div id="destrova-preview-root">
      <div className="h-screen max-h-screen min-h-0 min-w-0 overflow-hidden bg-destrova-canvas bg-destrova-canvas-glow font-sans text-destrova-ink antialiased">
        <div className="flex h-full min-h-0 min-w-0 flex-col">
          {useDestrovaWorkspace ? (
            <AgentShellProvider>
              <Topbar
                role={role}
                onTopbarAction={onTopbarAction}
                sidebarPinned={workspaceSidebarPinned}
                onSidebarToggle={() => setWorkspaceSidebarPinned((p) => !p)}
                sidebarControlsId={sidebarDomId}
              />
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
            </AgentShellProvider>
          ) : (
            <>
              <Topbar role={role} title={topbarTitle} onTopbarAction={onTopbarAction} />
              <div className="flex min-h-0 min-w-0 flex-1">
                <Sidebar role={role} activeId={activeNavId || fallbackActive} onSelect={onNavChange} />
                <main className="flex min-w-0 flex-1 flex-col">{children}</main>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
