import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IconSearch } from "../../shared/DestrovaIcons";
import { getAgentCapacities, getAllTickets } from "../api/api";
import { normalizeTicketForManagerTable } from "../hooks/useManagerTicketsData";
import { enterpriseSearchField } from "../../shell/enterpriseShellTheme";
import { useManagerWorkspace } from "./ManagerWorkspaceContext";

function normalizeAgentsFromPayload(data) {
  if (!Array.isArray(data)) return [];
  return data
    .map((raw) => {
      if (raw == null || raw.agentId == null) return null;
      const agentId = raw.agentId;
      const name = raw.agentName || `Agent #${agentId}`;
      const parts = name.split(/\s+/).filter(Boolean);
      const short =
        parts.length >= 2
          ? `${parts[0][0]}. ${parts[parts.length - 1]}`
          : (parts[0] || name);
      return {
        id: String(agentId),
        name,
        role: "Agent",
        email: "",
        short,
      };
    })
    .filter(Boolean);
}

/**
 * Global search for the Manager topbar — live tickets + agent capacity only.
 */
export default function ManagerGlobalSearch({ inputRef }) {
  const { t } = useTranslation("manager");
  const { openTicket, navigateTo, focusAgent } = useManagerWorkspace();
  const localRef = useRef(null);
  const ref = inputRef || localRef;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);
  const [tickets, setTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [indexError, setIndexError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAllTickets(), getAgentCapacities()])
      .then(([ticketPayload, capacityPayload]) => {
        if (cancelled) return;
        const rows = Array.isArray(ticketPayload) ? ticketPayload : [];
        setTickets(rows.map((row) => normalizeTicketForManagerTable(row)));
        setAgents(normalizeAgentsFromPayload(capacityPayload));
        setIndexError(false);
      })
      .catch(() => {
        if (!cancelled) {
          setTickets([]);
          setAgents([]);
          setIndexError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { tickets: [], customers: [], agents: [], flat: [] };

    const ticketHits = tickets
      .filter((t) =>
        String(t.id).toLowerCase().includes(q) ||
        String(t.displayId || "").toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.customer || "").toLowerCase().includes(q) ||
        (t.product || "").toLowerCase().includes(q) ||
        (t.assignee || "").toLowerCase().includes(q),
      )
      .slice(0, 5)
      .map((t) => ({
        kind: "ticket",
        id: t.id,
        title: t.title,
        sub: `${t.customer} · ${t.product}`,
        ticket: t,
      }));

    const customerSet = new Set();
    const customers = [];
    for (const t of tickets) {
      if (!t.customer || customerSet.has(t.customer)) continue;
      if (t.customer.toLowerCase().includes(q)) {
        customerSet.add(t.customer);
        customers.push({ kind: "customer", id: t.customer, title: t.customer, sub: t("search.customerSub") });
        if (customers.length >= 4) break;
      }
    }

    const agentHits = agents
      .filter((u) =>
        u.name.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.short || "").toLowerCase().includes(q),
      )
      .slice(0, 4)
      .map((u) => ({
        kind: "agent",
        id: u.id,
        title: u.name,
        sub: `${u.role}${u.email ? ` · ${u.email}` : ""}`,
        agent: u,
      }));

    const flat = [...ticketHits, ...customers, ...agentHits];
    return { tickets: ticketHits, customers, agents: agentHits, flat };
  }, [query, tickets, agents, t]);

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

  const indexOf = (kind, i) => {
    if (kind === "ticket") return i;
    if (kind === "customer") return results.tickets.length + i;
    if (kind === "agent") return results.tickets.length + results.customers.length + i;
    return -1;
  };

  return (
    <div ref={wrapRef} className="relative w-full max-w-md min-w-[180px]">
      <div className={enterpriseSearchField}>
        <IconSearch className="h-[18px] w-[18px] shrink-0 text-slate-400 group-focus-within:text-slate-500" />
        <input
          ref={ref}
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (query) setOpen(true); }}
          onKeyDown={onKeyDown}
          placeholder={t("search.placeholder")}
          aria-label={t("search.placeholder")}
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
          aria-label={t("search.resultsAria")}
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[28rem] overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-lg ring-1 ring-slate-900/[0.04]"
        >
          {indexError ? (
            <p className="px-3 py-6 text-center text-sm text-red-700" role="alert">
              {t("search.loadFailed")}
            </p>
          ) : results.flat.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500">
              {t("search.noMatches", { query })}
            </p>
          ) : (
            <>
              {results.tickets.length > 0 ? (
                <Group label={t("search.groups.tickets")} hint={`${results.tickets.length}`}>
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
                <Group label={t("search.groups.customers")} hint={`${results.customers.length}`}>
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
                <Group label={t("search.groups.agents")} hint={`${results.agents.length}`}>
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
    ticket:   { label: "TKT", bg: "bg-slate-100",  fg: "text-slate-700" },
    customer: { label: "CST", bg: "bg-blue-50",    fg: "text-blue-700" },
    agent:    { label: "AGT", bg: "bg-slate-100",  fg: "text-slate-600" },
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
        active ? "bg-blue-50/80 ring-1 ring-inset ring-blue-200/60" : "bg-transparent hover:bg-slate-50",
      ].join(" ")}
    >
      <KindBadge kind={item.kind} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          {item.kind === "ticket" ? <span className="mr-2 font-mono text-[11px] text-slate-500">{item.ticket.displayId || item.id}</span> : null}
          {item.title}
        </p>
        <p className="truncate text-[11px] text-slate-500">{item.sub}</p>
      </div>
    </button>
  );
}
