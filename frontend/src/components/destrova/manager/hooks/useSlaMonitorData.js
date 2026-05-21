import { useEffect, useMemo, useState } from "react";
import { getAllTickets } from "../api/api";
import { MANAGER_SLA_HEALTH, MANAGER_TICKETS } from "../data/managerMock";
import { buildSlaMonitorViewModel } from "../utils/slaMonitorModel";

function normalizeAllTicketsList(raw) {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.tickets)) return raw.tickets;
  if (Array.isArray(raw.content)) return raw.content;
  return null;
}

export function useSlaMonitorData() {
  const [raw, setRaw] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    getAllTickets()
      .then((r) => {
        if (cancelled) return;
        const list = normalizeAllTicketsList(r);
        setRaw(list != null ? list : []);
      })
      .catch(() => {
        if (!cancelled) {
          setRaw(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    if (raw === undefined) {
      return {
        loading: true,
        metPct: null,
        breached: [],
        atRisk: [],
      };
    }
    if (raw === null) {
      return {
        loading: false,
        metPct: MANAGER_SLA_HEALTH.metPct,
        breached: MANAGER_TICKETS.filter((t) => t.sla.state === "breached"),
        atRisk: MANAGER_TICKETS.filter((t) => t.sla.state === "atRisk"),
      };
    }
    const { metPct, breached, atRisk } = buildSlaMonitorViewModel(raw);
    return {
      loading: false,
      metPct,
      breached,
      atRisk,
    };
  }, [raw]);
}
