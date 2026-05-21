//Products → AdminProductsCatalogView.jsx
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
  ADMIN_PRODUCTS,
  ADMIN_PRODUCT_CATEGORIES,
  ADMIN_PRODUCT_STATUSES,
} from "../../data/adminMock";
import { ADMIN_COLORS } from "../../adminTokens";
import { useAdminWorkspace } from "../AdminWorkspaceContext";
import { getAdminProducts, getApiErrorMessage, updateProduct} from "../../../../../services/api";

const PRODUCT_TONE = { Active: "success", Passive: "neutral" };

function normalizeProductCategory(value) {
  if (value && ADMIN_PRODUCT_CATEGORIES.includes(value)) return value;
  return "Other";
}

function formatCreatedForTable(createdAt) {
  if (!createdAt) return "—";
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("tr-TR");
}

/** API yanıtını tablo + drawer satır şekline çevirir. */
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

/** Mock satırları aynı şema ile kullan (numericId yok). */
function mapMockProductToRow(p) {
  return {
    ...p,
    numericId: undefined,
    category: normalizeProductCategory(p.category),
    latestVersion: p.versions?.[0]?.name ?? "",
    fromApi: false,
  };
}

/**
 * Products / Catalog — list + side drawer for version management.
 *
 * Liste öncelikle GET /api/admin/products ile dolar; hata olursa adminMock ADMIN_PRODUCTS kullanılır.
 */
export default function AdminProductsCatalogView() {
  const { openModal, selectedEntity, adminProductsRefreshToken } = useAdminWorkspace();
  const [query, setQuery]     = useState("");
  const [statusF, setStatusF] = useState("All statuses");
  const [drawerId, setDrawerId] = useState(null);
  const [products, setProducts] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);
  const [usingLiveApi, setUsingLiveApi] = useState(false);

  const loadProducts = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const raw = await getAdminProducts();
      const rows = Array.isArray(raw) ? raw.map(mapApiProductToRow) : [];
      setProducts(rows);
      setUsingLiveApi(true);
    } catch (e) {
      setProducts(ADMIN_PRODUCTS.map(mapMockProductToRow));
      setUsingLiveApi(false);
      setListError(getApiErrorMessage(e, "Could not load products."));
    } finally {
      setListLoading(false);
    }
  }, []);

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
      if (statusF !== "All statuses" && p.status !== statusF) return false;
      return true;
    });
  }, [query, statusF, products]);

  const { sort, onSort } = useSort("name", "asc");

  const columns = [
    { id: "name", label: "Product", accessor: (p) => p.name,
      render: (p) => (
        <div className="min-w-0">
          <p className="truncate font-semibold" style={{ color: ADMIN_COLORS.dark }}>{p.name}</p>
          <p className="truncate text-xs" style={{ color: ADMIN_COLORS.muted }}>{p.description}</p>
        </div>
      ),
    },
    { id: "status", label: "Status", accessor: (p) => p.status,
      render: (p) => <AdminStatePill tone={PRODUCT_TONE[p.status]}>{p.status}</AdminStatePill>,
    },
    {
      id: "versions",
      label: "Versions",
      accessor: (p) => p.latestVersion || "—",
      render: (p) => (
        <span className="text-sm" style={{ color: ADMIN_COLORS.dark }}>{p.latestVersion || "—"}</span>
      ),
    },
    {
      id: "createdAt",
      label: "Created",
      accessor: (p) => p.createdAt,
      render: (p) => (
        <span className="tabular-nums text-xs" style={{ color: ADMIN_COLORS.muted }}>
          {formatCreatedForTable(p.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <AdminSurface
      eyebrow="Configuration"
      title="Products / Catalog"
      description="Products are required on every ticket. Inactive products are hidden from new tickets but historical references stay intact."
      actions={(
        <AdminPrimaryButton onClick={() => openModal("addProduct")}>+ Add product</AdminPrimaryButton>
      )}
    >
      {!usingLiveApi && listError ? (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Offline sample data (API unavailable). {listError}
        </p>
      ) : null}

      <AdminCard tone="muted" padding="p-4" topAccent={false}>
        <div className="flex flex-wrap items-center gap-3">
          <AdminSearchInput value={query} onChange={setQuery} placeholder="Search by name or description" />
          <AdminSelect value={statusF} onChange={setStatusF} options={["All statuses", ...ADMIN_PRODUCT_STATUSES]} />
          <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: ADMIN_COLORS.muted }}>
            {listLoading ? "…" : `${filtered.length} of ${products.length}`}
            {usingLiveApi ? " · live" : ""}
          </span>
        </div>
      </AdminCard>

      <AdminCard tone="default" padding="p-2 md:p-3" elevated>
        <AdminTable
          columns={columns}
          rows={filtered}
          getRowKey={(p) => p.id}
          onRowClick={(p) => setDrawerId(p.id)}
          sort={sort}
          onSort={onSort}
          empty={listLoading ? "Loading products…" : "No products match the current filters."}
        />
      </AdminCard>

      <ProductDrawer
        productId={drawerId}
        products={products}
        onClose={() => setDrawerId(null)}
        onSaved={loadProducts}
      />
    </AdminSurface>
  );
}

function ProductDrawer({ productId, products, onClose, onSaved }) {
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
      setError(getApiErrorMessage(e, "Could not save product."));
    } finally {
      setSaving(false);
    }
  };

  const onSaveClick = async () => {
    if (!draft.name.trim() || saving) return;
    if (!canPersist) {
      setError("Örnek ürün kaydedilemez. API’den yüklenen bir ürün seçin.");
      return;
    }
    await persist();
  };

  const update = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <AdminDrawer
      open
      onClose={onClose}
      eyebrow="Product"
      title={row.name}
      width={560}
      footer={(
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px]" style={{ color: ADMIN_COLORS.muted }}>
            {canPersist ? "Değişiklikler sunucuya kaydedilir." : "Örnek satır — kayıt yalnızca API ürünleri için."}
            {error ? <span className="mt-1 block text-red-600">{error}</span> : null}
          </p>
          <div className="flex gap-2">
            <AdminGhostButton onClick={onClose} disabled={saving}>Cancel</AdminGhostButton>
            <AdminPrimaryButton
              onClick={onSaveClick}
              disabled={!dirty || saving || !draft.name.trim()}
            >
              {saving ? "Saving…" : "Save changes"}
            </AdminPrimaryButton>
          </div>
        </div>
      )}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <AdminField label="Name">
            <AdminInput value={draft.name} onChange={update("name")} placeholder="Product name" />
          </AdminField>
        </div>
        <div className="sm:col-span-2">
          <AdminField label="Description">
            <AdminInput value={draft.description} onChange={update("description")} placeholder="Summary" />
          </AdminField>
        </div>
        <AdminField label="Category">
          <AdminSelect value={draft.category} onChange={update("category")} options={ADMIN_PRODUCT_CATEGORIES} />
        </AdminField>
        <AdminField label="Latest version">
          <AdminInput value={draft.latestVersion} onChange={update("latestVersion")} placeholder="e.g. v2.5.0" />
        </AdminField>
        <div className="sm:col-span-2">
          <AdminField label="Status">
            <AdminSelect value={draft.status} onChange={update("status")} options={ADMIN_PRODUCT_STATUSES} />
          </AdminField>
        </div>
      </div>
    </AdminDrawer>
  );
}
