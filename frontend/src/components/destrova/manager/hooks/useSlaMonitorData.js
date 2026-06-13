import { useCallback, useEffect, useMemo, useState } from "react";
import { getAllTickets } from "../api/api";
import { buildSlaMonitorViewModel } from "../utils/slaMonitorModel";

function normalizeAllTicketsList(raw) {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.tickets)) return raw.tickets;
  if (Array.isArray(raw.content)) return raw.content;
  return null;
}

export function useSlaMonitorData() {
  /** undefined = loading, null = failed, array = ready. */
  const [raw, setRaw] = useState(undefined);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    let cancelled = false;
    setRaw(undefined);
    setError(null);

    getAllTickets()
      .then((r) => {
        if (cancelled) return;
        const list = normalizeAllTicketsList(r);
        setRaw(list != null ? list : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setRaw(null);
          setError(err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load]);

  return useMemo(() => {
    if (raw === undefined) {
      return {
        loading: true,
        loadFailed: false,
        metPct: null,
        breached: [],
        atRisk: [],
        error: null,
        refetch: load,
      };
    }
    if (raw === null) {
      return {
        loading: false,
        loadFailed: true,
        metPct: null,
        breached: [],
        atRisk: [],
        error,
        refetch: load,
      };
    }
    const { metPct, breached, atRisk } = buildSlaMonitorViewModel(raw);
    return {
      loading: false,
      loadFailed: false,
      metPct,
      breached,
      atRisk,
      error: null,
      refetch: load,
    };
  }, [raw, error, load]);
}
