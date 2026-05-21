import { useNavigate } from "react-router-dom";
import AppShell from "../../shell/AppShell";
import QueueTablePanel from "../components/QueueTablePanel";
import { SHELL_ROLES } from "../../shell/roleConfig";

/**
 * Destrova agent queue (mock). Same shell as workspace preview; main area is a full-width table.
 * Public preview routes: `/queue-preview` (recommended) or `/preview/queue`.
 * Does not replace production `/agent/tickets`.
 */
export default function AgentQueuePreview() {
  const navigate = useNavigate();

  return (
    <AppShell role={SHELL_ROLES.AGENT} activeNavId="inbox" topbarTitle="ITSM Ticket Management">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 md:p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold tracking-tight text-destrova-textPrimary">Agent Queue</h1>
          <p className="text-xs text-slate-500">Compact queue surface · mock preview</p>
        </div>
        <QueueTablePanel variant="page" onOpenTicket={(id) => navigate("/preview/split", { state: { ticketId: id } })} />
      </div>
    </AppShell>
  );
}
