import { useSearchParams } from "react-router-dom";
import { AgentWorkspaceMain } from "../preview/AgentWorkspaceSplit";
import { SHELL_ROLES } from "../../shell/roleConfig";

export default function AgentInboxPage() {
  const [searchParams] = useSearchParams();
  const ticketId = searchParams.get("ticketId");
  return <AgentWorkspaceMain role={SHELL_ROLES.AGENT} activeSection="inbox" initialTicketId={ticketId || undefined} />;
}
