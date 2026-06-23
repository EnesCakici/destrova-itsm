// bu sayfa şu işlemi yapıyor : "Ticket listesini merkezi sekilde yukleyen ozel hook."
// kaba tabirle şu : bu sayfa sayesinde Ticket listesi merkezi sekilde yuklenir.

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAllTickets } from "../services/api";
import { resolveApiUserMessage } from "../components/destrova/shared/utils/apiErrorMessages";

// Ticket listesini merkezi sekilde yukleyen ozel hook.
export function useTickets() {
  const { t } = useTranslation(["customer", "errors"]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // API'den listeyi ceker; loading ve error durumlarini yonetir.
  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getAllTickets();
      setTickets(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(
        resolveApiUserMessage(loadError, {
          fallback: t("workspace.errors.listFailed"),
          t,
        }),
      );
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Hook kullanan sayfa acildiginda listeyi otomatik getirir.
  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Sayfalar bu degerlerle hem veriyi hem de yenileme fonksiyonunu kullanir.
  return { tickets, loading, error, reload: loadTickets };
}
