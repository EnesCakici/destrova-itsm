import { useParams, useNavigate } from "react-router-dom";
import { CUSTOMER_PAGE_WRAPPER } from "../customerTokens";
import { CustomerTicketDetailPanel } from "../preview/CustomerPreviewPage";

/**
 * Production customer ticket detail: data + API in `CustomerTicketDetailPanel` → `CustomerTicketDetailView`.
 * Visual layout lives in child views; this wrapper adds no background colors.
 */
export default function CustomerTicketDetailPage() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  return (
    <div className={CUSTOMER_PAGE_WRAPPER}>
      <CustomerTicketDetailPanel
        ticketId={ticketId}
        onBack={() => navigate("/customer/tickets")}
      />
    </div>
  );
}
