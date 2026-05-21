const accentFor = (value) => {
  if (value === "HIGH") {
    return {
      bar: "bg-rose-500",
      dot: "bg-rose-500",
      activeRing: "ring-rose-200/80",
      activeBg: "bg-rose-50/50",
      activeBorder: "border-rose-200",
      selectedPill: "text-rose-700 ring-rose-200/80",
    };
  }
  if (value === "MEDIUM") {
    return {
      bar: "bg-amber-500",
      dot: "bg-amber-500",
      activeRing: "ring-amber-200/80",
      activeBg: "bg-amber-50/50",
      activeBorder: "border-amber-200",
      selectedPill: "text-amber-800 ring-amber-200/80",
    };
  }
  return {
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
    activeRing: "ring-emerald-200/80",
    activeBg: "bg-emerald-50/40",
    activeBorder: "border-emerald-200",
    selectedPill: "text-emerald-800 ring-emerald-200/80",
  };
};

/*
 * PRIORITY PICKER REHBER:
 * - Kartların renk mantığı accentFor() içinde.
 * - activeBorder / activeBg / activeRing -> seçili kart görünümü.
 * - soldaki renk çizgisi: `bar`
 * - küçük nokta: `dot`
 * - "Selected" pill stili: `selectedPill`
 */

export default function CustomerPriorityPicker({ priorityCards, selectedPriority, onChange }) {
  return (
    <div
      className="grid gap-2.5 md:grid-cols-3"
      role="radiogroup"
      aria-label="Priority"
    >
      {priorityCards.map((card) => {
        const active = selectedPriority === card.value;
        const accent = accentFor(card.value);
        return (
          <button
            key={card.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(card.value)}
            className={[
              "group relative overflow-hidden rounded-xl border px-3.5 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destrova-primary/30",
              active
                ? `${accent.activeBorder} ${accent.activeBg} shadow-destrova-sm ring-1 ring-inset ${accent.activeRing}`
                : "border-destrova-border bg-white hover:-translate-y-px hover:border-destrova-borderStrong hover:shadow-destrova",
            ].join(" ")}
          >
            <span
              aria-hidden
              className={`absolute left-0 top-0 h-full w-[3px] ${accent.bar} ${active ? "opacity-100" : "opacity-60 group-hover:opacity-90"}`}
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} aria-hidden />
                <p className="text-[13.5px] font-semibold tracking-tight text-destrova-ink">{card.title}</p>
              </div>
              {active ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${accent.selectedPill}`}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" aria-hidden>
                    <path
                      fillRule="evenodd"
                      d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.07 7.13a1 1 0 0 1-1.42 0l-3.53-3.57a1 1 0 1 1 1.42-1.407l2.82 2.852 6.36-6.413a1 1 0 0 1 1.414-.006Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Selected
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[12px] leading-snug text-destrova-inkSoft">{card.description}</p>
          </button>
        );
      })}
    </div>
  );
}
