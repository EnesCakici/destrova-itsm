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

/** Main column — no extra tinted wrapper; canvas comes from AppShell (#F8FAFC). */
function AdminContent({ activeSection }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {renderSection(activeSection)}
    </div>
  );
}

/**
 * Admin workspace — enterprise AppShell (P1) with manager/agent chrome.
 *
 * Canvas `#F8FAFC` is applied by `AppShell` via `saasWorkspaceCanvas`; section
 * views use `AdminSurface` for in-column scroll only — no legacy purple shell.
 *
 * `AdminWorkspaceProvider` wires topbar search, quick-add, health, and modals.
 * `AdminModalsHost` stays at the workspace root (sibling to the shell).
 *
 * Preview: `/preview/admin` — overview, users, products sections.
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
      <AdminContent activeSection={activeSection} />
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
