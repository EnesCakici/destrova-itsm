import { useNavigate } from "react-router-dom";
import { CustomerNewTicketPanel } from "../preview/CustomerPreviewPage";

/**
 * Production container: delegates create flow to `CustomerNewTicketPanel` (API + `CustomerNewTicketView`).
 */
export default function CustomerNewTicketPage() {
  const navigate = useNavigate();
  return (
    <CustomerNewTicketPanel onTicketCreated={() => navigate("/customer/tickets?created=1")} />
  );
}
