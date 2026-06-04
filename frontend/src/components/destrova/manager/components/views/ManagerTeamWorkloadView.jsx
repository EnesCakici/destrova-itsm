import { useEffect, useMemo, useRef, useState } from "react";
import { updateAgentLimit, transferAllTickets } from "../../api/api";
import { useManagerTeamWorkloadData } from "../../hooks/useManagerTeamWorkloadData";
import { MANAGER_CHROME, MANAGER_COLORS, MANAGER_STATUS, SAAS_BUTTON } from "../../managerTokens";
import ManagerCard, { ManagerCardHeader } from "../ManagerCard";
import ManagerSurface from "../ManagerSurface";
import { useManagerWorkspace } from "../ManagerWorkspaceContext";

/* ── Helpers ──────────────────────────────────────────────────────────── */

function initials(name) {
  return name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

function loadKind(pct) {
  if (pct >= 90) return "breached";
  if (pct >= 70) return "atRisk";
  return "safe";
}

function loadLabel(pct) {
  if (pct >= 90) return "Overloaded";
  if (pct >= 70) return "Busy";
  return "Normal";
}

/* ── Icons ────────────────────────────────────────────────────────────── */
function IconSearch({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M13 13l-2.5-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function IconArrowRight({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconExchange({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 5h9l-2-2M13 11H4l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Workload row ────────────────────────────────────────────────────── */

function StatePill({ pct }) {
  const kind = loadKind(pct);
  const fg = MANAGER_STATUS[kind].fg;
  const bg = MANAGER_STATUS[kind].bg;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-tight"
      style={{ color: fg, backgroundColor: bg }}
    >
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: fg }} />
      {loadLabel(pct)}
    </span>
  );
}

function WorkloadRow({ user, focused, onViewTickets, onEditLimit }) {
  const pct = Math.min(100, Math.round((user.load / user.capacity) * 100));
  const kind = loadKind(pct);
  const accent = MANAGER_STATUS[kind].fg;

  return (
    <div
      className={[
        "grid grid-cols-1 items-center gap-4 rounded-xl border px-4 py-4 transition-colors duration-150 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.8fr)_auto] md:px-5",
        focused ? "border-blue-200 bg-blue-50/50" : "border-transparent hover:bg-slate-50",
      ].join(" ")}
    >
      {/* Identity */}
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-gray-800"
        >
          {initials(user.name)}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold" style={{ color: MANAGER_COLORS.dark }}>{user.name}</p>
            <StatePill pct={pct} />
          </div>
          <p className="truncate text-xs" style={{ color: MANAGER_COLORS.muted }}>{user.role} · {user.email}</p>
        </div>
      </div>

      {/* Load */}
      <div>
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="tabular-nums" style={{ color: MANAGER_COLORS.muted }}>
            <span className="font-semibold" style={{ color: MANAGER_COLORS.dark }}>{user.load}</span>
            <span> / {user.capacity} active</span>
          </span>
          <span className="text-2xl font-semibold tabular-nums" style={{ color: accent }}>{pct}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: MANAGER_CHROME.trackBg }}>
          <div
            className="h-full rounded-full transition-[width] duration-200"
            style={{ width: `${pct}%`, backgroundColor: accent }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <button
          type="button"
          onClick={() => onEditLimit(user)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm transition-colors duration-150 hover:bg-slate-50"
        >
          Edit limit
        </button>
        <button
          type="button"
          onClick={() => onViewTickets(user)}
          className={SAAS_BUTTON.primarySm}
        >
          View tickets
          <IconArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ── Bulk Transfer panel ──────────────────────────────────────────── */

function BulkTransferPanel({ agents, refetch }) {
  const [source, setSource]   = useState("");
  const [target, setTarget]   = useState("");
  const [confirm, setConfirm] = useState(null);            // { sourceUser, targetUser, count }
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState(null);
  const [bulkSuccess, setBulkSuccess] = useState(null);

  const sourceOptions = useMemo(
    () => agents.filter((u) => u.id !== target),
    [agents, target],
  );
  const targetOptions = useMemo(
    () => agents.filter((u) => u.id !== source),
    [agents, source],
  );

  const sourceUser = agents.find((u) => u.id === source);
  const targetUser = agents.find((u) => u.id === target);

  const matchCount = sourceUser ? sourceUser.load : 0;

  const valid = source && target && source !== target && matchCount > 0;

  const submit = () => {
    if (!valid) return;
    setBulkError(null);
    setBulkSuccess(null);
    setConfirm({ sourceUser, targetUser, count: matchCount });
  };

  const apply = async () => {
    if (!confirm) return;
    setBulkSaving(true);
    setBulkError(null);
    setBulkSuccess(null);
    try {
      const fromId = confirm.sourceUser.agentId ?? confirm.sourceUser.id;
      const toId = confirm.targetUser.agentId ?? confirm.targetUser.id;
      await transferAllTickets(fromId, toId);
      await refetch();
      setBulkSuccess("Tickets transferred successfully.");
      setConfirm(null);
      setSource("");
      setTarget("");
    } catch (e) {
      const msg = e?.response?.data?.message ?? e?.message ?? "Transfer failed.";
      setBulkError(String(msg));
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <ManagerCard padding="p-6 md:p-7" tone="primary" elevated>
      <ManagerCardHeader
        title="Bulk transfer"
        hint="Transfers all active tickets from the source agent to the target agent."
      />

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <BulkSelect
          label="From agent"
          value={source}
          onChange={setSource}
          options={[{ value: "", label: "— Select source —" }, ...sourceOptions.map((u) => ({ value: u.id, label: `${u.name} · ${u.short}` }))]}
        />
        <BulkSelect
          label="To agent"
          value={target}
          onChange={setTarget}
          options={[{ value: "", label: "— Select target —" }, ...targetOptions.map((u) => ({ value: u.id, label: `${u.name} · ${u.short}` }))]}
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-[11px] leading-relaxed" style={{ color: MANAGER_COLORS.support }}>
          Transfers all active tickets from the source agent to the target agent.{" "}
          {sourceUser && targetUser && source !== target ? (
            <>
              <span className="font-semibold" style={{ color: MANAGER_COLORS.dark }}>
                {matchCount} active ticket{matchCount === 1 ? "" : "s"}
              </span>{" "}
              will move from {sourceUser.short} to {targetUser.short}.
            </>
          ) : null}
        </p>
        <button
          type="button"
          disabled={!valid}
          onClick={submit}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold tracking-tight transition-[background-color,color,opacity] duration-150"
          style={{
            color: valid ? MANAGER_COLORS.surface : MANAGER_COLORS.muted,
            backgroundColor: valid ? MANAGER_COLORS.primary : MANAGER_CHROME.pillTray,
            opacity: valid ? 1 : 0.7,
            cursor: valid ? "pointer" : "not-allowed",
          }}
        >
          <IconExchange className="h-4 w-4" />
          Transfer {matchCount > 0 && valid ? `${matchCount}` : ""}
        </button>
      </div>

      {bulkSuccess && !confirm ? (
        <p className="mt-3 text-sm font-semibold" style={{ color: MANAGER_STATUS.safe.fg }} role="status">
          {bulkSuccess}
        </p>
      ) : null}

      {confirm ? (
        <div
          className="mt-5 rounded-xl px-4 py-4"
          style={{
            backgroundColor: MANAGER_STATUS.atRisk.bg,
            color: MANAGER_COLORS.dark,
            boxShadow: "0 0 0 1px rgba(165,100,0,0.18) inset",
          }}
        >
          <p className="text-sm font-semibold">Confirm bulk transfer</p>
          <p className="mt-1 text-xs" style={{ color: MANAGER_COLORS.support }}>
            Move <span className="font-semibold" style={{ color: MANAGER_COLORS.dark }}>{confirm.count}</span> open
            ticket{confirm.count === 1 ? "" : "s"} from{" "}
            <span className="font-semibold" style={{ color: MANAGER_COLORS.dark }}>{confirm.sourceUser.name}</span>{" "}
            to{" "}
            <span className="font-semibold" style={{ color: MANAGER_COLORS.dark }}>{confirm.targetUser.name}</span>.
          </p>
          {bulkError && confirm ? (
            <p className="mt-2 text-xs" style={{ color: MANAGER_STATUS.breached.fg }} role="alert">
              {bulkError}
            </p>
          ) : null}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={apply}
              disabled={bulkSaving}
              className={`${SAAS_BUTTON.primarySm} disabled:opacity-60`}
            >
              {bulkSaving ? "Transferring..." : "Confirm transfer"}
            </button>
            <button
              type="button"
              onClick={() => { if (!bulkSaving) { setConfirm(null); setBulkError(null); } }}
              disabled={bulkSaving}
              className="inline-flex h-8 items-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-800 transition-opacity duration-150 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </ManagerCard>
  );
}

function BulkSelect({ className = "", label, value, options, onChange }) {
  return (
    <label className={`flex flex-col gap-1.5 text-xs ${className || ""}`} style={{ color: MANAGER_COLORS.muted }}>
      <span className="font-semibold uppercase tracking-[0.14em]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(37,99,235,0.22)]"
        style={{
          color: MANAGER_COLORS.dark,
          boxShadow: MANAGER_CHROME.inputInset,
        }}
      >
        {options.map((opt) => (
          <option key={opt.value || "_empty"} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}

/* ── View ──────────────────────────────────────────────────────────── */

export default function ManagerTeamWorkloadView() {
  const { agentFocusId, navigateTo, setAssigneeFilter } = useManagerWorkspace();
  const { agents, loading, error, refetch } = useManagerTeamWorkloadData();
  const [query, setQuery] = useState("");
  const [editingLimitFor, setEditingLimitFor] = useState(null);
  const [limitDraft, setLimitDraft] = useState("");
  const [limitSaving, setLimitSaving] = useState(false);
  const [limitError, setLimitError] = useState(null);
  const focusRowRef = useRef(null);

  const sorted = useMemo(
    () => [...agents].sort((a, b) => b.load / b.capacity - a.load / a.capacity),
    [agents],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((u) =>
      u.name.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.short || "").toLowerCase().includes(q),
    );
  }, [sorted, query]);

  // Scroll focused agent into view (e.g. when arriving from global search)
  useEffect(() => {
    if (!agentFocusId) return;
    const id = setTimeout(() => focusRowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
    return () => clearTimeout(id);
  }, [agentFocusId]);

  const overloaded = sorted.filter((u) => u.load / u.capacity >= 0.9);
  const totalLoad = sorted.reduce((a, u) => a + u.load, 0);

  const saveAgentLimit = async () => {
    if (!editingLimitFor) return;
    const parsed = Number(limitDraft);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
      setLimitError("Enter a whole number 1 or greater.");
      return;
    }
    const agentId = editingLimitFor.agentId != null ? editingLimitFor.agentId : editingLimitFor.id;
    setLimitSaving(true);
    setLimitError(null);
    try {
      await updateAgentLimit(agentId, parsed);
      await refetch();
      setEditingLimitFor(null);
      setLimitDraft("");
    } catch (e) {
      const msg = e?.response?.data?.message ?? e?.message ?? "Could not update limit.";
      setLimitError(String(msg));
    } finally {
      setLimitSaving(false);
    }
  };

  return (
    <ManagerSurface
      eyebrow="People"
      title="Team workload"
      description="Capacity per agent across active assignments. Use bulk transfer to rebalance the desk."
    >
      {/* Snapshot KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ManagerCard padding="p-6" tone="primary" interactive>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: MANAGER_COLORS.muted }}>Active agents</p>
          <p className="mt-4 text-[34px] font-semibold leading-none tracking-tight tabular-nums md:text-[40px]" style={{ color: MANAGER_COLORS.dark }}>{sorted.length}</p>
        </ManagerCard>
        <ManagerCard padding="p-6" tone="neutral" interactive>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: MANAGER_COLORS.muted }}>Total load</p>
          <p className="mt-4 text-[34px] font-semibold leading-none tracking-tight tabular-nums md:text-[40px]" style={{ color: MANAGER_COLORS.dark }}>
            {totalLoad}
          </p>
        </ManagerCard>
        <ManagerCard padding="p-6" tone={overloaded.length ? "breached" : "primary"} interactive>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: MANAGER_COLORS.muted }}>Overloaded</p>
          <p
            className="mt-4 text-[34px] font-semibold leading-none tracking-tight tabular-nums md:text-[40px]"
            style={{ color: overloaded.length ? MANAGER_STATUS.breached.fg : MANAGER_COLORS.primary }}
          >
            {overloaded.length}
          </p>
        </ManagerCard>
      </section>

      {/* Bulk transfer panel */}
      <BulkTransferPanel
        agents={agents}
        refetch={refetch}
      />

      {/* Agent list */}
      <ManagerCard padding="p-5 md:p-6" elevated className="border border-gray-200 bg-white">
        <div className="flex flex-col gap-4">
          <ManagerCardHeader
            title="Agents"
            hint={`${visible.length} of ${sorted.length} agent${sorted.length === 1 ? "" : "s"}${query ? ` · matching "${query}"` : ""}`}
          />

          <div className="relative max-w-md">
            <IconSearch
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
              style={{ color: MANAGER_COLORS.muted }}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search agents — name, role, email"
              aria-label="Search team workload"
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm font-medium outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(37,99,235,0.22)]"
              style={{
                color: MANAGER_COLORS.dark,
                boxShadow: MANAGER_CHROME.inputInset,
              }}
            />
          </div>

          <ul className="-mx-1" aria-busy={loading || limitSaving || !!error}>
            {visible.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm" style={{ color: MANAGER_COLORS.support }}>
                No agents match "{query}".
              </li>
            ) : null}
            {visible.map((u, i) => {
              const focused = u.id === agentFocusId;
              return (
                <li
                  key={u.id}
                  ref={focused ? focusRowRef : undefined}
                  style={{
                    borderTop: i === 0 ? "none" : `1px solid ${MANAGER_COLORS.hairline}`,
                  }}
                >
                  <WorkloadRow
                    user={u}
                    focused={focused}
                    onEditLimit={(user) => {
                      setEditingLimitFor(user);
                      setLimitDraft(String(user.capacity));
                      setLimitError(null);
                    }}
                    onViewTickets={(user) => {
                      const raw = user.agentId ?? user.id;
                      const n = raw != null && raw !== "" ? Number(raw) : NaN;
                      setAssigneeFilter(Number.isFinite(n) ? n : null);
                      navigateTo("allTickets");
                    }}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </ManagerCard>

      {editingLimitFor ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="team-workload-limit-title"
        >
          <div
            className="absolute inset-0 cursor-default bg-slate-900/40"
            onClick={() => { if (!limitSaving) { setEditingLimitFor(null); setLimitDraft(""); setLimitError(null); } }}
            aria-hidden
          />
          <div
            className="relative z-10 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <ManagerCard padding="p-5" tone="muted" topAccent={false} elevated>
              <p id="team-workload-limit-title" className="text-sm font-semibold" style={{ color: MANAGER_COLORS.dark }}>Update agent limit</p>
              <p className="mt-1 text-sm" style={{ color: MANAGER_COLORS.support }}>{editingLimitFor.name}</p>
              <div className="mt-3 flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: MANAGER_COLORS.muted }}>Max tickets</label>
                <input
                  type="number"
                  min={1}
                  value={limitDraft}
                  onChange={(e) => { setLimitDraft(e.target.value); setLimitError(null); }}
                  disabled={limitSaving}
                  aria-label="Max ticket limit"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold tabular-nums outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(37,99,235,0.22)] disabled:opacity-60"
                  style={{
                    color: MANAGER_COLORS.dark,
                    boxShadow: MANAGER_CHROME.inputInset,
                  }}
                />
                {limitError ? (
                  <p className="text-xs" style={{ color: MANAGER_STATUS.breached.fg }} role="alert">{limitError}</p>
                ) : null}
                <div className="mt-1 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={saveAgentLimit}
                    disabled={limitSaving}
                    className={`${SAAS_BUTTON.primarySm} disabled:opacity-60`}
                  >
                    {limitSaving ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingLimitFor(null); setLimitDraft(""); setLimitError(null); }}
                    disabled={limitSaving}
                    className="inline-flex h-8 items-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-800 transition-opacity duration-150 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </ManagerCard>
          </div>
        </div>
      ) : null}
    </ManagerSurface>
  );
}
