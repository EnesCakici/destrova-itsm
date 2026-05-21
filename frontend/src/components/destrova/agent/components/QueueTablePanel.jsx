import { useEffect, useMemo, useState } from "react";
import { MOCK_TICKETS, TICKET_STATUSES } from "../data/mockData";
import { isTicketActive } from "../data/workspaceModel";

const PRIORITIES = ["High", "Medium", "Low"];
const priorityWeight = { High: 3, Medium: 2, Low: 1 };
const statusWeight = { New: 1, "In Progress": 2, "Waiting for Customer": 3, Resolved: 4, Closed: 5 };
const slaWeight = { Safe: 1, Paused: 2, "At Risk": 3, Breached: 4 };

function selectClass() {
  return "h-7 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200";
}

function sortHeaderClass(active) {
  return `inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${active ? "text-slate-800" : "text-slate-500 hover:text-slate-700"}`;
}

function slaVisual(state) {
  if (state === "Breached") return { bar: "bg-red-500", dot: "bg-red-500", width: 100, label: "Breached" };
  if (state === "At Risk") return { bar: "bg-amber-500", dot: "bg-amber-500", width: 72, label: "At Risk" };
  if (state === "Paused") return { bar: "bg-slate-500", dot: "bg-slate-500", width: 35, label: "Paused" };
  return { bar: "bg-blue-500", dot: "bg-blue-500", width: 42, label: "Safe" };
}

function SortTh({ label, sortKey, activeKey, dir, onSort }) {
  const active = sortKey === activeKey;
  return (
    <th className="whitespace-nowrap px-2 py-2">
      <button type="button" onClick={() => onSort(sortKey)} className={sortHeaderClass(active)}>
        {label}
        <span className="text-slate-400">{active ? (dir === "asc" ? "▲" : "▼") : "◇"}</span>
      </button>
    </th>
  );
}

function compare(a, b, key, dir) {
  const mul = dir === "asc" ? 1 : -1;
  if (key === "priority") return ((priorityWeight[a.priority] || 0) - (priorityWeight[b.priority] || 0)) * mul;
  if (key === "status") return ((statusWeight[a.status] || 0) - (statusWeight[b.status] || 0)) * mul;
  if (key === "slaState") return ((slaWeight[a.slaState] || 0) - (slaWeight[b.slaState] || 0)) * mul;
  if (key === "updatedRank") return ((a.updatedRank || 0) - (b.updatedRank || 0)) * mul;
  return 0;
}

/**
 * @param {"page" | "split"} variant
 * @param {(id: string) => void} [onOpenTicket] page mode: navigate to workspace
 * @param {string} [selectedId] split mode
 * @param {(id: string) => void} [onSelectId] split mode
 */
