import { useMemo, useState } from "react";

const CLAMP = 360;

/**
 * @param {{ text: string, source: string, isEmpty: boolean, loading?: boolean }}
 */
const sectionBase = "border border-slate-200/80 bg-white";

export default function IssueDescriptionCard({ text, source, isEmpty, loading = false, compact = false }) {
  const box = compact
    ? "rounded-agent-card px-3 py-2.5 shadow-agent-card"
    : "rounded-agent-card px-5 py-4 shadow-agent-card";
  const [expanded, setExpanded] = useState(false);
  const needsClamp = useMemo(() => (text != null && String(text).length > CLAMP) || String(text).split("\n").length > 5, [text]);
  const display = useMemo(() => {
    if (loading || text == null) return "";
    const s = String(text);
    if (expanded || !needsClamp) return s;
    return s.length > CLAMP ? `${s.slice(0, CLAMP).trim()}…` : s;
  }, [text, expanded, needsClamp, loading]);

  if (loading) {
    return (
      <section className={["border border-slate-200/80 bg-white", box].join(" ")}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Issue description</p>
        <div
          className={[
            compact ? "mt-1.5 h-12" : "mt-2 h-16",
            "animate-pulse rounded-lg bg-slate-100",
          ].join(" ")}
        />
      </section>
    );
  }

  if (isEmpty) {
    return (
      <section
        className={[
          "border border-dashed border-slate-200/90 bg-slate-50/80",
          compact ? "rounded-xl px-3 py-2.5" : "rounded-2xl px-5 py-4",
        ].join(" ")}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Issue description</p>
        <p className={compact ? "mt-1.5 text-sm text-slate-500" : "mt-2 text-sm text-slate-500"}>
          No initial description on file. The opening thread may be in the conversation below.
        </p>
      </section>
    );
  }

  return (
    <section className={[sectionBase, box].join(" ")}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Issue description</p>
        {source === "first_message" ? (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">From first message</span>
        ) : null}
      </div>
      <p className={compact ? "mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700" : "mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700"}>
        {display}
      </p>
      {needsClamp ? (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </section>
  );
}
