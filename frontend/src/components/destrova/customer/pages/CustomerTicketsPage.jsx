import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CUSTOMER_PAGE_WRAPPER, CUSTOMER_TOAST } from "../customerTokens";
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
    <div className={CUSTOMER_PAGE_WRAPPER}>
      {showCreatedToast ? (
        <div className={CUSTOMER_TOAST.success} role="status">
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
    </div>
  );
}
