import { useNavigate } from "react-router-dom";
import TicketForm from "../../components/TicketForm";

function CustomerNewTicketPage() {
  const navigate = useNavigate();

  return (
    <section className="card">
      <TicketForm onTicketCreated={() => navigate("/customer/tickets?created=1")} />
    </section>
  );
}

export default CustomerNewTicketPage;
