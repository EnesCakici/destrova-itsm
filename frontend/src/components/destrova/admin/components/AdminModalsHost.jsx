// burada şu yapılır : "Quick add" / "Edit" modalları

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAdminWorkspace } from "./AdminWorkspaceContext";
import { createProduct, getApiErrorMessage } from "../../../../services/api";
import {
  AdminModal,
  AdminField,
  AdminInput,
  AdminSelect,
  AdminPrimaryButton,
  AdminGhostButton,
} from "./AdminPrimitives";
import {
  ADMIN_DEPARTMENTS,
  ADMIN_PRODUCTS,
  ADMIN_USERS,
  adminUserRoleRules,
} from "../data/adminMock";
import { ADMIN_LEVEL_TONE } from "../adminTokens";
import {
  buildAdminCategorySelectOptions,
  buildAdminDepartmentSelectOptions,
  buildAdminProductStatusSelectOptions,
  buildAdminRoleSelectOptions,
  buildAdminUserStatusSelectOptions,
  buildAdminVersionStatusSelectOptions,
  translateAdminRoleHelper,
} from "../utils/adminI18n";

export default function AdminModalsHost() {
  const { modal, closeModal } = useAdminWorkspace();
  const id = modal?.id;
  if (!id) return null;

  if (id === "addUser" || id === "editUser") {
    return <UserModal mode={id} payload={modal.payload} onClose={closeModal} />;
  }
  if (id === "addProduct") {
    return <AddProductModal onClose={closeModal} />;
  }
  if (id === "addVersion") {
    return <AddVersionModal payload={modal.payload} onClose={closeModal} />;
  }
  return null;
}

function UserModal({ mode, payload, onClose }) {
  const { t } = useTranslation("admin");
  const { t: tc } = useTranslation("common");
  const roleOptions = useMemo(() => buildAdminRoleSelectOptions(tc), [tc]);
  const statusOptions = useMemo(() => buildAdminUserStatusSelectOptions(t), [t]);
  const departmentOptions = useMemo(() => buildAdminDepartmentSelectOptions(t), [t]);
  const seed = payload?.userId ? ADMIN_USERS.find((u) => u.id === payload.userId) : null;
  const [draft, setDraft] = useState(() => ({
    name:       seed?.name       || "",
    email:      seed?.email      || "",
    role:       seed?.role       || "Agent",
    status:     seed?.status     || "Active",
    department: seed?.department || ADMIN_DEPARTMENTS[0],
    maxOpen:    seed?.maxOpen ?? 16,
  }));
  useEffect(() => {
    if (!seed) return;
    setDraft({
      name: seed.name, email: seed.email, role: seed.role,
      status: seed.status, department: seed.department, maxOpen: seed.maxOpen,
    });
  }, [seed]);

  const update = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));
  const valid = draft.name.trim() && draft.email.trim();
  const rules = adminUserRoleRules(draft.role);
  const roleHelper = translateAdminRoleHelper(draft.role, t);

  return (
    <AdminModal
      open
      onClose={onClose}
      eyebrow={mode === "addUser" ? t("modals.quickAdd") : t("modals.editUser")}
      title={mode === "addUser" ? t("modals.addUser") : draft.name || t("modals.editUser")}
      width={520}
      footer={(
        <div className="flex justify-end gap-2">
          <AdminGhostButton onClick={onClose}>{t("common.cancel")}</AdminGhostButton>
          <AdminPrimaryButton onClick={onClose} disabled={!valid}>
            {mode === "addUser" ? t("modals.createUser") : t("common.saveChanges")}
          </AdminPrimaryButton>
        </div>
      )}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AdminField label={t("modals.fullName")}><AdminInput value={draft.name} onChange={update("name")} placeholder={t("modals.fullNamePlaceholder")} /></AdminField>
        <AdminField label={t("users.create.email")}><AdminInput value={draft.email} onChange={update("email")} placeholder={t("modals.emailPlaceholder")} type="email" /></AdminField>
        <AdminField label={t("users.create.role")}>
          <AdminSelect value={draft.role} onChange={update("role")} options={roleOptions} />
        </AdminField>
        <AdminField label={t("users.drawer.status")}>
          <AdminSelect value={draft.status} onChange={update("status")} options={statusOptions} />
        </AdminField>
        {rules.showDepartment ? (
          <AdminField label={t("users.drawer.department")}>
            <AdminSelect value={draft.department} onChange={update("department")} options={departmentOptions} />
          </AdminField>
        ) : null}
        {rules.showMaxOpen ? (
          <AdminField label={t("users.drawer.maxOpenTickets")} hint={t("modals.maxOpenHint")}>
            <AdminInput value={String(draft.maxOpen)} onChange={(v) => update("maxOpen")(Number(v) || 0)} type="number" />
          </AdminField>
        ) : null}
      </div>
      {roleHelper ? (
        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 text-[12px] leading-relaxed text-blue-900/90">
          {roleHelper}
        </div>
      ) : null}
      <p className="mt-3 text-[11px] text-gray-500">
        {t("common.permissionsNote")}
      </p>
    </AdminModal>
  );
}

