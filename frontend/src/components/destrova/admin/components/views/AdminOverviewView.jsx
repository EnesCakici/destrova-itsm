//Dashboard → AdminOverviewView.jsx

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminCard,
  AdminSurface,
} from "../AdminPrimitives";
import AdminHealthIndicator from "../AdminHealthIndicator";
import { useAdminWorkspace } from "../AdminWorkspaceContext";
import { getActiveTicketCount, getAdminProducts, getAdminUsers, getApiErrorMessage } from "../../../../../services/api";

const KPI_CARD_CLASS =
  "rounded-[14px] border border-gray-200 bg-white shadow-sm";

function normalizeRoleKey(role) {
  const r = String(role ?? "").toUpperCase();
  if (r === "AGENT") return "Agent";
  if (r === "MANAGER") return "Manager";
  if (r === "ADMIN") return "Admin";
  return "Customer";
}

function isActiveUserStatus(status) {
  if (status == null || String(status).trim() === "") return true;
  return String(status).trim().toLowerCase() === "active";
}

/**
 * Overview — canlı kullanıcı, ürün ve aktif ticket özeti.
 */
export default function AdminOverviewView() {
  const { navigateTo } = useAdminWorkspace();
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTickets, setActiveTickets] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [userList, productList, ticketPayload] = await Promise.all([
        getAdminUsers(),
        getAdminProducts(),
        getActiveTicketCount(),
      ]);
      setUsers(Array.isArray(userList) ? userList : []);
      setProducts(Array.isArray(productList) ? productList : []);
      const n = ticketPayload?.activeTickets;
      setActiveTickets(typeof n === "number" ? n : Number(n) || 0);
    } catch (e) {
      setUsers([]);
      setProducts([]);
      setActiveTickets(0);
      setError(getApiErrorMessage(e, "Overview verileri yüklenemedi."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalUsers = users.length;
  const activeAgents = useMemo(
    () =>
      users.filter(
        (u) => normalizeRoleKey(u.role) === "Agent" && isActiveUserStatus(u.status),
      ).length,
    [users],
  );
  const activeProducts = useMemo(
    () => products.filter((p) => p?.isActive !== false).length,
    [products],
  );

  const stats = [
    { id: "users", label: "Total users", value: totalUsers, hint: "Across all roles", target: "usersRoles" },
    { id: "agents", label: "Active agents", value: activeAgents, hint: "Active status", target: "usersRoles" },
    { id: "tickets", label: "Active tickets", value: activeTickets, hint: "All except CLOSED", target: null },
    { id: "products", label: "Active products", value: activeProducts, hint: "Catalog items marked active", target: "productsCatalog" },
  ];

  const fmt = (n) => (loading ? "…" : n);

  return (
    <AdminSurface
      eyebrow="Admin"
      title="Overview"
      description={
        loading
          ? "Loading snapshot…"
          : error
            ? error
            : "Live counts from users, tickets, and products. Cards link to the related configuration area where applicable."
      }
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
          Platform status
        </p>
        <AdminHealthIndicator />
      </div>

      {error && !loading ? (
        <AdminCard
          tone="default"
          padding="p-4 md:p-5"
          topAccent={false}
          className="mb-4 border border-red-200 bg-red-50/60"
        >
          <p className="text-sm font-medium text-red-800">{error}</p>
          <p className="mt-2 text-xs text-red-700/90">
            Sayfayı yenileyin veya oturumunuzun Admin rolüne sahip olduğundan emin olun.
          </p>
        </AdminCard>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const clickable = Boolean(s.target);
          return (
            <AdminCard
              key={s.id}
              tone="default"
              topAccent={false}
              elevated
              interactive={clickable}
              padding="p-5 md:p-6"
              className={[
                KPI_CARD_CLASS,
                clickable ? "text-left transition-shadow duration-150 hover:shadow-md" : "",
              ].join(" ").trim()}
              as={clickable ? "button" : "section"}
              onClick={clickable ? () => navigateTo(s.target) : undefined}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                {s.label}
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-blue-600 md:text-[2rem]">
                {fmt(s.value)}
              </p>
              <p className="mt-1 text-xs text-gray-500">{s.hint}</p>
              {clickable ? (
                <p className="mt-3 text-[11px] font-semibold text-blue-600">View details →</p>
              ) : null}
            </AdminCard>
          );
        })}
      </section>
    </AdminSurface>
  );
}
