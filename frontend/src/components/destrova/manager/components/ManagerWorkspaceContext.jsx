import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, matchPath } from "react-router-dom";

/**
 * Cross-cutting state for the Manager workspace.
 *
 * Lives one level above AppShell so both the topbar (global search) and the
 * page content (dashboard, all tickets, team workload, ticket detail) can
 * coordinate navigation and selection without prop-drilling.
 *
 * Surface:
 *   activeSection           — current sidebar section
 *   navigateTo(section, opts) — switch section; optional pre-filters
 *   selectedTicketId        — id of the ticket open in detail (or null)
 *   openTicket(id)          — open a ticket in the detail view
 *   closeTicket()           — go back to the section view
 *   agentFocusId            — agent the workload page should highlight
 *   focusAgent(id)          — navigate to teamWorkload focused on agent
 *   customerFilter          — preselected customer for All Tickets
 *   setCustomerFilter(name) — set the preselected customer
 *   assigneeFilter          — agent user id; All Tickets filters by assigneeId (not cleared by navigateTo)
 *   setAssigneeFilter(id)   — set or clear agent filter (pass null to clear)
 */
const ManagerWorkspaceContext = createContext(null);

/** Derive manager shell section + optional ticket id from the URL (production routes). */
export function getManagerStateFromPathname(pathname) {
  const m = matchPath({ path: "/manager/tickets/:ticketId", end: true }, pathname);
  if (m?.params?.ticketId) {
    return { section: "allTickets", ticketId: m.params.ticketId };
  }
  const entries = [
    ["/manager/dashboard", "dashboard"],
    ["/manager/tickets", "allTickets"],
    ["/manager/sla-monitor", "slaMonitor"],
    ["/manager/team-workload", "teamWorkload"],
    ["/manager/reports", "reports"],
  ];
  for (const [path, section] of entries) {
    if (pathname === path) {
      return { section, ticketId: null };
    }
  }
  return { section: "dashboard", ticketId: null };
}

const NOOP_VALUE = {
  activeSection:    null,
  navigateTo:       () => {},
  selectedTicketId: null,
  openTicket:       () => {},
  closeTicket:      () => {},
  agentFocusId:     null,
  focusAgent:       () => {},
  customerFilter:   null,
  setCustomerFilter:() => {},
  assigneeFilter:    null,
  setAssigneeFilter: () => {},
};

export function ManagerWorkspaceProvider({
  activeSection,
  setActiveSection,
  children,
  /** When set, sidebar/ticket nav updates the browser URL (production routes). */
  routerNavigate = null,
}) {
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [agentFocusId, setAgentFocusId] = useState(null);
  const [customerFilter, setCustomerFilter] = useState(null);
  const [assigneeFilter, setAssigneeFilter] = useState(null);

  const MANAGER_PATH_BY_SECTION = useMemo(
    () => ({
      dashboard: "/manager/dashboard",
      allTickets: "/manager/tickets",
      slaMonitor: "/manager/sla-monitor",
      teamWorkload: "/manager/team-workload",
      reports: "/manager/reports",
    }),
    []
  );

  const navigateTo = useCallback(
    (sectionId, opts) => {
      setSelectedTicketId(null);
      if (opts && Object.prototype.hasOwnProperty.call(opts, "agentFocusId")) {
        setAgentFocusId(opts.agentFocusId);
      } else {
        setAgentFocusId(null);
      }
      if (opts && Object.prototype.hasOwnProperty.call(opts, "customerFilter")) {
        setCustomerFilter(opts.customerFilter);
      } else {
        setCustomerFilter(null);
      }
      // assigneeFilter is managed only via setAssigneeFilter (e.g. Team Workload → View tickets)
      setActiveSection(sectionId);
      const nextPath = MANAGER_PATH_BY_SECTION[sectionId];
      if (routerNavigate && nextPath) {
        routerNavigate(nextPath);
      }
    },
    [setActiveSection, routerNavigate, MANAGER_PATH_BY_SECTION]
  );

  const openTicket = useCallback(
    (ticketId) => {
      if (!ticketId) return;
      setSelectedTicketId(ticketId);
      if (routerNavigate) {
        routerNavigate(`/manager/tickets/${String(ticketId)}`);
      }
    },
    [routerNavigate]
  );

  const closeTicket = useCallback(() => {
    setSelectedTicketId(null);
    if (routerNavigate) {
      const back = MANAGER_PATH_BY_SECTION[activeSection] || "/manager/tickets";
      routerNavigate(back);
    }
  }, [routerNavigate, activeSection, MANAGER_PATH_BY_SECTION]);

  const focusAgent = useCallback((agentId) => {
    navigateTo("teamWorkload", { agentFocusId: agentId });
  }, [navigateTo]);

  const location = useLocation();
  useEffect(() => {
    if (!routerNavigate) return;
    const { section, ticketId } = getManagerStateFromPathname(location.pathname);
    setActiveSection(section);
    if (ticketId) {
      setSelectedTicketId(ticketId);
    } else {
      setSelectedTicketId(null);
    }
  }, [location.pathname, routerNavigate, setActiveSection]);

  const value = useMemo(() => ({
    activeSection,
    navigateTo,
    selectedTicketId,
    openTicket,
    closeTicket,
    agentFocusId,
    focusAgent,
    customerFilter,
    setCustomerFilter,
    assigneeFilter,
    setAssigneeFilter,
  }), [
    activeSection,
    navigateTo,
    selectedTicketId,
    openTicket,
    closeTicket,
    agentFocusId,
    focusAgent,
    customerFilter,
    assigneeFilter,
  ]);

  return (
    <ManagerWorkspaceContext.Provider value={value}>
      {children}
    </ManagerWorkspaceContext.Provider>
  );
}

export function useManagerWorkspace() {
  const ctx = useContext(ManagerWorkspaceContext);
  return ctx || NOOP_VALUE;
}
