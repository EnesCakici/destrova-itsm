import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Cross-cutting state for the Admin workspace.
 *
 * Lives one level above AppShell so the topbar (global search, quick add,
 * health indicator) and the page content can coordinate navigation,
 * modal opening and entity selection without prop-drilling.
 *
 * Surface:
 *   activeSection             — current sidebar section
 *   navigateTo(sectionId)     — switch section
 *   selectedEntity            — { kind, id } currently focused (user, product…)
 *   selectEntity(kind, id)    — preselect an entity for the destination view
 *   clearEntity()             — deselect
 *   modal                     — { id, payload? } currently open
 *   openModal(id, payload?)   — open a modal anywhere (Quick Add, edit…)
 *   closeModal()              — dismiss the modal
 *   refreshAdminProducts()   — bump token so Products catalog refetches from API
 */
const AdminWorkspaceContext = createContext(null);

/** Map production URL → admin section id (see router + AdminWorkspace). */
export function getAdminStateFromPathname(pathname) {
  if (pathname === "/admin" || pathname === "/admin/") {
    return "overview";
  }
  const entries = [
    ["/admin/overview", "overview"],
    ["/admin/users", "usersRoles"],
    ["/admin/products", "productsCatalog"],
  ];
  for (const [path, section] of entries) {
    if (pathname === path) {
      return section;
    }
  }
  return "overview";
}

const NOOP_VALUE = {
  activeSection:   null,
  navigateTo:      () => {},
  selectedEntity:  null,
  selectEntity:    () => {},
  clearEntity:     () => {},
  modal:           null,
  openModal:       () => {},
  closeModal:      () => {},
  adminProductsRefreshToken: 0,
  refreshAdminProducts: () => {},
};

const ADMIN_PATH_BY_SECTION = {
  overview: "/admin/overview",
  usersRoles: "/admin/users",
  productsCatalog: "/admin/products",
};

export function AdminWorkspaceProvider({ activeSection, setActiveSection, children, routerNavigate = null }) {
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [modal, setModal] = useState(null);
  const [adminProductsRefreshToken, setAdminProductsRefreshToken] = useState(0);

  const refreshAdminProducts = useCallback(() => {
    setAdminProductsRefreshToken((t) => t + 1);
  }, []);

  const navigateTo = useCallback(
    (sectionId, opts) => {
      if (opts && opts.entity) setSelectedEntity(opts.entity);
      else setSelectedEntity(null);
      setActiveSection(sectionId);
      const p = ADMIN_PATH_BY_SECTION[sectionId];
      if (routerNavigate && p) {
        routerNavigate(p);
      }
    },
    [setActiveSection, routerNavigate],
  );

  const selectEntity = useCallback((kind, id, payload) => {
    setSelectedEntity({ kind, id, payload: payload || null });
  }, []);

  const clearEntity = useCallback(() => setSelectedEntity(null), []);

  const openModal  = useCallback((id, payload) => setModal({ id, payload: payload || null }), []);
  const closeModal = useCallback(() => setModal(null), []);

  const location = useLocation();
  useEffect(() => {
    if (!routerNavigate) return;
    const section = getAdminStateFromPathname(location.pathname);
    setActiveSection(section);
  }, [location.pathname, routerNavigate, setActiveSection]);

  const value = useMemo(() => ({
    activeSection,
    navigateTo,
    selectedEntity,
    selectEntity,
    clearEntity,
    modal,
    openModal,
    closeModal,
    adminProductsRefreshToken,
    refreshAdminProducts,
  }), [activeSection, navigateTo, selectedEntity, selectEntity, clearEntity, modal, openModal, closeModal, adminProductsRefreshToken, refreshAdminProducts]);

  return (
    <AdminWorkspaceContext.Provider value={value}>
      {children}
    </AdminWorkspaceContext.Provider>
  );
}

export function useAdminWorkspace() {
  const ctx = useContext(AdminWorkspaceContext);
  return ctx || NOOP_VALUE;
}
