//Products → AdminProductsCatalogView.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
import DataLoadErrorPanel from "../../../../shared/DataLoadErrorPanel";
import { DestrovaTableSkeleton } from "../../../../shared/DestrovaLoading";
import {
  ADMIN_PRODUCT_CATEGORIES,
} from "../../data/adminMock";
import { ADMIN_LEVEL_TONE } from "../../adminTokens";
import {
  ADMIN_FILTER_ALL,
  buildAdminCategorySelectOptions,
  buildAdminProductStatusFilterOptions,
  buildAdminProductStatusSelectOptions,
  translateAdminProductStatus,
} from "../../utils/adminI18n";
import { useAdminWorkspace } from "../AdminWorkspaceContext";
import { getAdminProducts, updateProduct} from "../../../../../services/api";
import { resolveApiUserMessage } from "../../../shared/utils/apiErrorMessages";
import { useFormatter } from "../../../../../hooks/useFormatter";

const PRODUCT_TONE = { Active: "success", Passive: "neutral" };

const PANEL_CLASS = "rounded-[14px] border border-gray-200 bg-white shadow-sm";

function normalizeProductCategory(value) {
  if (value && ADMIN_PRODUCT_CATEGORIES.includes(value)) return value;
  return "Other";
}

function mapApiProductToRow(api) {
  const isActive = api.isActive !== false;
  return {
    id: String(api.id),
    numericId: api.id,
    name: api.name,
    description: api.description ?? "",
    category: normalizeProductCategory(api.category),
    latestVersion: api.latestVersion ?? "",
    status: isActive ? "Active" : "Passive",
    isActive,
    createdAt: api.createdAt ?? null,
    fromApi: true,
  };
}

