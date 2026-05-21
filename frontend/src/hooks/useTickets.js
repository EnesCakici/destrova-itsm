// bu sayfa şu işlemi yapıyor : "Ticket listesini merkezi sekilde yukleyen ozel hook."
// kaba tabirle şu : bu sayfa sayesinde Ticket listesi merkezi sekilde yuklenir.

import { useCallback, useEffect, useState } from "react";
import { getAllTickets } from "../services/api";

// Ticket listesini merkezi sekilde yukleyen ozel hook.
export function useTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // API'den listeyi ceker; loading ve error durumlarini yonetir.
  const loadTickets = useCallback(async () => {// Ticket listesini yükler ve günceller.
    try {
      setLoading(true);
      setError("");
      const data = await getAllTickets();
      setTickets(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Ticket listesi yuklenemedi.");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Hook kullanan sayfa acildiginda listeyi otomatik getirir.
  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Sayfalar bu degerlerle hem veriyi hem de yenileme fonksiyonunu kullanir.
  return { tickets, loading, error, reload: loadTickets };
}

