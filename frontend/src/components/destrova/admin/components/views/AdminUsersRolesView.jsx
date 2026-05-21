//Users → AdminUsersRolesView.jsx

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminCard,
  AdminDrawer,
  AdminField,
  AdminGhostButton,
  AdminInput,
  AdminPrimaryButton,
  AdminSearchInput,
  AdminSelect,
  AdminStatePill,
  AdminSurface,
  AdminTable,
  useSort,
} from "../AdminPrimitives";
import {
  ADMIN_DEPARTMENTS,
  ADMIN_ROLES,
  ADMIN_USER_STATUSES,
  adminUserRoleRules,
} from "../../data/adminMock";
import { ADMIN_COLORS, ADMIN_LEVEL_TONE } from "../../adminTokens";
import { useAdminWorkspace } from "../AdminWorkspaceContext";
import { getAdminUsers, getApiErrorMessage, updateUser } from "../../../../../services/api";

const STATUS_TONE = { Active: "success", Disabled: "neutral" };
const ROLE_TONE = { Admin: "warn", Manager: "info", Agent: "success", Customer: "neutral" };

const API_ROLE_TO_DISPLAY = {
  CUSTOMER: "Customer",
  AGENT: "Agent",
  MANAGER: "Manager",
  ADMIN: "Admin",
};

const DISPLAY_ROLE_TO_API = {
  Customer: "CUSTOMER",
  Agent: "AGENT",
  Manager: "MANAGER",
  Admin: "ADMIN",
};

/** Backend User JSON → satır modeli (id string, rol/status başlık formatı). */
function mapApiUserToRow(u) {
  if (u == null || typeof u !== "object") {
    return null;
  }
  const id = u.id != null ? String(u.id) : "";
  const name = typeof u.name === "string" && u.name.trim() ? u.name.trim() : "—";
  // E-posta yalnızca API'den gelir; null/eksik için istemcide sahte adres üretilmez.
  const email = typeof u.email === "string" ? u.email.trim() : "";
  const rawRole = u.role != null ? String(u.role).toUpperCase() : "CUSTOMER";
  const role = API_ROLE_TO_DISPLAY[rawRole] || "Customer";
  const status = mapStatusFromApi(u.status);
  const department =
    typeof u.department === "string" && u.department.trim() ? u.department.trim() : "—";
  const maxOpen =
    typeof u.maxTicketLimit === "number" && !Number.isNaN(u.maxTicketLimit)
      ? u.maxTicketLimit
      : typeof u.maxTicketLimit === "string"
        ? Number.parseInt(u.maxTicketLimit, 10) || 0
        : 0;

  return { id, name, email, role, status, department, maxOpen };
}

/** API / eski veritabanı değerlerini yalnızca Active | Disabled gösterimine indirger. */
function mapStatusFromApi(status) {
  if (status == null || String(status).trim() === "") return "Active";
  const key = String(status).trim().toLowerCase();
  if (key === "active") return "Active";
  if (
    key === "disabled"
    || key === "inactive"
    || key === "suspended"
    || key === "invited"
  ) {
    return "Disabled";
  }
  const titled = String(status).trim();
  const cap = titled.charAt(0).toUpperCase() + titled.slice(1).toLowerCase();
  if (cap === "Active" || cap === "Disabled") return cap;
  return "Active";
}

/** Admin drawer — email Keycloak ile yönetilir; sunucuya yazılmaz. */
function draftToUpdatePayload(draft) {
  const roleApi = DISPLAY_ROLE_TO_API[draft.role] || "CUSTOMER";
  const department =
    draft.department == null || draft.department === "" || draft.department === "—"
      ? ""
      : String(draft.department).trim();
  return {
    name: draft.name,
    role: roleApi,
    status: draft.status,
    department,
    maxTicketLimit: typeof draft.maxOpen === "number" ? draft.maxOpen : Number(draft.maxOpen) || 0,
  };
}

/**
 * Users & Roles — searchable, filterable user table with row-click → drawer.
 *
 * Permissions are managed indirectly via roles (no granular permission UI).
 * Editable fields in the drawer match the spec: name, role, status,
 * department, max open ticket limit. Email is read-only (Keycloak).
 */
