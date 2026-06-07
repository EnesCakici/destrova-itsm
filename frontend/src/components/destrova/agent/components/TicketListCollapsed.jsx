import { WorkspacePanelToggleButton } from "./workspacePanelToggle.jsx";

/** Narrow left strip when the ticket list is collapsed — reopen only. */
export default function TicketListCollapsed({ onExpand }) {
  return (
    <aside className="flex h-full min-h-0 w-[52px] shrink-0 flex-col items-stretch border-r border-destrova-agent-border bg-white/95 py-3 sm:w-14">
      <WorkspacePanelToggleButton
        side="left"
        open={false}
        onToggle={onExpand}
        className="mx-auto"
      />
    </aside>
  );
}
