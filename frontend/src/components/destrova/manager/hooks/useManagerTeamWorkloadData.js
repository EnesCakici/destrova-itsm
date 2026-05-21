import { useCallback, useEffect, useState } from "react";
import { getAgentCapacities } from "../api/api";
import { MANAGER_TEAM_FULL, MANAGER_TICKETS } from "../data/managerMock";

const MOCK_TICKETS = MANAGER_TICKETS;

function normalizeAgentRow(raw) {
  if (raw == null || raw.agentId == null) return null;
  const { agentId, agentName, activeTicketCount, maxTicketLimit } = raw;
  const label = agentName || `Agent #${agentId}`;
  return {
    id: String(agentId),
    agentId,
    name: label,
    role: "Agent",
    email: "",
    short: label,
    load: activeTicketCount ?? 0,
    capacity: maxTicketLimit ?? 1,
  };
}

function normalizeAgentsFromPayload(data) {
  if (!Array.isArray(data) || data.length === 0) return null;
  const agents = data.map(normalizeAgentRow).filter(Boolean);
  return agents.length > 0 ? agents : null;
}

export function useManagerTeamWorkloadData() {
  const [agents, setAgents] = useState(MANAGER_TEAM_FULL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAgentCapacities();
      const next = normalizeAgentsFromPayload(data);
      setAgents(next ?? MANAGER_TEAM_FULL);
    } catch (e) {
      setAgents(MANAGER_TEAM_FULL);
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    agents,
    tickets: MOCK_TICKETS,
    loading,
    error,
    refetch: load,
  };
}
