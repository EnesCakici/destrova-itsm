import { ROLES } from "../../constants/roles";
import TicketDetailView from "../../components/TicketDetailView";

function ManagerTicketDetailPage() {
  return <TicketDetailView role={ROLES.MANAGER} />;
}

export default ManagerTicketDetailPage;