function AddProductModal({ onClose }) {
  const { t } = useTranslation("admin");
  const { refreshAdminProducts } = useAdminWorkspace();
  const categoryOptions = useMemo(() => buildAdminCategorySelectOptions(t), [t]);
  const statusOptions = useMemo(() => buildAdminProductStatusSelectOptions(t), [t]);
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    category: "Other",
    latestVersion: "",
    status: "Active",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const valid = draft.name.trim().length > 0;

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createProduct({
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        category: draft.category || null,
        latestVersion: draft.latestVersion.trim() || null,
        isActive: draft.status === "Active",
      });
      refreshAdminProducts();
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, t("modals.createProductError")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      open onClose={onClose}
      eyebrow={t("modals.quickAdd")} title={t("modals.addProduct")} width={520}
      footer={(
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {error ? (
            <p
              className="mr-auto rounded-lg border border-red-200/80 px-2 py-1 text-xs sm:max-w-[280px]"
              style={{ color: ADMIN_LEVEL_TONE.error.fg, backgroundColor: ADMIN_LEVEL_TONE.error.bg }}
            >
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <AdminGhostButton onClick={onClose} disabled={saving}>{t("common.cancel")}</AdminGhostButton>
            <AdminPrimaryButton onClick={submit} disabled={!valid || saving}>
              {saving ? t("common.creating") : t("modals.createProduct")}
            </AdminPrimaryButton>
          </div>
        </div>
      )}
    >
      <div className="grid grid-cols-1 gap-4">
        <AdminField label={t("modals.productName")}><AdminInput value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder={t("modals.productNamePlaceholder")} /></AdminField>
        <AdminField label={t("products.drawer.description")} hint={t("modals.descriptionHint")}><AdminInput value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })} placeholder={t("modals.descriptionPlaceholder")} /></AdminField>
        <AdminField label={t("products.drawer.category")}>
          <AdminSelect value={draft.category} onChange={(v) => setDraft({ ...draft, category: v })} options={categoryOptions} />
        </AdminField>
        <AdminField label={t("products.drawer.latestVersion")} hint={t("modals.latestVersionHint")}>
          <AdminInput value={draft.latestVersion} onChange={(v) => setDraft({ ...draft, latestVersion: v })} placeholder="v2.5.0" />
        </AdminField>
        <AdminField label={t("products.drawer.status")}>
          <AdminSelect value={draft.status} onChange={(v) => setDraft({ ...draft, status: v })} options={statusOptions} />
        </AdminField>
        <p className="text-[11px] text-gray-500">
          {t("modals.passiveNote")}
        </p>
      </div>
    </AdminModal>
  );
}

function AddVersionModal({ payload, onClose }) {
  const { t } = useTranslation("admin");
  const versionStatusOptions = useMemo(() => buildAdminVersionStatusSelectOptions(t), [t]);
  const initialProduct = payload?.productId || ADMIN_PRODUCTS[0]?.id;
  const [draft, setDraft] = useState({ productId: initialProduct, name: "", status: "Active" });
  const valid = draft.productId && draft.name.trim();
  return (
    <AdminModal
      open onClose={onClose}
      eyebrow={t("modals.quickAdd")} title={t("modals.addVersion")} width={480}
      footer={(
        <div className="flex justify-end gap-2">
          <AdminGhostButton onClick={onClose}>{t("common.cancel")}</AdminGhostButton>
          <AdminPrimaryButton onClick={onClose} disabled={!valid}>{t("modals.addVersionButton")}</AdminPrimaryButton>
        </div>
      )}
    >
      <div className="grid grid-cols-1 gap-4">
        <AdminField label={t("products.drawer.eyebrow")}>
          <AdminSelect
            value={draft.productId}
            onChange={(v) => setDraft({ ...draft, productId: v })}
            options={ADMIN_PRODUCTS.map((p) => ({ value: p.id, label: p.name }))}
          />
        </AdminField>
        <AdminField label={t("modals.versionLabel")} hint={t("modals.versionLabelHint")}>
          <AdminInput value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder={t("modals.versionPlaceholder")} />
        </AdminField>
        <AdminField label={t("products.drawer.status")}>
          <AdminSelect value={draft.status} onChange={(v) => setDraft({ ...draft, status: v })} options={versionStatusOptions} />
        </AdminField>
        <p className="text-[11px] text-gray-500">
          {t("modals.deprecatedNote")}
        </p>
      </div>
    </AdminModal>
  );
}
