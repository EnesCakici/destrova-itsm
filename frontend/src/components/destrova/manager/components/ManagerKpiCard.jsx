import { MANAGER_COLORS, MANAGER_STATUS } from "../managerTokens";
import ManagerCard from "./ManagerCard";
import { useTranslation } from "react-i18next";

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
 * Pass `onClick` to navigate (e.g. dashboard KPI → All Tickets preset).
 */
export default function ManagerKpiCard({
  label,
  value,
  delta,
  tone = "primary",
  interactive = false,
  onClick,
  ariaLabel,
}) {
  const { t } = useTranslation("manager");
  const isInteractive = interactive || Boolean(onClick);
  const isStatusTone = Boolean(MANAGER_STATUS[tone]);
  const valueColor = isStatusTone ? MANAGER_STATUS[tone].fg : MANAGER_COLORS.dark;
  const deltaBubbleBg = isStatusTone
    ? MANAGER_STATUS[tone].bg
    : "rgba(37,99,235,0.08)";
  const deltaIconColor = isStatusTone ? MANAGER_STATUS[tone].fg : MANAGER_COLORS.support;

  const handleKeyDown = (e) => {
    if (!onClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <ManagerCard
      as={onClick ? "div" : "section"}
      padding="p-6"
      tone={tone}
      interactive={isInteractive}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={
        ariaLabel ||
        (onClick ? t("kpiCard.ariaLabel", { label, value }) : undefined)
      }
    >
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
      {onClick ? (
        <p className="sr-only">{t("kpiCard.opensFilteredList")}</p>
      ) : null}
    </ManagerCard>
  );
}
