import { useEffect, useState } from "react";
import { getAgentStatusOptionsForSelect, PRIORITY_API_VALUES } from "../data/ticketStatusGraph";
import { mapPriorityToAgentLabel, mapTicketStatusToAgentLabel } from "../mappers/agentTicketMappers";

function Section({ title, children, tone = "default" }) {
  const border =
    tone === "control"
      ? "border-indigo-200/80 bg-gradient-to-b from-indigo-50/40 to-white"
      : "border-slate-200/70 bg-white";
  return (
    <section className={`rounded-2xl border ${border} px-3 py-3.5 shadow-sm shadow-slate-200/30 sm:px-4 sm:py-4`}>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SlaMeter({ state, dueLabel }) {
  const bar =
    state === "Breached"
      ? "bg-red-500"
      : state === "At Risk"
        ? "bg-amber-400"
        : state === "Paused"
          ? "bg-slate-400 dark:bg-slate-500"
          : "bg-blue-500";
  const widthPct = state === "Breached" ? 100 : state === "At Risk" ? 78 : state === "Paused" ? 40 : 42;
  const trackTint =
    state === "Breached"
      ? "bg-red-50 dark:bg-red-950/25"
      : state === "At Risk"
        ? "bg-amber-50 dark:bg-amber-950/25"
        : state === "Paused"
          ? "bg-slate-100 dark:bg-slate-800/50"
          : "bg-blue-50 dark:bg-blue-950/25";

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[#0F172A]">{state}</span>
        <span className="text-right text-xs font-medium text-slate-500">{dueLabel}</span>
      </div>
      <div className={`mt-3 h-1.5 overflow-hidden rounded-full ${trackTint}`}>
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${widthPct}%` }} />
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Resolution target is from ticket creation. Paused = clock stopped while waiting on the customer.
      </p>
    </div>
  );
}

const priorityStyle = (code) => {
  const c = String(code || "MEDIUM").toUpperCase();
  if (c === "HIGH") return "border-rose-200/90 bg-rose-50 text-rose-900 ring-1 ring-rose-100";
  if (c === "MEDIUM") return "border-amber-200/90 bg-amber-50 text-amber-900 ring-1 ring-amber-100";
  return "border-slate-200/90 bg-slate-100 text-slate-800 ring-1 ring-slate-200/80";
};

const statusStyle = (code) => {
  const c = String(code || "NEW");
  if (c === "IN_PROGRESS") return "border-sky-200/90 bg-sky-50 text-sky-900 ring-1 ring-sky-100";
  if (c === "WAITING_FOR_CUSTOMER") return "border-amber-200/90 bg-amber-50 text-amber-900 ring-1 ring-amber-100";
  if (c === "RESOLVED") return "border-emerald-200/90 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100";
  if (c === "CLOSED") return "border-slate-300/90 bg-slate-100 text-slate-800 ring-1 ring-slate-200";
  return "border-indigo-200/90 bg-indigo-50/80 text-indigo-900 ring-1 ring-indigo-100";
};

function involvedInitials(name) {
  const s = String(name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return s.slice(0, 2).toUpperCase();
}

export default function RightRail({
  detail,
  rawTicket = null,
  attachments,
  people,
  involvedPeople = [],
  onDownloadAttachment,
  canEditMeta = false,
  /** When user confirms draft status & priority (single save). */
  onApplyMeta,
  statusSaving = false,
  prioritySaving = false,
}) {
  const statusCode = rawTicket?.status != null ? String(rawTicket.status) : "NEW";
  const priorityCode = rawTicket?.priority != null ? String(rawTicket.priority) : "MEDIUM";

  const [draftStatus, setDraftStatus] = useState(statusCode);
  const [draftPriority, setDraftPriority] = useState(priorityCode);

  useEffect(() => {
    setDraftStatus(statusCode);
    setDraftPriority(priorityCode);
  }, [statusCode, priorityCode, rawTicket?.id, detail?.id]);

  if (!detail) {
    return (
      <aside className="flex h-full min-h-0 w-[340px] shrink-0 flex-col border-l border-destrova-borderLight bg-destrova-bgLight/30 dark:border-destrova-borderDark dark:bg-slate-950/15">
        <p className="p-6 text-sm text-destrova-textSecondary">Select a ticket</p>
      </aside>
    );
  }

  const statusOptions = getAgentStatusOptionsForSelect(draftStatus);
  const saving = statusSaving || prioritySaving;
  const isDirty = draftStatus !== statusCode || draftPriority !== priorityCode;

  const resetDraft = () => {
    setDraftStatus(statusCode);
    setDraftPriority(priorityCode);
  };

  const applyChanges = () => {
    if (!onApplyMeta || !isDirty) return;
    onApplyMeta({ status: draftStatus, priority: draftPriority });
  };

  const slaDue =
    detail.slaState === "Breached"
      ? "Breached"
      : detail.slaState === "Paused"
        ? "Paused"
        : detail.slaDue || "—";

  const org = detail.organization ?? detail.customer;
  const product = detail.productName ?? "—";

  return (
    <aside className="flex h-full min-h-0 w-[300px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-slate-200/80 bg-slate-50/50 px-3 py-4 sm:w-[320px] sm:px-4">
      <Section title="Status &amp; priority" tone="control">
        <p className="text-[12px] leading-relaxed text-slate-600">
          Change selections below, then confirm to save. Transitions follow your workflow rules.
        </p>
        {!canEditMeta ? (
          <p className="mt-2 rounded-lg border border-amber-100 bg-amber-50/80 px-2.5 py-2 text-[11.5px] text-amber-900">
            Assign this ticket to yourself to change status and priority.
          </p>
        ) : null}

        <div className="mt-3 space-y-3">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Status</span>
            {canEditMeta ? (
              <select
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value)}
                disabled={saving}
                className="mt-1.5 w-full cursor-pointer rounded-xl border-2 border-sky-200/80 bg-white py-2 pl-3 pr-9 text-sm font-semibold text-sky-950 shadow-sm transition hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Change ticket status"
              >
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <span
                className={`mt-1.5 inline-flex w-full max-w-full items-center justify-center rounded-xl border-2 py-2 text-sm font-semibold ${statusStyle(statusCode)}`}
              >
                {mapTicketStatusToAgentLabel(statusCode)}
              </span>
            )}
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Priority</span>
            {canEditMeta ? (
              <select
                value={draftPriority}
                onChange={(e) => setDraftPriority(e.target.value)}
                disabled={saving}
                className="mt-1.5 w-full cursor-pointer rounded-xl border-2 border-rose-200/70 bg-white py-2 pl-3 pr-9 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-200/80 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Change ticket priority"
              >
                {PRIORITY_API_VALUES.map((p) => (
                  <option key={p} value={p}>
                    {mapPriorityToAgentLabel(p)}
                  </option>
                ))}
              </select>
            ) : (
              <span
                className={`mt-1.5 inline-flex w-full max-w-full items-center justify-center rounded-xl border-2 py-2 text-sm font-semibold ${priorityStyle(priorityCode)}`}
              >
                {mapPriorityToAgentLabel(priorityCode)}
              </span>
            )}
          </div>
        </div>

        {canEditMeta && isDirty ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-indigo-100/80 pt-3">
            <button
              type="button"
              onClick={applyChanges}
              disabled={saving}
              className="inline-flex h-9 min-w-[7.5rem] items-center justify-center rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Confirm changes"}
            </button>
            <button
              type="button"
              onClick={resetDraft}
              disabled={saving}
              className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        ) : saving ? (
          <p className="mt-2 text-[11px] font-medium text-indigo-600">Saving…</p>
        ) : null}
      </Section>

      <Section title="Details">
        <dl className="divide-y divide-slate-100/90 text-sm">
          <div className="flex items-start justify-between gap-4 py-3 first:pt-0">
            <dt className="shrink-0 font-medium text-slate-500">Customer</dt>
            <dd className="max-w-[190px] text-right font-semibold text-slate-900">{org}</dd>
          </div>
          <div className="flex items-start justify-between gap-4 py-3">
            <dt className="shrink-0 font-medium text-slate-500">Product</dt>
            <dd className="max-w-[190px] text-right font-semibold text-slate-900">{product}</dd>
          </div>
          <div className="flex justify-between gap-3 py-3 last:pb-0">
            <dt className="font-medium text-slate-500">Assignee</dt>
            <dd className="max-w-[190px] text-right font-semibold text-slate-900">
              {detail.assignee || "Unassigned"}
            </dd>
          </div>
        </dl>
      </Section>
      <Section title="SLA">
        <SlaMeter state={detail.slaState} dueLabel={slaDue} />
      </Section>
      <Section title="People">
        <ul className="space-y-4">
          {(Array.isArray(people) && people.length > 0 ? people : []).map((p) => (
            <li key={`${p.role}-${p.name}`} className="text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {p.role}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#0F172A]">{p.name}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{p.email}</p>
            </li>
          ))}
        </ul>
        {Array.isArray(involvedPeople) && involvedPeople.length > 0 ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Involved (mentions)</p>
            <ul className="mt-2 flex flex-col gap-2">
              {involvedPeople.map((p) => (
                <li
                  key={p.email}
                  className="flex items-center gap-2.5 rounded-xl border border-indigo-100/90 bg-indigo-50/50 px-2.5 py-2"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-200/80 text-[11px] font-bold text-indigo-950">
                    {involvedInitials(p.displayName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{p.displayName}</p>
                    <p className="truncate text-xs text-slate-500">{p.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>
      <Section title={attachments && attachments.length > 0 ? `Attachments (${attachments.length})` : "Attachments"}>
        <ul className="space-y-2.5">
          {(Array.isArray(attachments) && attachments.length > 0 ? attachments : []).map((a) => (
            <li
              key={a.id ?? a.name}
              className="flex items-start justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{a.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {a.size} · {a.who} · {a.when}
                </p>
              </div>
              {onDownloadAttachment && a.id != null ? (
                <button
                  type="button"
                  onClick={() => onDownloadAttachment(a.id, a.name)}
                  className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-white hover:text-blue-600"
                  title="Download"
                  aria-label={`Download ${a.name}`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M12 3v10m0 0l3.5-3.5M12 13L8.5 9.5M5 19h14"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {Array.isArray(attachments) && attachments.length === 0 ? (
          <p className="text-sm text-slate-500">No attachments on this ticket.</p>
        ) : null}
      </Section>
    </aside>
  );
}
