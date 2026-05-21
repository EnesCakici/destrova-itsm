import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTickets } from "../../../../hooks/useTickets";
import { CustomerTicketsPanel } from "../preview/CustomerPreviewPage";

/**
 * Production container: loads tickets, wires router navigation, syncs ?created=1 toast with URL.
 */
export default function CustomerTicketsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const showCreatedToast = searchParams.get("created") === "1";
  const { tickets, loading, error } = useTickets();
  const [seenUpdatedAtByTicket, setSeenUpdatedAtByTicket] = useState({});

  useEffect(() => {
    if (!showCreatedToast) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("created");
          return next;
        },
        { replace: true },
      );
    }, 2500);
    return () => clearTimeout(timer);
  }, [showCreatedToast, setSearchParams]);

  return (
    <>
      {showCreatedToast ? (
        <div
          className="pointer-events-none fixed left-1/2 top-20 z-[100] -translate-x-1/2 rounded-xl border border-emerald-200/80 bg-emerald-50/95 px-4 py-2.5 text-sm font-medium text-emerald-900 shadow-lg ring-1 ring-emerald-100"
          role="status"
        >
          Biletiniz basariyla olusturuldu
        </div>
      ) : null}
      <CustomerTicketsPanel
        onOpenTicket={(id) => navigate(`/customer/tickets/${id}`)}
        onNewTicket={() => navigate("/customer/new")}
        seenUpdatedAtByTicket={seenUpdatedAtByTicket}
        setSeenUpdatedAtByTicket={setSeenUpdatedAtByTicket}
        tickets={tickets}
        loading={loading}
        error={error}
      />
    </>
  );
}
