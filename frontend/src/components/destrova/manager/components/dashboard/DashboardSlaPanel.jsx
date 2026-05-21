import { MANAGER_COLORS, MANAGER_STATUS } from "../../managerTokens";
import ManagerCard, { ManagerCardHeader } from "../ManagerCard";

/**
 * Compact SLA donut + breakdown + actionable insight line.
 *
 * Inputs (from parent):
 *   - slaHealth   : { metPct, atRiskPct, breachedPct, totalActive }
 *   - slaInsight  : insight copy for the current range
 */
const EMPTY_SLA_HEALTH = { metPct: 0, atRiskPct: 0, breachedPct: 0, totalActive: 0 };

function SlaGauge({ metPct, breachedPct, atRiskPct }) {
  const radius = 56;
  const stroke = 10;
  const C = 2 * Math.PI * radius;
  const m = (metPct / 100) * C;
  const r = (atRiskPct / 100) * C;
  const b = (breachedPct / 100) * C;
  const center = 70;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 140 140" className="h-32 w-32 -rotate-90">
        <circle cx={center} cy={center} r={radius} stroke={MANAGER_COLORS.hairline} strokeWidth={stroke} fill="none" />
        <circle cx={center} cy={center} r={radius} stroke={MANAGER_STATUS.safe.fg}     strokeWidth={stroke} fill="none" strokeDasharray={`${m} ${C - m}`} strokeLinecap="round" />
        <circle cx={center} cy={center} r={radius} stroke={MANAGER_STATUS.atRisk.fg}   strokeWidth={stroke} fill="none" strokeDasharray={`${r} ${C - r}`} strokeDashoffset={-m} strokeLinecap="round" />
        <circle cx={center} cy={center} r={radius} stroke={MANAGER_STATUS.breached.fg} strokeWidth={stroke} fill="none" strokeDasharray={`${b} ${C - b}`} strokeDashoffset={-(m + r)} strokeLinecap="round" />
      </svg>
      <div className="-mt-[5.25rem] flex flex-col items-center">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: MANAGER_COLORS.muted }}>Met</span>
        <span className="text-2xl font-semibold tabular-nums" style={{ color: MANAGER_COLORS.dark }}>{metPct}%</span>
      </div>
    </div>
  );
}

function IconBolt({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M9 1L3 9h4l-1 6 6-8H8l1-6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export default function DashboardSlaPanel({ slaHealth, slaInsight }) {
  const health = { ...EMPTY_SLA_HEALTH, ...slaHealth };
  const rows = [
    { kind: "safe",     label: "Met",      value: health.metPct },
    { kind: "atRisk",   label: "At risk",  value: health.atRiskPct },
    { kind: "breached", label: "Breached", value: health.breachedPct },
  ];

  return (
    <ManagerCard padding="p-6" tone="primary">
      <ManagerCardHeader title="SLA right now" hint={`${health.totalActive} active SLAs`} />

      <div className="mt-2 flex justify-center">
        <SlaGauge
          metPct={health.metPct}
          breachedPct={health.breachedPct}
          atRiskPct={health.atRiskPct}
        />
      </div>

      <ul className="mt-4 grid grid-cols-3 gap-2 text-center">
        {rows.map((row) => (
          <li key={row.kind}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>
              {row.label}
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums" style={{ color: MANAGER_STATUS[row.kind].fg }}>
              {row.value}%
            </p>
          </li>
        ))}
      </ul>

      {/* Actionable insight */}
      <div
        className="mt-5 flex items-start gap-2.5 rounded-lg p-3 text-[12.5px] leading-snug"
        style={{
          color: MANAGER_COLORS.dark,
          backgroundColor: MANAGER_STATUS.atRisk.bg,
          boxShadow: "0 0 0 1px rgba(165,100,0,0.18) inset",
        }}
      >
        <span
          className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
          style={{ color: MANAGER_STATUS.atRisk.fg }}
        >
          <IconBolt className="h-3.5 w-3.5" />
        </span>
        <span className="font-medium">{slaInsight ?? ""}</span>
      </div>
    </ManagerCard>
  );
}