export default function AdminUsersRolesView() {
  const { selectedEntity } = useAdminWorkspace();
  const [query, setQuery] = useState("");
  const [roleF, setRoleF] = useState("All roles");
  const [statusF, setStatusF] = useState("All statuses");
  const [drawerUserId, setDrawerUserId] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminUsers();
      if (!Array.isArray(data)) {
        setUsers([]);
        setError("Invalid response from server.");
        return;
      }
      const rows = data.map(mapApiUserToRow).filter(Boolean);
      setUsers(rows);
    } catch (e) {
      setUsers([]);
      setError(getApiErrorMessage(e, "Could not load users."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (selectedEntity?.kind === "user" && drawerUserId !== selectedEntity.id) {
      setDrawerUserId(selectedEntity.id);
    }
  }, [selectedEntity, drawerUserId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (
        q &&
        !(
          (u.name || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          (u.department || "").toLowerCase().includes(q)
        )
      ) {
        return false;
      }
      if (roleF !== "All roles" && u.role !== roleF) return false;
      if (statusF !== "All statuses" && u.status !== statusF) return false;
      return true;
    });
  }, [query, roleF, statusF, users]);

  const { sort, onSort } = useSort("name", "asc");

  const columns = [
    { id: "name", label: "Name", accessor: (u) => u.name, render: (u) => <span className="font-semibold" style={{ color: ADMIN_COLORS.dark }}>{u.name}</span> },
    { id: "email", label: "Email", accessor: (u) => u.email, render: (u) => <span style={{ color: ADMIN_COLORS.support }}>{u.email || "—"}</span> },
    { id: "role", label: "Role", accessor: (u) => u.role, render: (u) => <AdminStatePill tone={ROLE_TONE[u.role] || "neutral"}>{u.role}</AdminStatePill> },
    { id: "status", label: "Status", accessor: (u) => u.status, render: (u) => <AdminStatePill tone={STATUS_TONE[u.status] || "neutral"}>{u.status}</AdminStatePill> },
    { id: "department", label: "Department", accessor: (u) => u.department },
    {
      id: "maxOpen",
      label: "Max open",
      align: "right",
      accessor: (u) => (adminUserRoleRules(u.role).showMaxOpen ? u.maxOpen : null),
      render: (u) => {
        const rules = adminUserRoleRules(u.role);
        if (!rules.showMaxOpen) {
          return <span className="text-slate-400">—</span>;
        }
        return <span className="tabular-nums" style={{ color: ADMIN_COLORS.dark }}>{u.maxOpen ?? "—"}</span>;
      },
    },
  ];

  const drawerUser = drawerUserId ? users.find((u) => u.id === drawerUserId) : null;

  return (
    <AdminSurface
      eyebrow="Configuration"
      title="Users & Roles"
      description="Manage who can access Destrova and what their role is. Permissions are derived from roles."
    >
      <AdminCard tone="muted" padding="p-4" topAccent={false}>
        <div className="flex flex-wrap items-center gap-3">
          <AdminSearchInput value={query} onChange={setQuery} placeholder="Search by name, email or department" />
          <AdminSelect value={roleF} onChange={setRoleF} options={["All roles", ...ADMIN_ROLES]} />
          <AdminSelect value={statusF} onChange={setStatusF} options={["All statuses", ...ADMIN_USER_STATUSES]} />
          <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: ADMIN_COLORS.muted }}>
            {loading ? "…" : `${filtered.length} of ${users.length}`}
          </span>
        </div>
      </AdminCard>

      {error ? (
        <AdminCard tone="default" padding="p-4" topAccent={false}>
          <p className="text-sm font-medium" style={{ color: ADMIN_LEVEL_TONE.error.fg }}>
            {error}
          </p>
        </AdminCard>
      ) : null}

      <AdminCard tone="default" padding="p-2 md:p-3" elevated>
        {loading ? (
          <p className="px-3 py-6 text-sm" style={{ color: ADMIN_COLORS.muted }}>
            Loading users…
          </p>
        ) : (
          <AdminTable
            columns={columns}
            rows={filtered}
            getRowKey={(u) => u.id}
            onRowClick={(u) => setDrawerUserId(u.id)}
            sort={sort}
            onSort={onSort}
            empty="No users match the current filters."
          />
        )}
      </AdminCard>

      <UserDrawer
        user={drawerUser}
        onClose={() => setDrawerUserId(null)}
        onSaved={fetchUsers}
      />
    </AdminSurface>
  );
}

