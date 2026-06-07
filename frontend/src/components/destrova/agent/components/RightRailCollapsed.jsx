import { mapPriorityToAgentLabel, mapTicketStatusToAgentLabel } from "../mappers/agentTicketMappers";
import { getAgentPriorityClasses, getAgentStatusClasses } from "../agentTokens.js";
import { WorkspacePanelToggleButton } from "./workspacePanelToggle.jsx";

const STATUS_COLLAPSED_LABEL = {
  NEW: "New",
  IN_PROGRESS: "In prog.",
  WAITING_FOR_CUSTOMER: "Wait",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const PRIORITY_COLLAPSED_LABEL = {
  LOW: "Low",
  MEDIUM: "Med",
  HIGH: "High",
  URGENT: "Urgent",
};

function collapsedStatusShort(code) {
  const c = String(code || "NEW");
  return STATUS_COLLAPSED_LABEL[c] ?? mapTicketStatusToAgentLabel(c);
}

function collapsedPriorityShort(code) {
  const c = String(code || "MEDIUM").toUpperCase();
  return PRIORITY_COLLAPSED_LABEL[c] ?? mapPriorityToAgentLabel(code);
}

const CHIP =
  "box-border flex w-full shrink-0 items-center justify-center rounded-lg border px-1 py-2 text-center text-[10px] font-bold leading-none tracking-tight";

/** Narrow strip when the properties panel is collapsed — status/priority summary + reopen. */
export default function RightRailCollapsed({ rawTicket, attachmentCount = 0, slaState, onExpand }) {
  const statusCode = rawTicket?.status != null ? String(rawTicket.status) : "NEW";
  const priorityCode = rawTicket?.priority != null ? String(rawTicket.priority) : "MEDIUM";
  const statusFull = mapTicketStatusToAgentLabel(statusCode);
  const priorityFull = mapPriorityToAgentLabel(priorityCode);
  const slaWarningTitle =
    slaState === "Breached" ? "SLA breached" : slaState === "At Risk" ? "SLA warning" : "";

  return (
    <aside className="flex h-full min-h-0 w-[52px] shrink-0 flex-col items-stretch rounded-agent-card border border-destrova-agent-border bg-white py-3 shadow-agent-card sm:w-14">
      <WorkspacePanelToggleButton
        side="right"
        open={false}
        onToggle={onExpand}
        className="mx-auto"
      />

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2 px-1.5">
        <div className="flex shrink-0 flex-col gap-2 rounded-agent-card border border-destrova-agent-border bg-slate-50/90 p-1.5 shadow-agent-card">
          <div className="flex shrink-0 flex-col gap-1">
            <span className="text-center text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Status
            </span>
            <span
              className={[CHIP, "border border-destrova-agent-border", getAgentStatusClasses(statusCode)].join(" ")}
              title={statusFull}
            >
              {collapsedStatusShort(statusCode)}
            </span>
          </div>
          <div className="flex shrink-0 flex-col gap-1">
            <span className="text-center text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Priority
            </span>
            <span
              className={[CHIP, "border border-destrova-agent-border", getAgentPriorityClasses(priorityCode)].join(" ")}
              title={priorityFull}
            >
              {collapsedPriorityShort(priorityCode)}
            </span>
          </div>
        </div>

        {slaState === "Breached" || slaState === "At Risk" ? (
          <span
            className={[
              "mx-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[13px] font-bold leading-none shadow-sm",
              slaState === "Breached"
                ? "border-red-300/90 bg-red-100 text-red-800"
                : "border-amber-300/90 bg-amber-100 text-amber-950",
            ].join(" ")}
            title={slaWarningTitle}
            aria-label={slaWarningTitle}
          >
            !
          </span>
        ) : null}

        {attachmentCount > 0 ? (
          <span
            className="mx-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-300/80 bg-slate-100 text-[10px] font-bold text-slate-800 shadow-sm"
            title={`${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"}`}
          >
            {attachmentCount > 9 ? "9+" : attachmentCount}
          </span>
        ) : null}
      </div>
    </aside>
  );
}
