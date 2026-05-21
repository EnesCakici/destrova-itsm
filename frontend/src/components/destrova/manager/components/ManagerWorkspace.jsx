import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppShell from "../../shell/AppShell";
import { getRoleDefaultLanding, getRoleNavItem, SHELL_ROLES } from "../../shell/roleConfig";
import ManagerDashboardView from "./views/ManagerDashboardView";
import ManagerAllTicketsView from "./views/ManagerAllTicketsView";
import ManagerSlaMonitorView from "./views/ManagerSlaMonitorView";
import ManagerTeamWorkloadView from "./views/ManagerTeamWorkloadView";
import ManagerReportsView from "./views/ManagerReportsView";
import ManagerTicketDetailView from "./ManagerTicketDetailView";
import { ManagerWorkspaceProvider, useManagerWorkspace } from "./ManagerWorkspaceContext";

function ManagerAppShell() {
  const { activeSection, navigateTo } = useManagerWorkspace();
  const activeNav = getRoleNavItem(SHELL_ROLES.MANAGER, activeSection);
  return (
    <AppShell
      role={SHELL_ROLES.MANAGER}
      activeNavId={activeSection}
      onNavChange={(id) => navigateTo(id, {})}
      topbarTitle={activeNav?.label || "Manager"}
    >
      <ManagerContent activeSection={activeSection} />
    </AppShell>
  );
}

function renderSection(sectionId) {
  switch (sectionId) {
    case "dashboard":    return <ManagerDashboardView />;
    case "allTickets":   return <ManagerAllTicketsView />;
    case "slaMonitor":   return <ManagerSlaMonitorView />;
    case "teamWorkload": return <ManagerTeamWorkloadView />;
    case "reports":      return <ManagerReportsView />;
    default:             return <ManagerDashboardView />;
  }
}

/** Renders the currently-selected manager section, OR the ticket detail
 *  overlay when a ticket has been opened from anywhere in the workspace. */
function ManagerContent({ activeSection }) {
  const { selectedTicketId } = useManagerWorkspace();
  if (selectedTicketId) {
    return <ManagerTicketDetailView ticketId={selectedTicketId} />;
  }
  return renderSection(activeSection);
}

/**
 * Manager workspace — reuses the agent shell (same Topbar + Sidebar)
 * and switches the main content based on the selected sidebar section.
 *
 * Wraps the entire shell in `ManagerWorkspaceProvider` so the topbar's
 * global search and the page content can coordinate navigation.
 */
export default function ManagerWorkspace({ initialSection }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const routerSync = pathname.startsWith("/manager");
  const [activeSection, setActiveSection] = useState(
    () => initialSection || getRoleDefaultLanding(SHELL_ROLES.MANAGER)
  );

  useEffect(() => {
    if (!initialSection) return;
    setActiveSection(initialSection);
  }, [initialSection]);

  return (
    <ManagerWorkspaceProvider
      activeSection={activeSection}
      setActiveSection={setActiveSection}
      routerNavigate={routerSync ? navigate : null}
    >
      <ManagerAppShell />
    </ManagerWorkspaceProvider>
  );
}
