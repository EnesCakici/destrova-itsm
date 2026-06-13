import { useCallback, useEffect, useState } from "react";
import { getAgentCapacities } from "../api/api";

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
  if (!Array.isArray(data) || data.length === 0) return [];
  return data.map(normalizeAgentRow).filter(Boolean);
}

export function useManagerTeamWorkloadData() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAgentCapacities();
      setAgents(normalizeAgentsFromPayload(data));
    } catch (e) {
      setAgents([]);
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
    loading,
    loadFailed: !loading && error != null,
    error,
    refetch: load,
  };
}
