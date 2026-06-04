import { useNavigate } from "react-router-dom";
import { CUSTOMER_PAGE_WRAPPER } from "../customerTokens";
import { CustomerNewTicketPanel } from "../preview/CustomerPreviewPage";

/**
 * Production container: delegates create flow to `CustomerNewTicketPanel` (API + `CustomerNewTicketView`).
 * Visual layout lives in child views; this wrapper adds no background colors.
 */
export default function CustomerNewTicketPage() {
  const navigate = useNavigate();
  return (
    <div className={CUSTOMER_PAGE_WRAPPER}>
      <CustomerNewTicketPanel onTicketCreated={() => navigate("/customer/tickets?created=1")} />
    </div>
  );
}
