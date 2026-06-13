import { useEffect, useMemo, useRef, useState } from "react";
import { formatAgentInboxSlaCountdownLabel } from "../utils/agentInboxFormat";
import { getAgentSlaBarClasses } from "../agentTokens";

const TICK_MS = 30_000;

/** SLA states where the inbox countdown must not tick (frozen display only). */
const FROZEN_SLA_STATES = new Set(["Paused", "Stopped", "—"]);

function SlaClockIcon({ className = "h-3 w-3 shrink-0 opacity-60" }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6v4.5l2.75 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Live SLA countdown for the agent inbox list only.
 * Uses projected `slaDueAt` from the API (jBPM webhook); does not recalculate SLA rules.
 */
export default function AgentInboxSlaCountdown({ slaState, slaDue, slaDueAt, t }) {
  const frozen = FROZEN_SLA_STATES.has(slaState);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const frozenAtMs = useRef(nowMs);

  useEffect(() => {
    if (frozen) {
      frozenAtMs.current = Date.now();
      return undefined;
    }
    if (!slaDueAt) return undefined;
    const id = window.setInterval(() => setNowMs(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, [frozen, slaDueAt, slaState]);

  const clockMs = frozen ? frozenAtMs.current : nowMs;

  const label = useMemo(
    () => formatAgentInboxSlaCountdownLabel(slaState, slaDueAt, slaDue, t, clockMs),
    [slaState, slaDue, slaDueAt, t, clockMs],
  );

  const isOverdue = slaState === "Breached";

  if (!label) {
    return <span className="min-w-0 flex-1 text-xs text-slate-400" aria-hidden />;
  }

  const toneState = isOverdue ? "Breached" : slaState;
  const sla = getAgentSlaBarClasses(toneState);
  const isPaused = slaState === "Paused";

  return (
    <span
      className={`inline-flex min-w-0 max-w-full items-center gap-1 truncate text-xs font-medium tabular-nums ${sla.text}`}
      title={isPaused ? `${label} · ${t("ticketRow.paused")}` : label}
    >
      <SlaClockIcon className={`h-3 w-3 shrink-0 ${sla.text} opacity-60`} />
      <span className="truncate">{label}</span>
      {isPaused ? (
        <span className="shrink-0 font-normal text-slate-500">{t("inbox.slaCountdown.pausedSuffix")}</span>
      ) : null}
    </span>
  );
}
