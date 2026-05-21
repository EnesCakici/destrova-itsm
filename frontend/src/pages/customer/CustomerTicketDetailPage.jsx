import { ROLES } from "../../constants/roles";
import TicketDetailView from "../../components/TicketDetailView";

function CustomerTicketDetailPage() {
  return <TicketDetailView role={ROLES.CUSTOMER} />;
}

export default CustomerTicketDetailPage;

