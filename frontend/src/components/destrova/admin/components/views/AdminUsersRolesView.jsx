//Users → AdminUsersRolesView.jsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AdminCard,
  AdminDrawer,
  AdminModal,
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
import { adminUserRoleRules } from "../../data/adminMock";
import { ADMIN_LEVEL_TONE } from "../../adminTokens";
import {
  ADMIN_FILTER_ALL,
  buildAdminDepartmentSelectOptions,
  buildAdminRoleFilterOptions,
  buildAdminRoleSelectOptions,
  buildAdminUserStatusFilterOptions,
  buildAdminUserStatusSelectOptions,
  translateAdminDepartment,
  translateAdminRole,
  translateAdminRoleHelper,
  translateAdminUserStatus,
} from "../../utils/adminI18n";
import { useAdminWorkspace } from "../AdminWorkspaceContext";
import {
  getAdminUsers,
  updateUser,
  createAdminUser,
  disableUser,
} from "../../../../../services/api";
import { resolveApiUserMessage } from "../../../shared/utils/apiErrorMessages";
import { DestrovaConfirmDialog } from "../../../shared/DestrovaConfirmDialog";

const STATUS_TONE = { Active: "success", Disabled: "neutral" };

const ROLE_TONE = {
  Admin: "warn",
  Manager: "info",
  Agent: "info",
  Customer: "neutral",
};

const PANEL_CLASS = "rounded-[14px] border border-gray-200 bg-white shadow-sm";

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