export default function AdminProductsCatalogView() {
  const { t } = useTranslation(["admin", "errors"]);
  const { formatDate } = useFormatter();
  const { openModal, selectedEntity, adminProductsRefreshToken } = useAdminWorkspace();
  const [query, setQuery]     = useState("");
  const [statusF, setStatusF] = useState(ADMIN_FILTER_ALL);
  const [drawerId, setDrawerId] = useState(null);
  const [products, setProducts] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);

  const statusFilterOptions = useMemo(() => buildAdminProductStatusFilterOptions(t), [t]);

  const loadProducts = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const raw = await getAdminProducts();
      const rows = Array.isArray(raw) ? raw.map(mapApiProductToRow) : [];
      setProducts(rows);
    } catch (e) {
      setProducts([]);
      setListError(e);
    } finally {
      setListLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts, adminProductsRefreshToken]);

  useEffect(() => {
    if (selectedEntity?.kind === "product" && drawerId !== selectedEntity.id) {
      setDrawerId(selectedEntity.id);
    }
  }, [selectedEntity, drawerId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !(p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q))) return false;
      if (statusF !== ADMIN_FILTER_ALL && p.status !== statusF) return false;
      return true;
    });
  }, [query, statusF, products]);

  const { sort, onSort } = useSort("name", "asc");

  const columns = useMemo(() => [
    {
      id: "name",
      label: t("products.columns.product"),
      accessor: (p) => p.name,
      headerClassName: "max-w-0",
      cellClassName: "max-w-0",
      render: (p) => (
        <div className="min-w-0 overflow-hidden">
          <p className="truncate font-semibold text-gray-900" title={p.name}>{p.name}</p>
          {p.description ? (
            <p className="truncate text-xs text-gray-500" title={p.description}>{p.description}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: "status",
      label: t("products.columns.status"),
      accessor: (p) => p.status,
      width: "6.5rem",
      headerClassName: "whitespace-nowrap",
      cellClassName: "whitespace-nowrap",
      render: (p) => (
        <AdminStatePill tone={PRODUCT_TONE[p.status]}>
          {translateAdminProductStatus(p.status, t)}
        </AdminStatePill>
      ),
    },
    {
      id: "versions",
      label: t("products.columns.version"),
      accessor: (p) => p.latestVersion || "—",
      width: "7.5rem",
      headerClassName: "whitespace-nowrap",
      cellClassName: "max-w-0",
      render: (p) => (
        <span className="block truncate text-sm text-gray-900" title={p.latestVersion || undefined}>
          {p.latestVersion || "—"}
        </span>
      ),
    },
    {
      id: "createdAt",
      label: t("products.columns.created"),
      accessor: (p) => p.createdAt,
      width: "10rem",
      headerClassName: "whitespace-nowrap",
      cellClassName: "whitespace-nowrap",
      render: (p) => (
        <span className="tabular-nums text-xs text-gray-500">
          {p.createdAt ? formatDate(p.createdAt) : "—"}
        </span>
      ),
    },
  ], [t, formatDate]);

  return (
    <AdminSurface
      eyebrow={t("products.eyebrow")}
      title={t("products.title")}
      description={t("products.description")}
      actions={(
        <AdminPrimaryButton onClick={() => openModal("addProduct")}>{t("products.addProduct")}</AdminPrimaryButton>
      )}
    >
      {!listLoading && listError ? (
        <DataLoadErrorPanel
          message={t("products.loadError")}
          error={listError}
          onRetry={loadProducts}
        />
      ) : (
        <>
      <AdminCard tone="default" padding="p-4 md:p-5" topAccent={false} className={PANEL_CLASS}>
        <div className="flex flex-wrap items-center gap-3">
          <AdminSearchInput value={query} onChange={setQuery} placeholder={t("products.searchPlaceholder")} />
          <AdminSelect value={statusF} onChange={setStatusF} options={statusFilterOptions} />
          <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            {listLoading ? "…" : t("common.countOf", { shown: filtered.length, total: products.length })}
          </span>
        </div>
      </AdminCard>

      <AdminCard tone="default" padding="p-1 md:p-2" topAccent={false} elevated className={`${PANEL_CLASS} overflow-hidden`}>
        {listLoading ? (
          <DestrovaTableSkeleton rows={8} />
        ) : (
          <AdminTable
            layout="fixed"
            scrollable={false}
            columns={columns}
            rows={filtered}
            getRowKey={(p) => p.id}
            onRowClick={(p) => setDrawerId(p.id)}
            sort={sort}
            onSort={onSort}
            empty={t("products.empty")}
          />
        )}
      </AdminCard>

      <ProductDrawer
        productId={drawerId}
        products={products}
        onClose={() => setDrawerId(null)}
        onSaved={loadProducts}
      />
        </>
      )}
    </AdminSurface>
  );
}

function ProductDrawer({ productId, products, onClose, onSaved }) {
  const { t } = useTranslation(["admin", "errors"]);
  const categoryOptions = useMemo(() => buildAdminCategorySelectOptions(t), [t]);
  const statusOptions = useMemo(() => buildAdminProductStatusSelectOptions(t), [t]);
  const row = useMemo(
    () => (productId ? products.find((p) => p.id === productId) : null),
    [productId, products],
  );
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    if (!row) {
      setDraft(null);
      return;
    }
    setDraft({
      name: row.name,
      description: row.description ?? "",
      category: normalizeProductCategory(row.category),
      latestVersion: row.latestVersion ?? "",
      status: row.status === "Passive" ? "Passive" : "Active",
    });
  }, [row]);

  if (!productId || !row || !draft) return <AdminDrawer open={false} onClose={onClose} />;

  const dirty = draft.name !== row.name
    || draft.description !== (row.description ?? "")
    || draft.category !== normalizeProductCategory(row.category)
    || draft.latestVersion !== (row.latestVersion ?? "")
    || draft.status !== row.status;

  const canPersist = row.fromApi && row.numericId != null;

  const persist = async () => {
    if (!draft.name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateProduct(row.numericId, {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        category: draft.category || null,
        latestVersion: draft.latestVersion.trim() || null,
        isActive: draft.status === "Active",
      });
      await onSaved();
      onClose();
    } catch (e) {
      setError(resolveApiUserMessage(e, { fallback: t("products.drawer.saveError"), t }));
    } finally {
      setSaving(false);
    }
  };

  const onSaveClick = async () => {
    if (!draft.name.trim() || saving) return;
    if (!canPersist) {
      setError(t("products.drawer.sampleSaveError"));
      return;
    }
    await persist();
  };

  const update = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <AdminDrawer
      open
      onClose={onClose}
      eyebrow={t("products.drawer.eyebrow")}
      title={row.name}
      width={560}
      footer={(
        <div className="flex items-center justify-end gap-2">
          <AdminGhostButton onClick={onClose} disabled={saving}>{t("common.cancel")}</AdminGhostButton>
          <AdminPrimaryButton
            onClick={onSaveClick}
            disabled={!dirty || saving || !draft.name.trim()}
          >
            {saving ? t("common.saving") : t("common.saveChanges")}
          </AdminPrimaryButton>
        </div>
      )}
    >
      {error ? (
        <p
          className="mb-4 rounded-lg border border-red-200/80 px-3 py-2 text-sm"
          style={{ color: ADMIN_LEVEL_TONE.error.fg, backgroundColor: ADMIN_LEVEL_TONE.error.bg }}
        >
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <AdminField label={t("products.drawer.name")}>
            <AdminInput value={draft.name} onChange={update("name")} placeholder={t("products.drawer.namePlaceholder")} />
          </AdminField>
        </div>
        <div className="sm:col-span-2">
          <AdminField label={t("products.drawer.description")}>
            <AdminInput value={draft.description} onChange={update("description")} placeholder={t("products.drawer.descriptionPlaceholder")} />
          </AdminField>
        </div>
        <AdminField label={t("products.drawer.category")}>
          <AdminSelect value={draft.category} onChange={update("category")} options={categoryOptions} />
        </AdminField>
        <AdminField label={t("products.drawer.latestVersion")}>
          <AdminInput value={draft.latestVersion} onChange={update("latestVersion")} placeholder={t("products.drawer.versionPlaceholder")} />
        </AdminField>
        <div className="sm:col-span-2">
          <AdminField label={t("products.drawer.status")}>
            <AdminSelect value={draft.status} onChange={update("status")} options={statusOptions} />
          </AdminField>
        </div>
      </div>
      <p className="mt-4 text-[11px] text-gray-500">
        {canPersist ? t("products.drawer.persistLive") : t("products.drawer.persistSample")}
      </p>
    </AdminDrawer>
  );
}
