import { MANAGER_COLORS, MANAGER_STATUS } from "../managerTokens";
import ManagerCard from "./ManagerCard";

function DeltaIcon({ dir, color }) {
  const stroke = color || MANAGER_COLORS.support;
  if (dir === "up") {
    return (
      <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
        <path d="M2 8l4-4 4 4" stroke={stroke} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (dir === "down") {
    return (
      <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
        <path d="M2 4l4 4 4-4" stroke={stroke} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
      <path d="M2 6h8" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * KPI card — calm, large number, restrained delta.
 *
 * Defaults to the blue-tinted `primary` tone so the KPI band reads as a layered
 * surface, not a stack of plain white boxes. Pass `tone="safe|atRisk|breached"`
 * for status-flavored KPIs (e.g. SLA breach counts) — the value & accent
 * marker pick up the matching color while the background stays restrained.
 */
export default function ManagerKpiCard({ label, value, delta, tone = "primary" }) {
  const isStatusTone = Boolean(MANAGER_STATUS[tone]);
  const valueColor = isStatusTone ? MANAGER_STATUS[tone].fg : MANAGER_COLORS.dark;
  const deltaBubbleBg = isStatusTone
    ? MANAGER_STATUS[tone].bg
    : "rgba(37,99,235,0.08)";
  const deltaIconColor = isStatusTone ? MANAGER_STATUS[tone].fg : MANAGER_COLORS.support;

  return (
    <ManagerCard padding="p-6" tone={tone} interactive>
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.16em]"
        style={{ color: MANAGER_COLORS.muted }}
      >
        {label}
      </p>
      <p
        className="mt-4 text-[34px] font-semibold leading-none tracking-tight tabular-nums md:text-[40px]"
        style={{ color: valueColor }}
      >
        {value}
      </p>
      <div className="mt-5 flex items-center gap-2 text-xs">
        {delta ? (
          <>
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full"
              style={{ backgroundColor: deltaBubbleBg }}
            >
              <DeltaIcon dir={delta.dir} color={deltaIconColor} />
            </span>
            <span style={{ color: MANAGER_COLORS.support }} className="font-medium">
              {delta.text}
            </span>
          </>
        ) : (
          <span style={{ color: MANAGER_COLORS.muted }}>&nbsp;</span>
        )}
      </div>
    </ManagerCard>
  );
}