function mapApiUserToRow(u) {
  if (u == null || typeof u !== "object") {
    return null;
  }
  const id = u.id != null ? String(u.id) : "";
  const name = typeof u.name === "string" && u.name.trim() ? u.name.trim() : "—";
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

export default function AdminUsersRolesView() {
  const { t } = useTranslation(["admin", "errors"]);
  const { t: tc } = useTranslation("common");
  const { selectedEntity } = useAdminWorkspace();
  const [query, setQuery] = useState("");
  const [roleF, setRoleF] = useState(ADMIN_FILTER_ALL);
  const [statusF, setStatusF] = useState(ADMIN_FILTER_ALL);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [drawerUserId, setDrawerUserId] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const roleFilterOptions = useMemo(() => buildAdminRoleFilterOptions(t, tc), [t, tc]);
  const statusFilterOptions = useMemo(() => buildAdminUserStatusFilterOptions(t), [t]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminUsers();
      if (!Array.isArray(data)) {
        setUsers([]);
        setError(t("users.invalidResponse"));
        return;
      }
      const rows = data.map(mapApiUserToRow).filter(Boolean);
      setUsers(rows);
    } catch (e) {
      setUsers([]);
      setError(resolveApiUserMessage(e, { fallback: t("users.loadError"), t }));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
      if (roleF !== ADMIN_FILTER_ALL && u.role !== roleF) return false;
      if (statusF !== ADMIN_FILTER_ALL && u.status !== statusF) return false;
      return true;
    });
  }, [query, roleF, statusF, users]);

  const { sort, onSort } = useSort("name", "asc");

  const columns = useMemo(() => [
    { id: "name", label: t("users.columns.name"), accessor: (u) => u.name, render: (u) => <span className="font-semibold text-gray-900">{u.name}</span> },
    { id: "email", label: t("users.columns.email"), accessor: (u) => u.email, render: (u) => <span className="text-gray-600">{u.email || "—"}</span> },
    {
      id: "role",
      label: t("users.columns.role"),
      accessor: (u) => u.role,
      render: (u) => (
        <AdminStatePill tone={ROLE_TONE[u.role] || "neutral"}>
          {translateAdminRole(u.role, tc)}
        </AdminStatePill>
      ),
    },
    {
      id: "status",
      label: t("users.columns.status"),
      accessor: (u) => u.status,
      render: (u) => (
        <AdminStatePill tone={STATUS_TONE[u.status] || "neutral"}>
          {translateAdminUserStatus(u.status, t)}
        </AdminStatePill>
      ),
    },
    {
      id: "department",
      label: t("users.columns.department"),
      accessor: (u) => u.department,
      render: (u) => (
        u.department === "—" ? "—" : translateAdminDepartment(u.department, t)
      ),
    },
    {
      id: "maxOpen",
      label: t("users.columns.maxOpen"),
      align: "right",
      accessor: (u) => (adminUserRoleRules(u.role).showMaxOpen ? u.maxOpen : null),
      render: (u) => {
        const rules = adminUserRoleRules(u.role);
        if (!rules.showMaxOpen) {
          return <span className="text-slate-400">—</span>;
        }
        return <span className="tabular-nums text-gray-900">{u.maxOpen ?? "—"}</span>;
      },
    },
  ], [t, tc]);

  const drawerUser = drawerUserId ? users.find((u) => u.id === drawerUserId) : null;

  return (
    <AdminSurface
      eyebrow={t("users.eyebrow")}
      title={t("users.title")}
      description={t("users.description")}
      actions={(
        <AdminPrimaryButton onClick={() => setShowCreateModal(true)}>
          {t("users.addUser")}
        </AdminPrimaryButton>
      )}
    >
      <AdminCard tone="default" padding="p-4 md:p-5" topAccent={false} className={PANEL_CLASS}>
        <div className="flex flex-wrap items-center gap-3">
          <AdminSearchInput value={query} onChange={setQuery} placeholder={t("users.searchPlaceholder")} />
          <AdminSelect value={roleF} onChange={setRoleF} options={roleFilterOptions} />
          <AdminSelect value={statusF} onChange={setStatusF} options={statusFilterOptions} />
          <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            {loading ? "…" : t("common.countOf", { shown: filtered.length, total: users.length })}
          </span>
        </div>
      </AdminCard>

      {error ? (
        <AdminCard
          tone="default"
          padding="p-4 md:p-5"
          topAccent={false}
          className="border border-red-200 bg-red-50/60"
        >
          <p className="text-sm font-medium" style={{ color: ADMIN_LEVEL_TONE.error.fg }}>
            {error}
          </p>
        </AdminCard>
      ) : null}

      <AdminCard tone="default" padding="p-1 md:p-2" topAccent={false} elevated className={`${PANEL_CLASS} overflow-hidden`}>
        {loading ? (
          <p className="px-4 py-8 text-sm text-gray-500">
            {t("users.loading")}
          </p>
        ) : (
          <AdminTable
            columns={columns}
            rows={filtered}
            getRowKey={(u) => u.id}
            onRowClick={(u) => setDrawerUserId(u.id)}
            sort={sort}
            onSort={onSort}
            empty={t("users.empty")}
          />
        )}
      </AdminCard>

      {showCreateModal ? (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchUsers}
        />
      ) : null}

      <UserDrawer
        user={drawerUser}
        onClose={() => setDrawerUserId(null)}
        onSaved={fetchUsers}
      />
    </AdminSurface>
  );
}

