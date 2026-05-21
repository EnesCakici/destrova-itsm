//4. NAV / SAYFA GEÇİŞİ

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppShell from "../../shell/AppShell";
import { getRoleDefaultLanding, getRoleNavItem, SHELL_ROLES } from "../../shell/roleConfig";
import AdminOverviewView from "./views/AdminOverviewView";
import AdminUsersRolesView from "./views/AdminUsersRolesView";
import AdminProductsCatalogView from "./views/AdminProductsCatalogView";
import AdminModalsHost from "./AdminModalsHost";
import { AdminWorkspaceProvider, useAdminWorkspace } from "./AdminWorkspaceContext";

function renderSection(sectionId) {
  switch (sectionId) {
    case "overview":         return <AdminOverviewView />;
    case "usersRoles":       return <AdminUsersRolesView />;
    case "productsCatalog":  return <AdminProductsCatalogView />;
    default:                 return <AdminOverviewView />;
  }
}

/**
 * Admin workspace — reuses the shared AppShell (same Topbar + Sidebar) and
 * switches the main content based on the selected sidebar section.
 *
 * The entire shell is wrapped in `AdminWorkspaceProvider` so:
 *   - the topbar's global search and quick-add can navigate between sections
 *   - the system-health indicator can route to the overview
 *   - the modals host can render the active modal anywhere
 */
function AdminAppShell() {
  const { activeSection, navigateTo } = useAdminWorkspace();
  const activeNav = getRoleNavItem(SHELL_ROLES.ADMIN, activeSection);
  return (
    <AppShell
      role={SHELL_ROLES.ADMIN}
      activeNavId={activeSection}
      onNavChange={(id) => navigateTo(id, {})}
      topbarTitle={activeNav?.label || "Admin"}
    >
      {renderSection(activeSection)}
    </AppShell>
  );
}

export default function AdminWorkspace({ initialSection }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const routerSync = pathname.startsWith("/admin");
  const [activeSection, setActiveSection] = useState(initialSection || getRoleDefaultLanding(SHELL_ROLES.ADMIN));

  useEffect(() => {
    if (!initialSection) return;
    setActiveSection(initialSection);
  }, [initialSection]);

  return (
    <AdminWorkspaceProvider
      activeSection={activeSection}
      setActiveSection={setActiveSection}
      routerNavigate={routerSync ? navigate : null}
    >
      <AdminAppShell />
      <AdminModalsHost />
    </AdminWorkspaceProvider>
  );
}
