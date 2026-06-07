/** Left rail + main content. */
export function IconWorkspacePanelLeft({ className }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.35" stroke="currentColor" strokeWidth="1.35" />
      <path d="M6 2.5v11" stroke="currentColor" strokeWidth="1.35" />
    </svg>
  );
}

/** Main content + right rail (mirrored). */
export function IconWorkspacePanelRight({ className }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.35" stroke="currentColor" strokeWidth="1.35" />
      <path d="M10 2.5v11" stroke="currentColor" strokeWidth="1.35" />
    </svg>
  );
}

const SIDE_META = {
  left: {
    Icon: IconWorkspacePanelLeft,
    panelId: "agent-ticket-list-panel",
    hideLabel: "Hide ticket list",
    showLabel: "Show ticket list",
  },
  right: {
    Icon: IconWorkspacePanelRight,
    panelId: "agent-properties-panel",
    hideLabel: "Hide properties panel",
    showLabel: "Show properties panel",
  },
};

/**
 * Shared workspace panel toggle — left ticket list or right properties rail.
 * @param {{ side: "left" | "right", open: boolean, onToggle: () => void, className?: string, compact?: boolean }} props
 */
export function WorkspacePanelToggleButton({
  side,
  open,
  onToggle,
  className = "",
  compact = false,
}) {
  const meta = SIDE_META[side];
  const Icon = meta.Icon;
  const sizeClass = compact ? "h-8 w-8" : "h-9 w-9";
  const iconClass = compact ? "h-3.5 w-3.5" : "h-4 w-4";

  const stateClasses = open
    ? "border-blue-200/90 bg-blue-50/60 text-blue-700 ring-1 ring-inset ring-blue-200/55 shadow-sm"
    : "border-destrova-agent-border bg-white text-slate-600 shadow-sm hover:border-blue-200/80 hover:bg-blue-50/45 hover:text-blue-700 hover:ring-1 hover:ring-inset hover:ring-blue-100/70";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        "destrova-focus-ring flex shrink-0 items-center justify-center rounded-agent-button border transition-all duration-150",
        sizeClass,
        stateClasses,
        className,
      ].join(" ")}
      title={open ? meta.hideLabel : meta.showLabel}
      aria-label={open ? meta.hideLabel : meta.showLabel}
      aria-expanded={open}
      aria-controls={meta.panelId}
    >
      <Icon className={iconClass} />
    </button>
  );
}
