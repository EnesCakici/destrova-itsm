import { useEffect, useMemo, useRef, useState } from "react";
import { IconSearch } from "../../shared/DestrovaIcons";
import {
  ADMIN_PRODUCTS,
  ADMIN_USERS,
} from "../data/adminMock";
import { useAdminWorkspace } from "./AdminWorkspaceContext";

/**
 * Global search for the Admin topbar.
 *
 * Searches users and products. Tickets are intentionally NOT exposed to admins
 * because admin is non-operational; ticket search lives on the manager surface.
 *
 * Click handlers route through `useAdminWorkspace()`:
 *   - User       → Users & Roles, drawer pre-opened on the user
 *   - Product    → Products / Catalog, drawer pre-opened on the product
 */
export default function AdminGlobalSearch({ inputRef }) {
  const { navigateTo, selectEntity, openModal } = useAdminWorkspace();
  const localRef = useRef(null);
  const ref = inputRef || localRef;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => { setHighlight(0); }, [query]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { users: [], products: [], flat: [] };

    const users = ADMIN_USERS
      .filter((u) =>
        u.name.toLowerCase().includes(q)
        || u.email.toLowerCase().includes(q)
        || u.role.toLowerCase().includes(q)
        || u.department.toLowerCase().includes(q),
      )
      .slice(0, 5)
      .map((u) => ({ kind: "user", id: u.id, title: u.name, sub: `${u.role} · ${u.email}`, payload: u }));

    const products = ADMIN_PRODUCTS
      .filter((p) =>
        p.name.toLowerCase().includes(q)
        || (p.description || "").toLowerCase().includes(q),
      )
      .slice(0, 4)
      .map((p) => ({ kind: "product", id: p.id, title: p.name, sub: `${p.status} · ${p.versions.length} versions`, payload: p }));

    const flat = [...users, ...products];
    return { users, products, flat };
  }, [query]);

  const choose = (item) => {
    setOpen(false);
    setQuery("");
    if (!item) return;
    if (item.kind === "user") {
      selectEntity("user", item.id, item.payload);
      navigateTo("usersRoles");
      openModal("editUser", { userId: item.id });
    } else if (item.kind === "product") {
      selectEntity("product", item.id, item.payload);
      navigateTo("productsCatalog");
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
      if (results.flat[highlight]) { e.preventDefault(); choose(results.flat[highlight]); }
    } else if (e.key === "Escape") {
      setOpen(false);
      ref.current?.blur();
    }
  };

  const indexOf = (kind, i) => {
    if (kind === "user") return i;
    if (kind === "product") return results.users.length + i;
    return -1;
  };

  return (
    <div ref={wrapRef} className="relative w-full max-w-md min-w-[180px]">
      <div className="group flex h-10 w-full items-center gap-2 rounded-xl border border-slate-200/70 bg-[#F1F5F9] px-3 transition-[background-color,border-color,box-shadow] duration-200 ease-out focus-within:border-slate-300 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(80,80,129,0.18),0_4px_14px_-4px_rgba(39,39,87,0.18)]">
        <IconSearch className="h-[18px] w-[18px] shrink-0 text-slate-400 group-focus-within:text-slate-500" />
        <input
          ref={ref}
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (query) setOpen(true); }}
          onKeyDown={onKeyDown}
          placeholder="Search users, products…"
          aria-label="Admin global search"
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
              {results.users.length > 0 ? (
                <Group label="Users" hint={`${results.users.length}`}>
                  {results.users.map((item, i) => (
                    <ResultRow key={`u-${item.id}`} item={item} active={highlight === indexOf("user", i)}
                      onMouseEnter={() => setHighlight(indexOf("user", i))} onClick={() => choose(item)} />
                  ))}
                </Group>
              ) : null}
              {results.products.length > 0 ? (
                <Group label="Products" hint={`${results.products.length}`}>
                  {results.products.map((item, i) => (
                    <ResultRow key={`p-${item.id}`} item={item} active={highlight === indexOf("product", i)}
                      onMouseEnter={() => setHighlight(indexOf("product", i))} onClick={() => choose(item)} />
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
    user:    { label: "USR", bg: "bg-slate-100",  fg: "text-slate-700" },
    product: { label: "PRD", bg: "bg-indigo-50",  fg: "text-indigo-700" },
  };
  const c = map[kind] || map.user;
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
        <p className="truncate text-sm font-semibold text-slate-800">{item.title}</p>
        <p className="truncate text-[11px] text-slate-500">{item.sub}</p>
      </div>
    </button>
  );
}
