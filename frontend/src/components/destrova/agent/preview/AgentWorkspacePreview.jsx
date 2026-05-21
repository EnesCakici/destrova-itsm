import { useEffect, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import AgentWorkspaceSplit from "./AgentWorkspaceSplit";
import CustomerPreviewPage from "../../customer/preview/CustomerPreviewPage";
import ManagerPreviewPage from "../../manager/preview/ManagerPreviewPage";
import AdminWorkspace from "../../admin/components/AdminWorkspace";
import { SHELL_ROLES } from "../../shell/roleConfig";

const ALLOWED_ROLES = new Set([
  SHELL_ROLES.AGENT,
  SHELL_ROLES.MANAGER,
  SHELL_ROLES.ADMIN,
  SHELL_ROLES.CUSTOMER,
]);

export default function AgentWorkspacePreview() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialTicketId = useMemo(
    () => (typeof location.state?.ticketId === "string" ? location.state.ticketId : undefined),
    [location.state],
  );

  const role = useMemo(() => {
    const raw = searchParams.get("role")?.toLowerCase();
    return ALLOWED_ROLES.has(raw) ? raw : SHELL_ROLES.AGENT;
  }, [searchParams]);

  useEffect(() => {
    if (initialTicketId) {
      navigate(`/preview?role=${role}`, { replace: true, state: {} });
    }
  }, [initialTicketId, navigate, role]);

  if (role === SHELL_ROLES.CUSTOMER) {
    return <CustomerPreviewPage />;
  }
  if (role === SHELL_ROLES.MANAGER) {
    return <ManagerPreviewPage />;
  }
  if (role === SHELL_ROLES.ADMIN) {
    return <AdminWorkspace />;
  }

  return <AgentWorkspaceSplit initialTicketId={initialTicketId} role={role} />;
}