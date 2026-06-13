import { MANAGER_COLORS } from "../../managerTokens";

/** Centered empty panel for charts and tables (Faz 3). */
export default function ReportsEmptyState({
  title,
  description,
  className = "",
}) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center",
        className,
      ].join(" ")}
      style={{
        borderColor: "rgba(148,163,184,0.45)",
        backgroundColor: "rgba(248,250,252,0.7)",
      }}
      role="status"
    >
      <p className="text-sm font-semibold" style={{ color: MANAGER_COLORS.dark }}>
        {title}
      </p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed" style={{ color: MANAGER_COLORS.muted }}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
