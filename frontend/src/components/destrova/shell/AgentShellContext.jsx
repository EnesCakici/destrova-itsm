import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const AgentShellContext = createContext(null);

export function AgentShellProvider({ children }) {
  const [ticketSearchQuery, setTicketSearchQuery] = useState("");
  const searchInputRef = useRef(null);
  const ticketOpenerRef = useRef(null);

  /** Agent inbox seçimini doğrudan günceller (workspace geldiyse). */
  const openTicket = useCallback((rawId) => {
    if (rawId == null || String(rawId).trim() === "") return;
    const id = String(rawId).trim();
    const fn = ticketOpenerRef.current;
    if (typeof fn === "function") {
      fn(id);
    }
  }, []);

  /** {@link AgentWorkspaceMain} inbox mount olduğunda kayıt; unmount’ta kaldır. */
  const registerTicketOpener = useCallback((fn) => {
    ticketOpenerRef.current = fn;
    return () => {
      if (ticketOpenerRef.current === fn) {
        ticketOpenerRef.current = null;
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      ticketSearchQuery,
      setTicketSearchQuery,
      searchInputRef,
      openTicket,
      registerTicketOpener,
    }),
    [ticketSearchQuery, openTicket, registerTicketOpener],
  );

  return <AgentShellContext.Provider value={value}>{children}</AgentShellContext.Provider>;
}

export function useAgentShell() {
  const ctx = useContext(AgentShellContext);
  if (!ctx) {
    return {
      ticketSearchQuery: "",
      setTicketSearchQuery: () => {},
      searchInputRef: { current: null },
      openTicket: () => {},
      registerTicketOpener: () => () => {},
    };
  }
  return ctx;
}
