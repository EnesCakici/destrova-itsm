import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addTeamMember,
  addTeamProduct,
  createTeam,
  getActiveProducts,
  getAgentCapacities,
  getTeamById,
  getTeams,
  removeTeamMember,
  removeTeamProduct,
  updateTeam,
} from "../api/api";
import { getApiErrorMessage } from "../../../../services/api";
import {
  MANAGER_CHROME,
  MANAGER_COLORS,
  MANAGER_GHOST_BUTTON,
  MANAGER_SHELL_LIST,
  MANAGER_STATUS,
  SAAS_BUTTON,
} from "../managerTokens";
import ManagerCard, { ManagerCardHeader } from "./ManagerCard";
import ManagerSurface from "./ManagerSurface";

function normalizeAgent(raw) {
  if (raw == null) return null;
  const id = raw.agentId ?? raw.id;
  if (id == null) return null;
  const name = raw.agentName ?? raw.name ?? `Agent #${id}`;
  return { id: Number(id), name: String(name) };
}

function ModalShell({ title, subtitle, onClose, busy, children, size = "sm" }) {
  const isLarge = size === "lg";
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manager-teams-modal-title"
    >
      <div
        className="absolute inset-0 cursor-default bg-slate-900/40 backdrop-blur-[1px]"
        onClick={() => { if (!busy) onClose(); }}
        aria-hidden
      />
      <div
        className={[
          "relative z-10 flex w-full flex-col overflow-hidden border border-gray-200 bg-white shadow-[0_8px_32px_rgba(15,23,42,0.12)]",
          isLarge
            ? "max-h-[92vh] max-w-3xl rounded-t-2xl sm:max-h-[min(90vh,720px)] sm:rounded-2xl"
            : "max-h-[85vh] max-w-lg rounded-t-2xl sm:rounded-2xl",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 md:px-6">
          <div className="min-w-0 pr-2">
            <h2
              id="manager-teams-modal-title"
              className="text-base font-semibold tracking-tight text-slate-900 md:text-lg"
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 truncate text-sm text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            className={`manager-ghost-btn inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 ${MANAGER_GHOST_BUTTON}`}
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden>
              <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div
          className={[
            "destrova-manager-feed-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-6",
            isLarge ? "md:py-5" : "",
          ].join(" ")}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

const INPUT_CLASS =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(37,99,235,0.22)] disabled:opacity-60";

function SectionTitle({ children }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
      {children}
    </h3>
  );
}

function AssigneeRow({ label, onRemove, disabled }) {
  return (
    <li className="flex items-center justify-between gap-2 py-2.5">
      <span className="min-w-0 truncate text-sm font-medium text-slate-900">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        className={`manager-ghost-btn shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 ${MANAGER_GHOST_BUTTON}`}
      >
        Remove
      </button>
    </li>
  );
}

function FieldSelect({ label, value, options, onChange, disabled }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs" style={{ color: MANAGER_COLORS.muted }}>
      <span className="font-semibold uppercase tracking-[0.14em]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(37,99,235,0.22)] disabled:opacity-60"
        style={{
          color: MANAGER_COLORS.dark,
          boxShadow: MANAGER_CHROME.inputInset,
        }}
      >
        {options.map((opt) => (
          <option key={opt.value || "_empty"} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}

function PrimaryButton({ children, onClick, disabled, type = "button", className = "", size = "sm" }) {
  const sizeClass = size === "md" ? SAAS_BUTTON.primary : SAAS_BUTTON.primarySm;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[sizeClass, className].filter(Boolean).join(" ")}
    >
      {children}
    </button>
  );
}

function CreateTeamHeaderButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${SAAS_BUTTON.primary} inline-flex h-10 items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold tracking-tight`}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 opacity-95" fill="none" aria-hidden>
        <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      Create Team
    </button>
  );
}

function SecondaryButton({ children, onClick, disabled, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 items-center rounded-lg border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-800 transition-colors duration-150 hover:bg-slate-50 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function TeamCard({ team, onManage }) {
  const memberCount = Array.isArray(team.members) ? team.members.length : 0;
  const productCount = Array.isArray(team.products) ? team.products.length : 0;

  return (
    <ManagerCard padding="p-5 md:p-6" tone="default" interactive elevated className="border border-gray-200 bg-white">
      <ManagerCardHeader
        title={team.name}
        hint={team.description?.trim() || "No description"}
        action={(
          <button
            type="button"
            onClick={() => onManage(team)}
            className={SAAS_BUTTON.primarySm}
          >
            Manage
          </button>
        )}
      />
      <div className="mt-4 flex flex-wrap gap-3 text-xs" style={{ color: MANAGER_COLORS.support }}>
        <span>
          <span className="font-semibold tabular-nums" style={{ color: MANAGER_COLORS.dark }}>{memberCount}</span>
          {" "}member{memberCount === 1 ? "" : "s"}
        </span>
        <span aria-hidden>·</span>
        <span>
          <span className="font-semibold tabular-nums" style={{ color: MANAGER_COLORS.dark }}>{productCount}</span>
          {" "}product{productCount === 1 ? "" : "s"}
        </span>
      </div>
    </ManagerCard>
  );
}

export default function ManagerTeamsView() {
  const [teams, setTeams] = useState([]);
  const [agents, setAgents] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState(null);

  const [manageTeam, setManageTeam] = useState(null);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageError, setManageError] = useState(null);
  const [manageSaving, setManageSaving] = useState(false);
  const [addMemberId, setAddMemberId] = useState("");
  const [addProductId, setAddProductId] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const loadTeams = useCallback(async () => {
    const data = await getTeams();
    setTeams(Array.isArray(data) ? data : []);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [teamsData, capacities, productsData] = await Promise.all([
        getTeams(),
        getAgentCapacities(),
        getActiveProducts(),
      ]);
      setTeams(Array.isArray(teamsData) ? teamsData : []);
      setAgents(
        (Array.isArray(capacities) ? capacities : [])
          .map(normalizeAgent)
          .filter(Boolean),
      );
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (e) {
      setError(getApiErrorMessage(e, "Could not load teams."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openManage = async (team) => {
    setManageTeam(team);
    setManageError(null);
    setAddMemberId("");
    setAddProductId("");
    setManageLoading(true);
    try {
      const detail = await getTeamById(team.id);
      setManageTeam(detail);
      setEditName(detail.name ?? "");
      setEditDescription(detail.description ?? "");
    } catch (e) {
      setManageError(getApiErrorMessage(e, "Could not load team details."));
    } finally {
      setManageLoading(false);
    }
  };

  const closeManage = () => {
    if (manageSaving) return;
    setManageTeam(null);
    setManageError(null);
    setAddMemberId("");
    setAddProductId("");
    setEditName("");
    setEditDescription("");
  };

  const handleSaveDetails = async () => {
    if (!manageTeam) return;
    const name = editName.trim();
    if (!name) {
      setManageError("Team name is required.");
      return;
    }
    setManageSaving(true);
    setManageError(null);
    try {
      const updated = await updateTeam(manageTeam.id, {
        name,
        description: editDescription.trim() || null,
      });
      setManageTeam(updated);
      setEditName(updated.name ?? "");
      setEditDescription(updated.description ?? "");
      await loadTeams();
    } catch (e) {
      setManageError(getApiErrorMessage(e, "Could not update team."));
    } finally {
      setManageSaving(false);
    }
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    const name = createName.trim();
    if (!name) {
      setCreateError("Team name is required.");
      return;
    }
    setCreateSaving(true);
    setCreateError(null);
    try {
      await createTeam({
        name,
        description: createDescription.trim() || null,
      });
      await loadTeams();
      setCreateOpen(false);
      setCreateName("");
      setCreateDescription("");
    } catch (err) {
      setCreateError(getApiErrorMessage(err, "Could not create team."));
    } finally {
      setCreateSaving(false);
    }
  };

  const refreshManageTeam = async (teamId) => {
    const detail = await getTeamById(teamId);
    setManageTeam(detail);
    setEditName(detail.name ?? "");
    setEditDescription(detail.description ?? "");
    await loadTeams();
  };

  const handleAddMember = async () => {
    if (!manageTeam || !addMemberId) return;
    setManageSaving(true);
    setManageError(null);
    try {
      await addTeamMember(manageTeam.id, Number(addMemberId));
      await refreshManageTeam(manageTeam.id);
      setAddMemberId("");
    } catch (e) {
      setManageError(getApiErrorMessage(e, "Could not add member."));
    } finally {
      setManageSaving(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!manageTeam) return;
    setManageSaving(true);
    setManageError(null);
    try {
      await removeTeamMember(manageTeam.id, userId);
      await refreshManageTeam(manageTeam.id);
    } catch (e) {
      setManageError(getApiErrorMessage(e, "Could not remove member."));
    } finally {
      setManageSaving(false);
    }
  };

  const handleAddProduct = async () => {
    if (!manageTeam || !addProductId) return;
    setManageSaving(true);
    setManageError(null);
    try {
      await addTeamProduct(manageTeam.id, Number(addProductId));
      await refreshManageTeam(manageTeam.id);
      setAddProductId("");
    } catch (e) {
      setManageError(getApiErrorMessage(e, "Could not add product."));
    } finally {
      setManageSaving(false);
    }
  };

  const handleRemoveProduct = async (productId) => {
    if (!manageTeam) return;
    setManageSaving(true);
    setManageError(null);
    try {
      await removeTeamProduct(manageTeam.id, productId);
      await refreshManageTeam(manageTeam.id);
    } catch (e) {
      setManageError(getApiErrorMessage(e, "Could not remove product."));
    } finally {
      setManageSaving(false);
    }
  };

  const memberIds = useMemo(
    () => new Set((manageTeam?.members ?? []).map((m) => m.id)),
    [manageTeam],
  );

  const productIds = useMemo(
    () => new Set((manageTeam?.products ?? []).map((p) => p.id)),
    [manageTeam],
  );

  const availableAgents = useMemo(
    () => agents.filter((a) => !memberIds.has(a.id)),
    [agents, memberIds],
  );

  const availableProducts = useMemo(
    () => products.filter((p) => !productIds.has(p.id)),
    [products, productIds],
  );

  return (
    <ManagerSurface
      eyebrow="Organization"
      title="Teams"
      description="Group agents by product expertise. Agents only see unassigned tickets for their team's products."
      actions={(
        <CreateTeamHeaderButton onClick={() => { setCreateOpen(true); setCreateError(null); }} />
      )}
    >
      {loading ? (
        <ManagerCard padding="p-6">
          <p className="text-sm" style={{ color: MANAGER_COLORS.support }}>Loading teams…</p>
        </ManagerCard>
      ) : null}

      {error && !loading ? (
        <ManagerCard padding="p-6" tone="breached">
          <p className="text-sm font-semibold" style={{ color: MANAGER_STATUS.breached.fg }} role="alert">
            {error}
          </p>
          <div className="mt-3">
            <SecondaryButton onClick={loadAll}>Retry</SecondaryButton>
          </div>
        </ManagerCard>
      ) : null}

      {!loading && !error && teams.length === 0 ? (
        <ManagerCard padding="p-8 md:p-10" tone="neutral" elevated>
          <p className="text-center text-sm" style={{ color: MANAGER_COLORS.support }}>
            No teams yet. Create your first team.
          </p>
        </ManagerCard>
      ) : null}

      {!loading && !error && teams.length > 0 ? (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} onManage={openManage} />
          ))}
        </section>
      ) : null}

      {createOpen ? (
        <ModalShell
          title="Create team"
          subtitle="Name your team and optionally add a short description."
          onClose={() => { if (!createSaving) { setCreateOpen(false); setCreateName(""); setCreateDescription(""); setCreateError(null); } }}
          busy={createSaving}
        >
          <form onSubmit={submitCreate} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-xs" style={{ color: MANAGER_COLORS.muted }}>
              <span className="font-semibold uppercase tracking-[0.14em]">Name *</span>
              <input
                type="text"
                value={createName}
                onChange={(e) => { setCreateName(e.target.value); setCreateError(null); }}
                disabled={createSaving}
                required
                maxLength={120}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(37,99,235,0.22)] disabled:opacity-60"
                style={{
                  color: MANAGER_COLORS.dark,
                  boxShadow: MANAGER_CHROME.inputInset,
                }}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs" style={{ color: MANAGER_COLORS.muted }}>
              <span className="font-semibold uppercase tracking-[0.14em]">Description</span>
              <textarea
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                disabled={createSaving}
                rows={3}
                maxLength={500}
                className="resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(37,99,235,0.22)] disabled:opacity-60"
                style={{
                  color: MANAGER_COLORS.dark,
                  boxShadow: MANAGER_CHROME.inputInset,
                }}
              />
            </label>
            {createError ? (
              <p className="text-xs" style={{ color: MANAGER_STATUS.breached.fg }} role="alert">{createError}</p>
            ) : null}
            <div className="mt-1 flex flex-wrap gap-2">
              <PrimaryButton type="submit" disabled={createSaving}>
                {createSaving ? "Creating…" : "Create"}
              </PrimaryButton>
              <SecondaryButton
                type="button"
                disabled={createSaving}
                onClick={() => { setCreateOpen(false); setCreateName(""); setCreateDescription(""); setCreateError(null); }}
              >
                Cancel
              </SecondaryButton>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {manageTeam ? (
        <ModalShell
          size="lg"
          title="Manage team"
          subtitle={editName.trim() || manageTeam.name}
          onClose={closeManage}
          busy={manageSaving || manageLoading}
        >
          {manageLoading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading team…</p>
          ) : (
            <>
              {manageError ? (
                <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700" role="alert">
                  {manageError}
                </p>
              ) : null}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
                <section className="lg:col-span-4">
                  <SectionTitle>Team details</SectionTitle>
                  <div className="mt-3 flex flex-col gap-3 rounded-xl border border-gray-200 bg-slate-50/50 p-4">
                    <label className="flex flex-col gap-1.5 text-xs text-slate-500">
                      <span className="font-semibold uppercase tracking-[0.14em]">Name *</span>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => { setEditName(e.target.value); setManageError(null); }}
                        disabled={manageSaving}
                        maxLength={120}
                        className={`${INPUT_CLASS} font-semibold text-slate-900`}
                        style={{ boxShadow: MANAGER_CHROME.inputInset }}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs text-slate-500">
                      <span className="font-semibold uppercase tracking-[0.14em]">Description</span>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        disabled={manageSaving}
                        rows={3}
                        maxLength={500}
                        className={`${INPUT_CLASS} resize-none text-slate-800`}
                        style={{ boxShadow: MANAGER_CHROME.inputInset }}
                      />
                    </label>
                    <PrimaryButton disabled={manageSaving || !editName.trim()} onClick={handleSaveDetails}>
                      {manageSaving ? "Saving…" : "Save details"}
                    </PrimaryButton>
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:col-span-8">
                  <section className="flex min-h-0 flex-col rounded-xl border border-gray-200 bg-white">
                    <div className="border-b border-gray-100 px-4 py-3">
                      <SectionTitle>Members</SectionTitle>
                      <p className="mt-1 text-xs text-slate-500">
                        {(manageTeam.members ?? []).length} assigned
                      </p>
                    </div>
                    <ul
                      className={`${MANAGER_SHELL_LIST} destrova-manager-feed-scroll max-h-44 divide-y divide-slate-100 overflow-y-auto px-4`}
                    >
                      {(manageTeam.members ?? []).length === 0 ? (
                        <li className="py-6 text-center text-sm text-slate-500">No members yet.</li>
                      ) : null}
                      {(manageTeam.members ?? []).map((member) => (
                        <AssigneeRow
                          key={member.id}
                          label={member.name}
                          disabled={manageSaving}
                          onRemove={() => handleRemoveMember(member.id)}
                        />
                      ))}
                    </ul>
                    <div className="mt-auto flex flex-col gap-2 border-t border-gray-100 p-4 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1">
                        <FieldSelect
                          label="Add member"
                          value={addMemberId}
                          onChange={setAddMemberId}
                          disabled={manageSaving || availableAgents.length === 0}
                          options={[
                            { value: "", label: availableAgents.length ? "Select agent…" : "No agents available" },
                            ...availableAgents.map((a) => ({ value: String(a.id), label: a.name })),
                          ]}
                        />
                      </div>
                      <PrimaryButton
                        className="shrink-0 sm:mb-0.5"
                        disabled={manageSaving || !addMemberId}
                        onClick={handleAddMember}
                      >
                        Add
                      </PrimaryButton>
                    </div>
                  </section>

                  <section className="flex min-h-0 flex-col rounded-xl border border-gray-200 bg-white">
                    <div className="border-b border-gray-100 px-4 py-3">
                      <SectionTitle>Products</SectionTitle>
                      <p className="mt-1 text-xs text-slate-500">
                        {(manageTeam.products ?? []).length} assigned
                      </p>
                    </div>
                    <ul
                      className={`${MANAGER_SHELL_LIST} destrova-manager-feed-scroll max-h-44 divide-y divide-slate-100 overflow-y-auto px-4`}
                    >
                      {(manageTeam.products ?? []).length === 0 ? (
                        <li className="py-6 text-center text-sm text-slate-500">No products assigned.</li>
                      ) : null}
                      {(manageTeam.products ?? []).map((product) => (
                        <AssigneeRow
                          key={product.id}
                          label={product.name}
                          disabled={manageSaving}
                          onRemove={() => handleRemoveProduct(product.id)}
                        />
                      ))}
                    </ul>
                    <div className="mt-auto flex flex-col gap-2 border-t border-gray-100 p-4 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1">
                        <FieldSelect
                          label="Add product"
                          value={addProductId}
                          onChange={setAddProductId}
                          disabled={manageSaving || availableProducts.length === 0}
                          options={[
                            { value: "", label: availableProducts.length ? "Select product…" : "No products available" },
                            ...availableProducts.map((p) => ({ value: String(p.id), label: p.name })),
                          ]}
                        />
                      </div>
                      <PrimaryButton
                        className="shrink-0 sm:mb-0.5"
                        disabled={manageSaving || !addProductId}
                        onClick={handleAddProduct}
                      >
                        Add
                      </PrimaryButton>
                    </div>
                  </section>
                </div>
              </div>

              <div className="mt-6 flex justify-end border-t border-gray-100 pt-4">
                <SecondaryButton disabled={manageSaving} onClick={closeManage}>
                  Done
                </SecondaryButton>
              </div>
            </>
          )}
        </ModalShell>
      ) : null}
    </ManagerSurface>
  );
}
