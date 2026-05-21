import { useParams, useNavigate } from "react-router-dom";
import { CustomerTicketDetailPanel } from "../preview/CustomerPreviewPage";

/**
 * Production customer ticket detail: data + API in `CustomerTicketDetailPanel` → `CustomerTicketDetailView`.
 */
export default function CustomerTicketDetailPage() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  return (
    <CustomerTicketDetailPanel
      ticketId={ticketId}
      onBack={() => navigate("/customer/tickets")}
    />
  );
}
