import { useEffect, useMemo, useRef, useState } from "react";
import { IconSearch } from "../../shared/DestrovaIcons";
import { MANAGER_TEAM_FULL, MANAGER_TICKETS } from "../data/managerMock";
import { useManagerWorkspace } from "./ManagerWorkspaceContext";

/**
 * Global search for the Manager topbar.
 *
 * Replaces the agent EnterpriseSearch when role === manager. Searches:
 *   - Tickets (id, title, customer, product, assignee)
 *   - Customers (organization names)
 *   - Agents (name, role, email)
 *
 * Click handlers route through `ManagerWorkspaceContext`:
 *   - Ticket  → openTicket(id)             → opens manager ticket detail
 *   - Customer→ navigateTo("allTickets")    → All Tickets prefiltered by customer
 *   - Agent   → focusAgent(agent.short)     → Team Workload focused on agent
 *
 * Visually: light topbar surface, no heavy borders, Ctrl/⌘+K to focus.
 * The shared keydown listener in `Topbar.jsx` focuses the input via
 * `searchInputRef`, so the same shortcut works across the workspace.
 */
export default function ManagerGlobalSearch({ inputRef }) {
  const { openTicket, navigateTo, focusAgent } = useManagerWorkspace();
  const localRef = useRef(null);
  const ref = inputRef || localRef;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep highlight in bounds when query changes
  useEffect(() => {
    setHighlight(0);
  }, [query]);

  /** Build a flat, ranked, grouped result list. */
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { tickets: [], customers: [], agents: [], flat: [] };

    const tickets = MANAGER_TICKETS
      .filter((t) =>
        t.id.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.customer || "").toLowerCase().includes(q) ||
        (t.product || "").toLowerCase().includes(q) ||
        (t.assignee || "").toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((t) => ({ kind: "ticket", id: t.id, title: t.title, sub: `${t.customer} · ${t.product}`, ticket: t }));

    const customerSet = new Set();
    const customers = [];
    for (const t of MANAGER_TICKETS) {
      if (!t.customer || customerSet.has(t.customer)) continue;
      if (t.customer.toLowerCase().includes(q)) {
        customerSet.add(t.customer);
        customers.push({ kind: "customer", id: t.customer, title: t.customer, sub: "Customer · view all tickets" });
        if (customers.length >= 4) break;
      }
    }

    const agents = MANAGER_TEAM_FULL
      .filter((u) =>
        u.name.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.short || "").toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map((u) => ({ kind: "agent", id: u.id, title: u.name, sub: `${u.role} · ${u.email}`, agent: u }));

    const flat = [...tickets, ...customers, ...agents];
    return { tickets, customers, agents, flat };
  }, [query]);

  const choose = (item) => {
    setOpen(false);
    setQuery("");
    if (!item) return;
    if (item.kind === "ticket") {
      openTicket(item.ticket.id);
    } else if (item.kind === "customer") {
      navigateTo("allTickets", { customerFilter: item.id });
    } else if (item.kind === "agent") {
      focusAgent(item.agent.id);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(0, results.flat.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (results.flat[highlight]) {
        e.preventDefault();
        choose(results.flat[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      ref.current?.blur();
    }
  };

  // Map highlight index → item by walking groups in render order
  const indexOf = (kind, i) => {
    if (kind === "ticket") return i;
    if (kind === "customer") return results.tickets.length + i;
    if (kind === "agent") return results.tickets.length + results.customers.length + i;
    return -1;
  };

  return (
    <div ref={wrapRef} className="relative w-full max-w-md min-w-[180px]">
      <div className="group flex h-10 w-full items-center gap-2 rounded-xl border border-transparent bg-[#F1F5F9] px-3 transition-[background-color,border-color,box-shadow] duration-200 ease-out focus-within:border-transparent focus-within:bg-white focus-within:shadow-[0_0_0_2px_#272757,0_4px_14px_-4px_rgba(39,39,87,0.2)]">
        <IconSearch className="h-[18px] w-[18px] shrink-0 text-slate-400 group-focus-within:text-slate-500" />
        <input
          ref={ref}
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (query) setOpen(true); }}
          onKeyDown={onKeyDown}
          placeholder="Search tickets, customers, assignees..."
          aria-label="Manager global search"
          aria-haspopup="listbox"
          aria-expanded={open}
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none ring-0"
        />
        <span className="hidden shrink-0 items-center gap-0.5 sm:flex" aria-hidden>
          <kbd className="rounded-md bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">Ctrl K</kbd>
        </span>
      </div>

      {open && query.trim() ? (
        <div
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[28rem] overflow-y-auto rounded-xl bg-white p-2 shadow-[0_24px_60px_-20px_rgba(15,14,71,0.32)] ring-1 ring-slate-900/[0.06]"
        >
          {results.flat.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500">
              No matches for <span className="font-semibold text-slate-700">"{query}"</span>
            </p>
          ) : (
            <>
              {results.tickets.length > 0 ? (
                <Group label="Tickets" hint={`${results.tickets.length}`}>
                  {results.tickets.map((item, i) => (
                    <ResultRow
                      key={`t-${item.id}`}
                      item={item}
                      active={highlight === indexOf("ticket", i)}
                      onMouseEnter={() => setHighlight(indexOf("ticket", i))}
                      onClick={() => choose(item)}
                    />
                  ))}
                </Group>
              ) : null}

              {results.customers.length > 0 ? (
                <Group label="Customers" hint={`${results.customers.length}`}>
                  {results.customers.map((item, i) => (
                    <ResultRow
                      key={`c-${item.id}`}
                      item={item}
                      active={highlight === indexOf("customer", i)}
                      onMouseEnter={() => setHighlight(indexOf("customer", i))}
                      onClick={() => choose(item)}
                    />
                  ))}
                </Group>
              ) : null}

              {results.agents.length > 0 ? (
                <Group label="Agents" hint={`${results.agents.length}`}>
                  {results.agents.map((item, i) => (
                    <ResultRow
                      key={`a-${item.id}`}
                      item={item}
                      active={highlight === indexOf("agent", i)}
                      onMouseEnter={() => setHighlight(indexOf("agent", i))}
                      onClick={() => choose(item)}
                    />
                  ))}
                </Group>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Group({ label, hint, children }) {
  return (
    <div className="mb-1 last:mb-0">
      <div className="flex items-center justify-between px-2.5 pb-1 pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <p className="text-[10px] tabular-nums text-slate-400">{hint}</p>
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function KindBadge({ kind }) {
  const map = {
    ticket:   { label: "TKT", bg: "bg-slate-100",   fg: "text-slate-700" },
    customer: { label: "CST", bg: "bg-indigo-50",   fg: "text-indigo-700" },
    agent:    { label: "AGT", bg: "bg-emerald-50",  fg: "text-emerald-700" },
  };
  const c = map[kind] || map.ticket;
  return (
    <span className={`inline-flex h-6 w-9 shrink-0 items-center justify-center rounded-md text-[10px] font-bold tracking-wide ${c.bg} ${c.fg}`}>
      {c.label}
    </span>
  );
}

function ResultRow({ item, active, onClick, onMouseEnter }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors duration-100",
        active ? "bg-slate-100" : "bg-transparent hover:bg-slate-50",
      ].join(" ")}
    >
      <KindBadge kind={item.kind} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          {item.kind === "ticket" ? <span className="mr-2 font-mono text-[11px] text-slate-500">{item.id}</span> : null}
          {item.title}
        </p>
        <p className="truncate text-[11px] text-slate-500">{item.sub}</p>
      </div>
    </button>
  );
}