/* ──────────────── User detail drawer ──────────────── */
function UserDrawer({ user, onClose, onSaved }) {
  const userId = user?.id ?? null;
  const [draft, setDraft] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setDraft(null);
      setSaveError(null);
      return;
    }
    setDraft({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      department: user.department,
      maxOpen: user.maxOpen,
    });
    setSaveError(null);
  }, [user]);

  if (!userId || !user || !draft) {
    return <AdminDrawer open={false} onClose={onClose} />;
  }

  const update = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));
  const dirty =
    draft &&
    (draft.name !== user.name ||
      draft.role !== user.role ||
      draft.status !== user.status ||
      draft.department !== user.department ||
      Number(draft.maxOpen) !== Number(user.maxOpen));
  const rules = adminUserRoleRules(draft.role);

  const handleSave = async () => {
    if (!dirty || !draft) return;
    setSaveError(null);
    setSaving(true);
    try {
      await updateUser(Number(userId), draftToUpdatePayload(draft));
      await onSaved();
      onClose();
    } catch (e) {
      setSaveError(getApiErrorMessage(e, "Save failed."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminDrawer
      open
      onClose={onClose}
      eyebrow="User"
      title={user.name}
      width={520}
      footer={(
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px]" style={{ color: ADMIN_COLORS.muted }}>
            Değişiklikler sunucuya kaydedilir.
          </p>
          <div className="flex gap-2">
            <AdminGhostButton onClick={onClose} disabled={saving}>
              Cancel
            </AdminGhostButton>
            <AdminPrimaryButton onClick={handleSave} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save changes"}
            </AdminPrimaryButton>
          </div>
        </div>
      )}
    >
      {saveError ? (
        <p className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ color: ADMIN_LEVEL_TONE.error.fg, backgroundColor: ADMIN_LEVEL_TONE.error.bg }}>
          {saveError}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AdminField label="Name"><AdminInput value={draft.name} onChange={update("name")} disabled={saving} /></AdminField>
        <AdminField label="Email" hint="Managed in Keycloak — updated when the user signs in.">
          <AdminInput
            value={draft.email}
            onChange={() => {}}
            type="email"
            disabled
          />
        </AdminField>
        <AdminField label="Role">
          <AdminSelect value={draft.role} onChange={update("role")} options={ADMIN_ROLES} disabled={saving} />
        </AdminField>
        <AdminField label="Status">
          <AdminSelect value={draft.status} onChange={update("status")} options={ADMIN_USER_STATUSES} disabled={saving} />
        </AdminField>
        {rules.showDepartment ? (
          <AdminField label="Department">
            <AdminSelect value={draft.department} onChange={update("department")} options={ADMIN_DEPARTMENTS} disabled={saving} />
          </AdminField>
        ) : null}
        {rules.showMaxOpen ? (
          <AdminField label="Max open tickets" hint="0 disables the per-agent limit.">
            <AdminInput value={String(draft.maxOpen)} onChange={(v) => update("maxOpen")(Number(v) || 0)} type="number" disabled={saving} />
          </AdminField>
        ) : null}
      </div>
      {rules.helper ? (
        <div
          className="mt-4 rounded-lg border border-slate-200/70 bg-slate-50/70 px-3 py-2 text-[12px] leading-relaxed"
          style={{ color: ADMIN_COLORS.support }}
        >
          {rules.helper}
        </div>
      ) : null}
      <p className="mt-4 text-[11px]" style={{ color: ADMIN_COLORS.muted }}>
        Granular permissions are out of scope — they are inherited from the assigned role.
      </p>
    </AdminDrawer>
  );
}
