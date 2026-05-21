//Dashboard → AdminOverviewView.jsx

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminCard,
  AdminSurface,
} from "../AdminPrimitives";
import { useAdminWorkspace } from "../AdminWorkspaceContext";
import { ADMIN_COLORS } from "../../adminTokens";
import { getActiveTicketCount, getAdminProducts, getAdminUsers, getApiErrorMessage } from "../../../../../services/api";

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
      {error && !loading ? (
        <AdminCard tone="muted" padding="p-4" topAccent={false} className="mb-4">
          <p className="text-sm font-medium" style={{ color: ADMIN_COLORS.support }}>{error}</p>
          <p className="mt-2 text-xs" style={{ color: ADMIN_COLORS.muted }}>
            Sayfayı yenileyin veya oturumunuzun Admin rolüne sahip olduğundan emin olun.
          </p>
        </AdminCard>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <AdminCard
            key={s.id}
            tone="primary"
            elevated
            interactive={Boolean(s.target)}
            padding="p-5"
            as="button"
            onClick={s.target ? () => navigateTo(s.target) : undefined}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: ADMIN_COLORS.muted }}>{s.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight" style={{ color: ADMIN_COLORS.dark }}>{fmt(s.value)}</p>
            <p className="mt-1 text-xs" style={{ color: ADMIN_COLORS.support }}>{s.hint}</p>
          </AdminCard>
        ))}
      </section>
    </AdminSurface>
  );
}
