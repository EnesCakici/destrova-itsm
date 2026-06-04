import { useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { CUSTOMER_WORKSPACE } from "../components/destrova/customer/customerTokens";
import AppShell from "../components/destrova/shell/AppShell";
import { SHELL_ROLES } from "../components/destrova/shell/roleConfig";

/** Ticket id segment when URL is `/customer/tickets/:id` (not the list `/customer/tickets`). */
function customerTicketIdFromPathname(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "customer" || parts[1] !== "tickets" || parts[2] == null || parts[2] === "") {
    return null;
  }
  return parts[2];
}

/**
 * Destrova chrome for real customer routes: same AppShell as Agent (Topbar + Sidebar),
 * with React Router outlet. Navigation only maps URLs ↔ shell ids; no business logic here.
 */
export default function CustomerShellLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const ticketId = customerTicketIdFromPathname(location.pathname);
  const isNew = /\/customer\/new\/?$/.test(location.pathname);

  const activeNavId = useMemo(() => {
    if (isNew) return "newTicket";
    return "myTickets";
  }, [isNew]);

  const topbarTitle = useMemo(() => {
    if (isNew) return "Yeni Ticket";
    if (ticketId) return `Talep #${ticketId}`;
    return "Destek Taleplerim";
  }, [isNew, ticketId]);

  const handleNavChange = (sectionId) => {
    if (sectionId === "myTickets") navigate("/customer/tickets");
    else if (sectionId === "newTicket") navigate("/customer/new");
  };

  return (
    <AppShell
      role={SHELL_ROLES.CUSTOMER}
      activeNavId={activeNavId}
      onNavChange={handleNavChange}
      topbarTitle={topbarTitle}
      onTopbarAction={(action) => {
        if (action === "newTicket") navigate("/customer/new");
      }}
    >
      <div className={CUSTOMER_WORKSPACE.main}>
        <Outlet />
      </div>
    </AppShell>
  );
}