export default function DestrovaQueueTablePanel({ variant = "page", selectedId, onSelectId, onOpenTicket }) {
  const [queueTab, setQueueTab] = useState("assigned");
  const [activityTab, setActivityTab] = useState("active");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [assignOverride, setAssignOverride] = useState({});
  const [sortKey, setSortKey] = useState("slaState");
  const [sortDir, setSortDir] = useState("desc");
  const isManagerView = true;

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const rows = useMemo(() => {
    let list = MOCK_TICKETS.map((t) => ({
      ...t,
      assignee: assignOverride[t.id] !== undefined ? assignOverride[t.id] : t.assignee,
      productName: t.productName || "Destrova",
      updatedRank: t.updatedRank ?? 0,
    }));

    if (queueTab === "assigned") {
      list = list.filter((t) => t.assignee === "You");
    } else if (queueTab === "unassigned") {
      list = list.filter((t) => !t.assignee);
    } else if (queueTab === "all" && !isManagerView) {
      list = list.filter((t) => t.assignee === "You");
    }

    if (activityTab === "active") {
      list = list.filter(isTicketActive);
    } else {
      list = list.filter((t) => t.status === "Closed");
    }

    if (statusFilter !== "All") list = list.filter((t) => t.status === statusFilter);
    if (priorityFilter !== "All") list = list.filter((t) => t.priority === priorityFilter);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          (t.customer && t.customer.toLowerCase().includes(q)) ||
          (t.productName && t.productName.toLowerCase().includes(q)),
      );
    }

    return [...list].sort((a, b) => compare(a, b, sortKey, sortDir));
  }, [
    queueTab,
    isManagerView,
    activityTab,
    search,
    statusFilter,
    priorityFilter,
    assignOverride,
    sortKey,
    sortDir,
  ]);

  useEffect(() => {
    if (variant !== "split" || !onSelectId) return;
    if (rows.length && selectedId && !rows.some((r) => r.id === selectedId)) {
      onSelectId(rows[0].id);
    }
  }, [variant, rows, selectedId, onSelectId]);

  const pickRow = (id) => {
    if (variant === "split" && onSelectId) onSelectId(id);
    else if (variant === "page" && onOpenTicket) onOpenTicket(id);
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setQueueTab("assigned")}
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${queueTab === "assigned" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            Assigned to me
          </button>
          <button
            type="button"
            onClick={() => setQueueTab("unassigned")}
            className={`rounded-md px-2.5 py-1 text-[10px] font-semibold tracking-wide ${queueTab === "unassigned" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            Unassigned
          </button>
          {isManagerView ? (
            <button
              type="button"
              onClick={() => setQueueTab("all")}
              className={`rounded-md px-2.5 py-1 text-[10px] font-semibold tracking-wide ${queueTab === "all" ? "bg-blue-00 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              All
            </button>
          ) : null}
          <span className="mx-0.5 h-4 w-px bg-slate-200" />
          <button
            type="button"
            onClick={() => setActivityTab("active")}
            className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${activityTab === "active" ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            Active tickets
          </button>
          <button
            type="button"
            onClick={() => setActivityTab("closed")}
            className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${activityTab === "closed" ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            Closed tickets
          </button>
        </div>
        
        <div className="flex gap-1.5">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ID, title, customer, product"
            className="h-7 w-full rounded-md border border-slate-200 px-2 text-[11px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass()} aria-label="Status">
            <option>All</option>
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={selectClass()} aria-label="Priority">
            <option>All</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="whitespace-nowrap px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">ID</th>
              <th className="whitespace-nowrap px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Title</th>
              <th className="whitespace-nowrap px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Customer</th>
              <th className="whitespace-nowrap px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Product</th>
              <SortTh label="Priority" sortKey="priority" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Status" sortKey="status" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="SLA" sortKey="slaState" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Updated" sortKey="updatedRank" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
              <th className="whitespace-nowrap px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                  No tickets match filters.
                </td>
              </tr>
            ) : (
              rows.map((t, idx) => {
                const selected = variant === "split" && selectedId === t.id;
                const sla = slaVisual(t.slaState);
                return (
                  <tr
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => pickRow(t.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        pickRow(t.id);
                      }
                    }}
                    className={[
                      "cursor-pointer border-b border-slate-100 transition-colors",
                      idx % 2 === 1 ? "bg-slate-50/40" : "",
                      selected ? "bg-blue-50 ring-1 ring-inset ring-blue-400" : "hover:bg-blue-50/40",
                    ].join(" ")}
                  >
                    <td className="whitespace-nowrap px-2 py-1.5 font-mono text-[11px] font-semibold text-slate-700">{t.id}</td>
                    <td className="max-w-[10rem] truncate px-2 py-1.5 font-medium text-slate-800" title={t.title}>
                      {t.title}
                    </td>
                    <td className="max-w-[7rem] truncate px-2 py-1.5 text-slate-600" title={t.customer}>
                      {t.customer}
                    </td>
                    <td className="max-w-[8rem] truncate px-2 py-1.5 text-slate-600" title={t.productName}>
                      {t.productName}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-slate-700">{t.priority}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-slate-700">{t.status}</td>
                    <td className="px-2 py-1.5">
                      <div className="min-w-[8rem]">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${sla.dot}`} />
                          <span className="text-[11px] font-semibold text-slate-800">{sla.label}</span>
                        </div>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-200">
                          <div className={`h-full rounded-full ${sla.bar}`} style={{ width: `${sla.width}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-[11px] text-slate-500">{t.updatedAt}</td>
                    <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 hover:bg-blue-50"
                          onClick={() => setAssignOverride((o) => ({ ...o, [t.id]: "You" }))}
                        >
                          Assign to me
                        </button>
                        <select defaultValue={t.status} className="h-6 rounded border border-slate-200 bg-white px-1 text-[10px] text-slate-700" aria-label="Change status">
                          {TICKET_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
