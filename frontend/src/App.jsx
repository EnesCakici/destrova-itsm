import { useEffect, useState } from "react";
import TicketForm from "./components/TicketForm";
import TicketList from "./components/TicketList";
import { getAllTickets } from "./services/api";
import "./App.css";

function App() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const data = await getAllTickets();
      setTickets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>ITSM Ticket Management</h1>
        <p>Destek taleplerinizi olusturun, takip edin ve yonetin.</p>
      </header>

      <main className="layout-grid">
        <TicketForm onTicketCreated={loadTickets} />
        <TicketList tickets={tickets} onTicketsChanged={loadTickets} loading={loading} />
      </main>
    </div>
  );
}

export default App;
