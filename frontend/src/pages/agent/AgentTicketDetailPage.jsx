import { ROLES } from "../../constants/roles";// Rol sabitleri
import TicketDetailView from "../../components/TicketDetailView";// Ticket detay görüntüleme bileşeni

function AgentTicketDetailPage() {
  return <TicketDetailView role={ROLES.AGENT} />; // Agent rolü için Ticket detay görüntüleme bileşenini ekranda gösterir
}

export default AgentTicketDetailPage;

