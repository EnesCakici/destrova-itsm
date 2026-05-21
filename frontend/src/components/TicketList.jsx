import { useEffect, useState } from "react";
import { deleteTicket, updateTicketStatus } from "../services/api";
import { CLOSURE_REASONS, STATUS_FLOW } from "../constants/ticketRules";

function TicketList({
  tickets,
  onTicketsChanged,
  loading,
  canManageStatus = true,
  canDelete = true,
  title = "Ticket Listesi",
}) {
  const [statusSelections, setStatusSelections] = useState({});
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const nextSelections = {};
    tickets.forEach((ticket) => {
      nextSelections[ticket.id] = ticket.status || "NEW";
    });
    setStatusSelections(nextSelections);
  }, [tickets]);

  const askClosureReason = () => {
    const input = window.prompt(
      "Kapanis nedeni seciniz:\nSOLVED, CUSTOMER_APPROVED, INVALID, NO_RESPONSE, DUPLICATE"
    );
    if (!input) {
      return null;
    }
    const normalized = input.trim().toUpperCase();
    if (!CLOSURE_REASONS.includes(normalized)) {
      setActionError("Gecersiz kapanis nedeni. Gecerli degerler: " + CLOSURE_REASONS.join(", "));
      return null;
    }
    return normalized;
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      setActionError("");
      let closureReason;
      if (status === "CLOSED") {
        closureReason = askClosureReason();
        if (!closureReason) {
          return;
        }
      }
      await updateTicketStatus(id, status, closureReason);
      onTicketsChanged();
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Durum guncellenemedi. Is kurali ihlali olabilir.";
      console.error("Durum guncelleme hatasi:", error.response?.data || error.message);
      setActionError(errorMessage);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Bu bileti silmek istediginize emin misiniz?");
    if (!confirmed) {
      return;
    }

    try {
      setActionError("");
      await deleteTicket(id);
      onTicketsChanged();
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Ticket silinemedi.";
      console.error("Ticket silme hatasi:", error.response?.data || error.message);
      setActionError(errorMessage);
    }
  };

  const formatSlaDate = (dateValue) => {
    if (!dateValue) {
      return "Belirlenmedi";
    }
    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) {
      return "Belirlenmedi";
    }
    return parsedDate.toLocaleString("tr-TR", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSelectableStatuses = (currentStatus) => {
    const safeCurrent = currentStatus || "NEW";
    return [safeCurrent, ...(STATUS_FLOW[safeCurrent] || [])];
  };

  return (
    <section className="card">
      <h2>{title}</h2>
      {loading ? <p>Yukleniyor...</p> : null}

      {!loading && tickets.length === 0 ? (
        <p>Henuz kayitli ticket bulunmuyor.</p>
      ) : (
        <div className="ticket-grid">
          {tickets.map((ticket) => (
            <article className="ticket-item" key={ticket.id}>
              <div className="ticket-head">
                <h3>{ticket.title}</h3>
                <span className={`badge status-${(ticket.status || "").toLowerCase()}`}>
                  {ticket.status}
                </span>
              </div>
              <p className="ticket-description">{ticket.description}</p>
              <div className="ticket-meta">
                <span className={`badge priority priority-${(ticket.priority || "").toLowerCase()}`}>
                  {ticket.priority}
                </span>
                <span>Assignee: {ticket.assigneeId ?? "-"}</span>
                <span>SLA Bitis: {formatSlaDate(ticket.slaDueDate)}</span>
              </div>
              <div className="ticket-actions">
                {canManageStatus
                  ? (() => {
                  const currentStatus = ticket.status || "NEW";
                  const selectableStatuses = getSelectableStatuses(currentStatus);
                  const selectedStatus = statusSelections[ticket.id] || currentStatus;
                  return (
                    <>
                <select
                  className="btn btn-secondary status-control"
                  value={selectedStatus}
                  onChange={(event) => {
                    const nextStatus = event.target.value;
                    setStatusSelections((prev) => ({ ...prev, [ticket.id]: nextStatus }));
                  }}
                >
                  {selectableStatuses.map((statusOption) => (
                    <option key={statusOption} value={statusOption}>
                      {statusOption}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-secondary"
                  disabled={selectedStatus === currentStatus}
                  onClick={() => handleStatusUpdate(ticket.id, selectedStatus)}
                >
                  Onayla
                </button>
                    </>
                  );
                })()
                  : null}
                {canDelete ? (
                  <button className="btn btn-danger" onClick={() => handleDelete(ticket.id)}>
                    Sil
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
      {actionError ? <p className="action-error">{actionError}</p> : null}
    </section>
  );
}

export default TicketList;