function CreateUserModal({ onClose, onCreated }) {
  const { t } = useTranslation(["admin", "errors"]);
  const { t: tc } = useTranslation("common");
  const roleOptions = useMemo(() => buildAdminRoleSelectOptions(tc), [tc]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "Customer",
    maxTicketLimit: 5,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const update = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.name.trim()) { setError(t("users.create.fullNameRequired")); return; }
    if (!form.email.trim()) { setError(t("users.create.emailRequired")); return; }
    setSaving(true);
    setError(null);
    try {
      const apiRole = DISPLAY_ROLE_TO_API[form.role] || "CUSTOMER";
      const rules = adminUserRoleRules(form.role);
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: apiRole,
        status: "Active",
      };
      if (rules.showMaxOpen) {
        payload.maxTicketLimit = Number(form.maxTicketLimit) || 5;
      }
      await createAdminUser(payload);
      setSuccessMsg(t("users.create.success", { email: form.email }));
      await onCreated();
    } catch (e) {
      setError(resolveApiUserMessage(e, { fallback: t("users.create.createError"), t }));
    } finally {
      setSaving(false);
    }
  };

  if (successMsg) {
    return (
      <AdminModal open onClose={onClose} title={t("users.create.createdTitle")} eyebrow={t("common.admin")} width={440}
        footer={
          <div className="flex justify-end">
            <AdminPrimaryButton onClick={onClose}>{t("common.done")}</AdminPrimaryButton>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">✅</div>
          <p className="text-sm text-slate-700">{successMsg}</p>
          <p className="text-xs text-slate-400">{t("users.create.successHint")}</p>
        </div>
      </AdminModal>
    );
  }

  return (
    <AdminModal
      open
      onClose={onClose}
      title={t("users.create.title")}
      eyebrow={t("common.admin")}
      width={500}
      footer={
        <div className="flex items-center justify-end gap-2">
          <AdminGhostButton onClick={onClose} disabled={saving}>{t("common.cancel")}</AdminGhostButton>
          <AdminPrimaryButton onClick={handleCreate} disabled={saving || !form.name.trim() || !form.email.trim()}>
            {saving ? t("common.creating") : t("users.create.createButton")}
          </AdminPrimaryButton>
        </div>
      }
    >
      {error ? (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      <div className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
        {t("users.create.inviteNote")}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AdminField label={t("users.create.fullName")}>
          <AdminInput
            value={form.name}
            onChange={update("name")}
            placeholder={t("users.create.fullNamePlaceholder")}
            disabled={saving}
          />
        </AdminField>
        <AdminField label={t("users.create.email")}>
          <AdminInput
            value={form.email}
            onChange={update("email")}
            type="email"
            placeholder={t("users.create.emailPlaceholder")}
            disabled={saving}
          />
        </AdminField>
        <AdminField label={t("users.create.role")}>
          <AdminSelect
            value={form.role}
            onChange={update("role")}
            options={roleOptions}
            disabled={saving}
          />
        </AdminField>
        {adminUserRoleRules(form.role).showMaxOpen ? (
          <AdminField label={t("users.create.maxOpenTickets")} hint={t("users.create.maxOpenHint")}>
            <AdminInput
              value={String(form.maxTicketLimit)}
              onChange={(v) => update("maxTicketLimit")(Number(v) || 0)}
              type="number"
              disabled={saving}
            />
          </AdminField>
        ) : null}
      </div>
    </AdminModal>
  );
}

function UserDrawer({ user, onClose, onSaved }) {
  const { t } = useTranslation(["admin", "errors"]);
  const { t: tc } = useTranslation("common");
  const roleOptions = useMemo(() => buildAdminRoleSelectOptions(tc), [tc]);
  const statusOptions = useMemo(() => buildAdminUserStatusSelectOptions(t), [t]);
  const departmentOptions = useMemo(() => buildAdminDepartmentSelectOptions(t), [t]);
  const userId = user?.id ?? null;
  const [draft, setDraft] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);
  const [disablingUser, setDisablingUser] = useState(false);

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

  const executeDisableUser = async () => {
    setDisablingUser(true);
    setSaving(true);
    setSaveError(null);
    try {
      await disableUser(Number(userId));
      setDisableConfirmOpen(false);
      await onSaved();
      onClose();
    } catch (e) {
      setDisableConfirmOpen(false);
      setSaveError(resolveApiUserMessage(e, { fallback: t("users.drawer.disableError"), t }));
    } finally {
      setDisablingUser(false);
      setSaving(false);
    }
  };

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
  const roleHelper = translateAdminRoleHelper(draft.role, t);

  const handleSave = async () => {
    if (!dirty || !draft) return;
    setSaveError(null);
    setSaving(true);
    try {
      await updateUser(Number(userId), draftToUpdatePayload(draft));
      await onSaved();
      onClose();
    } catch (e) {
      setSaveError(resolveApiUserMessage(e, { fallback: t("users.drawer.saveError"), t }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <AdminDrawer
      open
      onClose={onClose}
      eyebrow={t("users.drawer.eyebrow")}
      title={user.name}
      width={520}
      footer={(
        <div className="flex items-center justify-between gap-2">
          <div>
            {user.status !== "Disabled" ? (
              <AdminGhostButton
                danger
                disabled={saving}
                onClick={() => setDisableConfirmOpen(true)}
              >
                {t("users.drawer.disableUser")}
              </AdminGhostButton>
            ) : (
              <span className="text-xs font-medium text-amber-600">⚠ {t("users.drawer.disabledWarning")}</span>
            )}
          </div>
          <div className="flex gap-2">
            <AdminGhostButton onClick={onClose} disabled={saving}>
              {t("common.cancel")}
            </AdminGhostButton>
            <AdminPrimaryButton onClick={handleSave} disabled={!dirty || saving}>
              {saving ? t("common.saving") : t("common.saveChanges")}
            </AdminPrimaryButton>
          </div>
        </div>
      )}
    >
      {saveError ? (
        <p
          className="mb-4 rounded-lg border border-red-200/80 px-3 py-2 text-sm"
          style={{ color: ADMIN_LEVEL_TONE.error.fg, backgroundColor: ADMIN_LEVEL_TONE.error.bg }}
        >
          {saveError}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AdminField label={t("users.drawer.name")}><AdminInput value={draft.name} onChange={update("name")} disabled={saving} /></AdminField>
        <AdminField label={t("users.drawer.email")} hint={t("users.drawer.emailHint")}>
          <AdminInput
            value={draft.email}
            onChange={() => {}}
            type="email"
            disabled
          />
        </AdminField>
        <AdminField label={t("users.drawer.role")}>
          <AdminSelect value={draft.role} onChange={update("role")} options={roleOptions} disabled={saving} />
        </AdminField>
        <AdminField label={t("users.drawer.status")}>
          <AdminSelect value={draft.status} onChange={update("status")} options={statusOptions} disabled={saving} />
        </AdminField>
        {rules.showDepartment ? (
          <AdminField label={t("users.drawer.department")}>
            <AdminSelect value={draft.department} onChange={update("department")} options={departmentOptions} disabled={saving} />
          </AdminField>
        ) : null}
        {rules.showMaxOpen ? (
          <AdminField label={t("users.drawer.maxOpenTickets")} hint={t("users.drawer.maxOpenHint")}>
            <AdminInput value={String(draft.maxOpen)} onChange={(v) => update("maxOpen")(Number(v) || 0)} type="number" disabled={saving} />
          </AdminField>
        ) : null}
      </div>
      {roleHelper ? (
        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 text-[12px] leading-relaxed text-blue-900/90">
          {roleHelper}
        </div>
      ) : null}
      <p className="mt-4 text-[11px] text-gray-500">
        {t("common.permissionsNote")}
      </p>
    </AdminDrawer>

    <DestrovaConfirmDialog
      open={disableConfirmOpen}
      title={t("users.drawer.disableConfirmTitle")}
      subtitle={user.name}
      busy={disablingUser}
      confirmLabel={t("users.drawer.confirmDisable")}
      confirmBusyLabel={t("users.drawer.disabling")}
      cancelLabel={tc("button.cancel")}
      closeAria={t("common.close")}
      zIndex={1100}
      onConfirm={executeDisableUser}
      onCancel={() => { if (!disablingUser) setDisableConfirmOpen(false); }}
      irreversibleNote={t("users.drawer.disableConfirmIrreversible")}
    >
      <p className="text-sm leading-relaxed">
        {t("users.drawer.disableConfirmBody", { name: user.name })}
      </p>
    </DestrovaConfirmDialog>
    </>
  );
}
