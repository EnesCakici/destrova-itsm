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
import { MANAGER_COLORS, MANAGER_STATUS } from "../managerTokens";
import ManagerCard, { ManagerCardHeader } from "./ManagerCard";
import ManagerSurface from "./ManagerSurface";

function normalizeAgent(raw) {
  if (raw == null) return null;
  const id = raw.agentId ?? raw.id;
  if (id == null) return null;
  const name = raw.agentName ?? raw.name ?? `Agent #${id}`;
  return { id: Number(id), name: String(name) };
}

function ModalShell({ title, subtitle, onClose, busy, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manager-teams-modal-title"
    >
      <div
        className="absolute inset-0 cursor-default bg-[rgba(15,14,71,0.4)]"
        onClick={() => { if (!busy) onClose(); }}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <ManagerCard padding="p-5 md:p-6" tone="muted" topAccent={false} elevated>
          <p id="manager-teams-modal-title" className="text-sm font-semibold" style={{ color: MANAGER_COLORS.dark }}>
            {title}
          </p>
          {subtitle ? (
            <p className="mt-1 text-sm" style={{ color: MANAGER_COLORS.support }}>{subtitle}</p>
          ) : null}
          <div className="mt-4">{children}</div>
        </ManagerCard>
      </div>
    </div>
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
        className="rounded-lg border-0 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(39,39,87,0.22)] disabled:opacity-60"
        style={{
          color: MANAGER_COLORS.dark,
          boxShadow: "0 0 0 1px rgba(39,39,87,0.08) inset, 0 1px 0 rgba(15,14,71,0.04)",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value || "_empty"} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}

function PrimaryButton({ children, onClick, disabled, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 items-center rounded-lg px-4 text-xs font-semibold transition-opacity duration-150 disabled:opacity-60"
      style={{ color: MANAGER_COLORS.surface, backgroundColor: MANAGER_COLORS.dark }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, disabled, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 items-center rounded-lg px-4 text-xs font-semibold transition-opacity duration-150 disabled:opacity-60"
      style={{
        color: MANAGER_COLORS.dark,
        backgroundColor: "rgba(255,255,255,0.7)",
        boxShadow: "0 0 0 1px rgba(39,39,87,0.08) inset",
      }}
    >
      {children}
    </button>
  );
}

function TeamCard({ team, onManage }) {
  const memberCount = Array.isArray(team.members) ? team.members.length : 0;
  const productCount = Array.isArray(team.products) ? team.products.length : 0;

  return (
    <ManagerCard padding="p-5 md:p-6" tone="primary" interactive elevated>
      <ManagerCardHeader
        title={team.name}
        hint={team.description?.trim() || "No description"}
        action={(
          <button
            type="button"
            onClick={() => onManage(team)}
            className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold transition-[background-color] duration-150 hover:bg-[rgba(39,39,87,0.85)]"
            style={{ color: MANAGER_COLORS.surface, backgroundColor: MANAGER_COLORS.dark }}
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
        <PrimaryButton onClick={() => { setCreateOpen(true); setCreateError(null); }}>
          Create Team
        </PrimaryButton>
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
                className="rounded-lg border-0 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(39,39,87,0.22)] disabled:opacity-60"
                style={{
                  color: MANAGER_COLORS.dark,
                  boxShadow: "0 0 0 1px rgba(39,39,87,0.08) inset, 0 1px 0 rgba(15,14,71,0.04)",
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
                className="resize-none rounded-lg border-0 bg-white px-3 py-2.5 text-sm outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(39,39,87,0.22)] disabled:opacity-60"
                style={{
                  color: MANAGER_COLORS.dark,
                  boxShadow: "0 0 0 1px rgba(39,39,87,0.08) inset, 0 1px 0 rgba(15,14,71,0.04)",
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
          title="Manage team"
          subtitle={editName.trim() || manageTeam.name}
          onClose={closeManage}
          busy={manageSaving || manageLoading}
        >
          {manageLoading ? (
            <p className="text-sm" style={{ color: MANAGER_COLORS.support }}>Loading team…</p>
          ) : (
            <div className="space-y-6">
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>
                  Team details
                </h3>
                <div className="mt-2 flex flex-col gap-3">
                  <label className="flex flex-col gap-1.5 text-xs" style={{ color: MANAGER_COLORS.muted }}>
                    <span className="font-semibold uppercase tracking-[0.14em]">Name *</span>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => { setEditName(e.target.value); setManageError(null); }}
                      disabled={manageSaving}
                      maxLength={120}
                      className="rounded-lg border-0 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(39,39,87,0.22)] disabled:opacity-60"
                      style={{
                        color: MANAGER_COLORS.dark,
                        boxShadow: "0 0 0 1px rgba(39,39,87,0.08) inset, 0 1px 0 rgba(15,14,71,0.04)",
                      }}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs" style={{ color: MANAGER_COLORS.muted }}>
                    <span className="font-semibold uppercase tracking-[0.14em]">Description</span>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      disabled={manageSaving}
                      rows={2}
                      maxLength={500}
                      className="resize-none rounded-lg border-0 bg-white px-3 py-2.5 text-sm outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(39,39,87,0.22)] disabled:opacity-60"
                      style={{
                        color: MANAGER_COLORS.dark,
                        boxShadow: "0 0 0 1px rgba(39,39,87,0.08) inset, 0 1px 0 rgba(15,14,71,0.04)",
                      }}
                    />
                  </label>
                  <div>
                    <PrimaryButton disabled={manageSaving || !editName.trim()} onClick={handleSaveDetails}>
                      {manageSaving ? "Saving…" : "Save details"}
                    </PrimaryButton>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>
                  Members
                </h3>
                <ul className="mt-2 space-y-2">
                  {(manageTeam.members ?? []).length === 0 ? (
                    <li className="text-sm" style={{ color: MANAGER_COLORS.support }}>No members yet.</li>
                  ) : null}
                  {(manageTeam.members ?? []).map((member) => (
                    <li
                      key={member.id}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                      style={{ backgroundColor: "rgba(39,39,87,0.04)" }}
                    >
                      <span className="truncate text-sm font-semibold" style={{ color: MANAGER_COLORS.dark }}>
                        {member.name}
                      </span>
                      <SecondaryButton
                        disabled={manageSaving}
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        Remove
                      </SecondaryButton>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <FieldSelect
                    label="Add member"
                    value={addMemberId}
                    onChange={setAddMemberId}
                    disabled={manageSaving || availableAgents.length === 0}
                    options={[
                      { value: "", label: availableAgents.length ? "— Select agent —" : "— No agents available —" },
                      ...availableAgents.map((a) => ({ value: String(a.id), label: a.name })),
                    ]}
                  />
                  <PrimaryButton disabled={manageSaving || !addMemberId} onClick={handleAddMember}>
                    Add
                  </PrimaryButton>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>
                  Products
                </h3>
                <ul className="mt-2 space-y-2">
                  {(manageTeam.products ?? []).length === 0 ? (
                    <li className="text-sm" style={{ color: MANAGER_COLORS.support }}>No products assigned.</li>
                  ) : null}
                  {(manageTeam.products ?? []).map((product) => (
                    <li
                      key={product.id}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                      style={{ backgroundColor: "rgba(39,39,87,0.04)" }}
                    >
                      <span className="truncate text-sm font-semibold" style={{ color: MANAGER_COLORS.dark }}>
                        {product.name}
                      </span>
                      <SecondaryButton
                        disabled={manageSaving}
                        onClick={() => handleRemoveProduct(product.id)}
                      >
                        Remove
                      </SecondaryButton>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <FieldSelect
                    label="Add product"
                    value={addProductId}
                    onChange={setAddProductId}
                    disabled={manageSaving || availableProducts.length === 0}
                    options={[
                      { value: "", label: availableProducts.length ? "— Select product —" : "— No products available —" },
                      ...availableProducts.map((p) => ({ value: String(p.id), label: p.name })),
                    ]}
                  />
                  <PrimaryButton disabled={manageSaving || !addProductId} onClick={handleAddProduct}>
                    Add
                  </PrimaryButton>
                </div>
              </section>

              {manageError ? (
                <p className="text-xs" style={{ color: MANAGER_STATUS.breached.fg }} role="alert">{manageError}</p>
              ) : null}

              <div className="flex justify-end">
                <SecondaryButton disabled={manageSaving} onClick={closeManage}>Close</SecondaryButton>
              </div>
            </div>
          )}
        </ModalShell>
      ) : null}
    </ManagerSurface>
  );
}
