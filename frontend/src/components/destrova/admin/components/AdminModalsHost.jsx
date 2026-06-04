// burada şu yapılır : "Quick add" / "Edit" modalları

import { useState, useEffect } from "react";
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
  ADMIN_PRODUCT_STATUSES,
  ADMIN_PRODUCT_CATEGORIES,
  ADMIN_ROLES,
  ADMIN_USERS,
  ADMIN_USER_STATUSES,
  ADMIN_VERSION_STATUSES,
  adminUserRoleRules,
} from "../data/adminMock";
import { ADMIN_LEVEL_TONE } from "../adminTokens";

/**
 * Single host that renders the appropriate Quick-Add / Edit modal based on
 * `useAdminWorkspace().modal`.
 *
 * All modals are mock — they validate the inputs and close on submit. Replace
 * the `submit` handlers with backend calls when integrating.
 */
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

/* ──────────────── User add / edit ──────────────── */
function UserModal({ mode, payload, onClose }) {
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

  return (
    <AdminModal
      open
      onClose={onClose}
      eyebrow={mode === "addUser" ? "Quick add" : "Edit user"}
      title={mode === "addUser" ? "Add user" : draft.name || "Edit user"}
      width={520}
      footer={(
        <div className="flex justify-end gap-2">
          <AdminGhostButton onClick={onClose}>Cancel</AdminGhostButton>
          <AdminPrimaryButton onClick={onClose} disabled={!valid}>
            {mode === "addUser" ? "Create user" : "Save changes"}
          </AdminPrimaryButton>
        </div>
      )}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AdminField label="Name"><AdminInput value={draft.name} onChange={update("name")} placeholder="Full name" /></AdminField>
        <AdminField label="Email"><AdminInput value={draft.email} onChange={update("email")} placeholder="user@destrova.io" type="email" /></AdminField>
        <AdminField label="Role">
          <AdminSelect value={draft.role} onChange={update("role")} options={ADMIN_ROLES} />
        </AdminField>
        <AdminField label="Status">
          <AdminSelect value={draft.status} onChange={update("status")} options={ADMIN_USER_STATUSES} />
        </AdminField>
        {rules.showDepartment ? (
          <AdminField label="Department">
            <AdminSelect value={draft.department} onChange={update("department")} options={ADMIN_DEPARTMENTS} />
          </AdminField>
        ) : null}
        {rules.showMaxOpen ? (
          <AdminField label="Max open tickets" hint="Per-agent capacity. 0 disables the limit.">
            <AdminInput value={String(draft.maxOpen)} onChange={(v) => update("maxOpen")(Number(v) || 0)} type="number" />
          </AdminField>
        ) : null}
      </div>
      {rules.helper ? (
        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 text-[12px] leading-relaxed text-blue-900/90">
          {rules.helper}
        </div>
      ) : null}
      <p className="mt-3 text-[11px] text-gray-500">
        Permissions are managed indirectly via roles. Granular permission UI is intentionally out of scope.
      </p>
    </AdminModal>
  );
}

/* ──────────────── Add product ──────────────── */
function AddProductModal({ onClose }) {
  const { refreshAdminProducts } = useAdminWorkspace();
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
      setError(getApiErrorMessage(e, "Could not create product."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      open onClose={onClose}
      eyebrow="Quick add" title="Add product" width={520}
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
            <AdminGhostButton onClick={onClose} disabled={saving}>Cancel</AdminGhostButton>
            <AdminPrimaryButton onClick={submit} disabled={!valid || saving}>
              {saving ? "Creating…" : "Create product"}
            </AdminPrimaryButton>
          </div>
        </div>
      )}
    >
      <div className="grid grid-cols-1 gap-4">
        <AdminField label="Product name"><AdminInput value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder="e.g. Destrova Identity" /></AdminField>
        <AdminField label="Description" hint="Customer-facing summary."><AdminInput value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })} placeholder="What this product covers" /></AdminField>
        <AdminField label="Category">
          <AdminSelect value={draft.category} onChange={(v) => setDraft({ ...draft, category: v })} options={ADMIN_PRODUCT_CATEGORIES} />
        </AdminField>
        <AdminField label="Latest version" hint="e.g. v2.5.0">
          <AdminInput value={draft.latestVersion} onChange={(v) => setDraft({ ...draft, latestVersion: v })} placeholder="v2.5.0" />
        </AdminField>
        <AdminField label="Status">
          <AdminSelect value={draft.status} onChange={(v) => setDraft({ ...draft, status: v })} options={ADMIN_PRODUCT_STATUSES} />
        </AdminField>
        <p className="text-[11px] text-gray-500">
          Inactive (passive) products cannot be selected on new tickets, but historical references are retained.
        </p>
      </div>
    </AdminModal>
  );
}

/* ──────────────── Add product version ──────────────── */
function AddVersionModal({ payload, onClose }) {
  const initialProduct = payload?.productId || ADMIN_PRODUCTS[0]?.id;
  const [draft, setDraft] = useState({ productId: initialProduct, name: "", status: "Active" });
  const valid = draft.productId && draft.name.trim();
  return (
    <AdminModal
      open onClose={onClose}
      eyebrow="Quick add" title="Add product version" width={480}
      footer={(
        <div className="flex justify-end gap-2">
          <AdminGhostButton onClick={onClose}>Cancel</AdminGhostButton>
          <AdminPrimaryButton onClick={onClose} disabled={!valid}>Add version</AdminPrimaryButton>
        </div>
      )}
    >
      <div className="grid grid-cols-1 gap-4">
        <AdminField label="Product">
          <AdminSelect
            value={draft.productId}
            onChange={(v) => setDraft({ ...draft, productId: v })}
            options={ADMIN_PRODUCTS.map((p) => ({ value: p.id, label: p.name }))}
          />
        </AdminField>
        <AdminField label="Version label" hint="Free-form (e.g. v3.2, 14.4.1)">
          <AdminInput value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder="v3.3" />
        </AdminField>
        <AdminField label="Status">
          <AdminSelect value={draft.status} onChange={(v) => setDraft({ ...draft, status: v })} options={ADMIN_VERSION_STATUSES} />
        </AdminField>
        <p className="text-[11px] text-gray-500">
          Deprecated versions cannot be selected on new tickets but stay attached to historical tickets.
        </p>
      </div>
    </AdminModal>
  );
}
