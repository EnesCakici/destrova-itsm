import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTickets } from "../../hooks/useTickets";
import { assignTicketToMe, getAgentCapacities } from "../../services/api";

const tabs = [
  { value: "ALL", label: "Tum Ticketlar" },
  { value: "UNASSIGNED", label: "Atanmamislar" },
  { value: "SLA_BREACH", label: "SLA Ihlalleri" },
];
const activityTabs = {
  ACTIVE: "ACTIVE",
  HISTORY: "HISTORY",
};

const statusOptions = ["ALL", "NEW", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"];
const priorityOptions = ["ALL", "HIGH", "MEDIUM", "LOW"];
const priorityWeightMap = { HIGH: 3, MEDIUM: 2, LOW: 1 };
const dateFieldOptions = [
  { value: "SLA_DUE_DATE", label: "SLA Bitis Tarihi" },
  { value: "CREATED_AT", label: "Olusturma Tarihi" },
];

function ManagerTicketsPage() {
  // Sayfa state'i: liste, secimler, filtreler, atama islemleri.
  const navigate = useNavigate();
  const { tickets, loading, error, reload } = useTickets();
  const [searchParams, setSearchParams] = useSearchParams();
  const [agents, setAgents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAssigneeId, setBulkAssigneeId] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [toast, setToast] = useState("");
  const [assigningId, setAssigningId] = useState(null);
  const filterRef = useRef(null);

  const activityTab = searchParams.get("activityTab") || activityTabs.ACTIVE;
  const activeTab = searchParams.get("tab") || "ALL";
  const sortConfig = {
    key: searchParams.get("sortKey") || "slaDueDate",
    direction: searchParams.get("sortDir") || "asc",
  };
  const searchText = searchParams.get("search") || "";
  const statusFilter = searchParams.get("status") || "ALL";
  const priorityFilter = searchParams.get("priority") || "ALL";
  const productFilter = searchParams.get("product") || "ALL";
  const dateField = searchParams.get("dateField") || "SLA_DUE_DATE";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";

  const [draftDateField, setDraftDateField] = useState(dateField);
  const [draftStartDate, setDraftStartDate] = useState(startDate);
  const [draftEndDate, setDraftEndDate] = useState(endDate);
  const [draftProduct, setDraftProduct] = useState(productFilter);

  // Filtre panelindeki urun seceneklerini ticket verisinden dinamik uretir.
  const productOptions = useMemo(() => {
    return ["ALL", ...Array.from(new Set(tickets.map((ticket) => ticket.product?.name).filter(Boolean)))];
  }, [tickets]);

  // Query param degisikliklerini merkezi olarak uygular.
  const persistList = (next) => {
    setSearchParams(next);
  };

  // Tek bir filtre parametresini gunceller.
  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === "ALL") next.delete(key);
    else next.set(key, value);
    persistList(next);
  };

  // Tablo siralama davranisini yonetir.
  const toggleSort = (key) => {
    const nextDir = sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    const next = new URLSearchParams(searchParams);
    next.set("sortKey", key);
    next.set("sortDir", nextDir);
    persistList(next);
  };

  // Aktif siralama ikonunu dondurur.
  const sortIndicator = (key) => {
    if (sortConfig.key !== key) return "";
    return sortConfig.direction === "asc" ? "▲" : "▼";
  };

  // Tum filtreleri default durumuna sifirlar.
  const clearFilters = () => {
    const next = new URLSearchParams();
    next.set("activityTab", activityTab);
    next.set("tab", activeTab);
    next.set("sortKey", "slaDueDate");
    next.set("sortDir", "asc");
    next.set("dateField", "SLA_DUE_DATE");
    persistList(next);
  };

  // Aktif/Gecmis gorunum sekmesini degistirir.
  const setActivityTab = (tabValue) => {
    const next = new URLSearchParams(searchParams);
    next.set("activityTab", tabValue);
    persistList(next);
  };

  // URL tarihini Date'e cevirmek icin yardimci.
  const parseDateOnly = (value) => {
    if (!value) return null;
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  // Tarih filtresini temizler.
  const clearDateFilter = () => {
    setDraftDateField("SLA_DUE_DATE");
    setDraftStartDate("");
    setDraftEndDate("");
    setDraftProduct("ALL");
    const next = new URLSearchParams(searchParams);
    next.set("dateField", "SLA_DUE_DATE");
    next.delete("startDate");
    next.delete("endDate");
    next.delete("product");
    persistList(next);
  };

  // Popover'daki tarih/urun secimlerini URL'e uygular.
  const applyDateFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.set("dateField", draftDateField || "SLA_DUE_DATE");
    if (draftStartDate) next.set("startDate", draftStartDate);
    else next.delete("startDate");
    if (draftEndDate) next.set("endDate", draftEndDate);
    else next.delete("endDate");
    if (draftProduct && draftProduct !== "ALL") next.set("product", draftProduct);
    else next.delete("product");
    persistList(next);
    setIsDatePopoverOpen(false);
  };

  // Ust sekmeleri (Tum / Atanmamis / Ihlal) degistirir.
  const setTab = (tabValue) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tabValue);
    persistList(next);
  };

  // SLA etiketini hesaplar (normal/risk/ihlal + kalan/gecen sure).
  const getSlaMeta = (ticket) => {
    if (ticket.status === "NEW") return { label: "Atanma Bekliyor", className: "sla-waiting", isBreach: false };
    if (!ticket.slaDueDate) return { label: "Takipsiz", className: "sla-normal", isBreach: false };
    const dueTime = new Date(ticket.slaDueDate).getTime();
    if (Number.isNaN(dueTime)) return { label: "-", className: "sla-normal", isBreach: false };
    const diff = dueTime - Date.now();
    if (diff < 0) {
      const overdueMinutes = Math.max(1, Math.floor(Math.abs(diff) / 60000));
      const unitText = overdueMinutes >= 60 ? `${Math.floor(overdueMinutes / 60)}s` : `${overdueMinutes}dk`;
      return { label: `${unitText} (Ihlal)`, className: "sla-breach", isBreach: true };
    }
    if (diff <= 2 * 60 * 60 * 1000) {
      const remainingMinutes = Math.max(1, Math.floor(diff / 60000));
      const unitText = remainingMinutes >= 60 ? `${Math.floor(remainingMinutes / 60)}s` : `${remainingMinutes}dk`;
      return { label: `${unitText} (Risk)`, className: "sla-critical", isBreach: false };
    }
    return { label: "Normal", className: "sla-normal", isBreach: false };
  };

  // Ekranda gosterilecek nihai liste: tab + filtre + arama + tarih + siralama.
  const filteredTickets = useMemo(() => {
    const tabFiltered = tickets.filter((ticket) => {
      if (activeTab === "UNASSIGNED") {
        return ticket.assigneeId == null && ticket.status === "NEW";
      }
      if (activeTab === "SLA_BREACH") {
        return getSlaMeta(ticket).isBreach;
      }
      return true;
    });

    const byActivity = tabFiltered.filter((ticket) => {
      if (activityTab === activityTabs.HISTORY) return ticket.status === "CLOSED";
      return ticket.status !== "CLOSED";
    });

    const filtered = byActivity
      .filter((ticket) => (statusFilter === "ALL" ? true : ticket.status === statusFilter))
      .filter((ticket) => (priorityFilter === "ALL" ? true : ticket.priority === priorityFilter))
      .filter((ticket) => (productFilter === "ALL" ? true : (ticket.product?.name || "") === productFilter))
      .filter((ticket) => {
        const query = searchText.trim().toLowerCase();
        if (!query) return true;
        return (
          String(ticket.id || "").includes(query) ||
          (ticket.title || "").toLowerCase().includes(query) ||
          (ticket.creatorName || ticket.creator?.name || "").toLowerCase().includes(query)
        );
      })
      .filter((ticket) => {
        if (!startDate && !endDate) return true;
        const referenceDateValue = dateField === "CREATED_AT" ? ticket.createdAt : ticket.slaDueDate;
        if (!referenceDateValue) return false;
        const referenceDate = new Date(referenceDateValue);
        if (Number.isNaN(referenceDate.getTime())) return false;
        const dateOnly = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
        if (startDate) {
          const start = parseDateOnly(startDate);
          if (start && dateOnly < start) return false;
        }
        if (endDate) {
          const end = parseDateOnly(endDate);
          if (end && dateOnly > end) return false;
        }
        return true;
      });

    return [...filtered].sort((a, b) => {
      const directionFactor = sortConfig.direction === "asc" ? 1 : -1;
      const getValue = (ticket) => {
        if (sortConfig.key === "id") return ticket.id ?? 0;
        if (sortConfig.key === "title") return ticket.title ?? "";
        if (sortConfig.key === "product") return ticket.product?.name ?? "";
        if (sortConfig.key === "status") return ticket.status ?? "";
        if (sortConfig.key === "priority") return priorityWeightMap[ticket.priority] ?? 0;
        if (sortConfig.key === "slaDueDate") return ticket.slaDueDate ? new Date(ticket.slaDueDate).getTime() : 0;
        return "";
      };
      const left = getValue(a);
      const right = getValue(b);
      if (typeof left === "number" && typeof right === "number") return (left - right) * directionFactor;
      return String(left).localeCompare(String(right), "tr") * directionFactor;
    });
  }, [tickets, activityTab, activeTab, statusFilter, priorityFilter, productFilter, searchText, dateField, startDate, endDate, sortConfig]);

  // Manager genel gorunum icin acik/kapali ticket adetleri.
  const activeTicketCount = useMemo(
    () => tickets.filter((ticket) => ticket.status !== "CLOSED").length,
    [tickets]
  );
  const historyTicketCount = useMemo(
    () => tickets.filter((ticket) => ticket.status === "CLOSED").length,
    [tickets]
  );

  // Tablo secim mekanizmasi icin secili satir durumlari.
  const selectedCount = selectedIds.length;
  const allVisibleIds = filteredTickets.map((ticket) => ticket.id);
  const isAllSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.includes(id));

  // Ustteki "tumunu sec" checkbox davranisi.
  const onToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allVisibleIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...allVisibleIds])));
  };

  // Tek satiri sec/secten cikar.
  const onToggleRow = (ticketId) => {
    setSelectedIds((prev) => (prev.includes(ticketId) ? prev.filter((id) => id !== ticketId) : [...prev, ticketId]));
  };

  // Tarih filtre butonunun ozet label'i.
  const formatDateFilterLabel = () => {
    const filterType = dateField === "CREATED_AT" ? "Olusturma" : "SLA Bitis";
    const startLabel = startDate ? startDate.split("-").reverse().join(".") : "--";
    const endLabel = endDate ? endDate.split("-").reverse().join(".") : "--";
    const productLabel = productFilter === "ALL" ? "Tum Urunler" : productFilter;
    return `📅 ${filterType}: ${startLabel} - ${endLabel} | ${productLabel}`;
  };
  useEffect(() => {
    setDraftDateField(dateField);
    setDraftStartDate(startDate);
    setDraftEndDate(endDate);
    setDraftProduct(productFilter);
  }, [dateField, startDate, endDate, productFilter]);


  // Tek ticket atama islemi.
  const assignSingleTicket = async (ticketId, assigneeId) => {
    if (!assigneeId) return;
    try {
      setAssigningId(ticketId);
      setActionError("");
      const ticket = tickets.find((item) => item.id === ticketId);
      const status = ticket?.status === "NEW" ? "IN_PROGRESS" : ticket?.status || "IN_PROGRESS";
      await assignTicketToMe(ticketId, Number(assigneeId), status);
      setToast("Ticket basariyla atandi.");
      await reload();
    } catch (assignError) {
      const message = assignError.response?.data?.message || "Atama islemi basarisiz.";
      setActionError(message);
      setToast(message);
    } finally {
      setAssigningId(null);
    }
  };

  // Coklu ticket atama islemi.
  const assignBulkTickets = async () => {
    if (!bulkAssigneeId || selectedIds.length === 0) return;
    try {
      setBulkLoading(true);
      setActionError("");
      await Promise.all(
        selectedIds.map((ticketId) => {
          const ticket = tickets.find((item) => item.id === ticketId);
          const status = ticket?.status === "NEW" ? "IN_PROGRESS" : ticket?.status || "IN_PROGRESS";
          return assignTicketToMe(ticketId, Number(bulkAssigneeId), status);
        })
      );
      setToast(`${selectedIds.length} ticket secilen agente atandi.`);
      setSelectedIds([]);
      setBulkAssigneeId("");
      await reload();
    } catch (bulkError) {
      const message = bulkError.response?.data?.message || "Toplu atama basarisiz.";
      setActionError(message);
      setToast(message);
    } finally {
      setBulkLoading(false);
    }
  };

  // Sayfa acilisinda agent kapasite listesini yukler.
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const data = await getAgentCapacities();
        setAgents(data || []);
      } catch (loadError) {
        setActionError(loadError.response?.data?.message || "Agent listesi alinamadi.");
      }
    };
    loadAgents();
  }, []);

  // Kisa sureli toast mesajini otomatik kapatir.
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  // Popover disina tiklaninca tarih panelini kapatir.
  useEffect(() => {
    const onDocClick = (event) => {
      if (!filterRef.current?.contains(event.target)) {
        setIsDatePopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Tarih formatlama yardimcisi (tablo gosterimi).
  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <section className="card customer-list-card manager-dispatch-page">
      {/* Uyari / durum toast mesaji */}
      {toast ? <div className="toast-warning">{toast}</div> : null}
      <div className="customer-list-header">
        <div>
          <h2>Ticket Atama Paneli</h2>
        </div>
      </div>

      <div className="customer-underlined-tabs">
        <button
          className={`customer-underlined-tab ${activityTab === activityTabs.ACTIVE ? "active" : ""}`}
          onClick={() => setActivityTab(activityTabs.ACTIVE)}
        >
          Aktif Talepler ({activeTicketCount})
        </button>
        <button
          className={`customer-underlined-tab ${activityTab === activityTabs.HISTORY ? "active" : ""}`}
          onClick={() => setActivityTab(activityTabs.HISTORY)}
        >
          Gecmis Talepler ({historyTicketCount})
        </button>
      </div>

      {/* Ust sekmeler */}
      <div className="agent-tab-row">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            className={`agent-tab-btn ${activeTab === tab.value ? "active" : ""}`}
            onClick={() => setTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toplu atama bari (en az 1 secim olunca acilir) */}
      {selectedCount > 0 ? (
        <div className="manager-bulk-bar">
          <strong>Secili {selectedCount} Bilet</strong>
          <select value={bulkAssigneeId} onChange={(event) => setBulkAssigneeId(event.target.value)}>
            <option value="">Ata: Agent Sec</option>
            {agents.map((agent) => (
              <option key={agent.agentId} value={agent.agentId}>
                {agent.agentName} ({agent.activeTicketCount}/{agent.maxTicketLimit})
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={assignBulkTickets} disabled={!bulkAssigneeId || bulkLoading}>
            {bulkLoading ? "Ataniyor..." : "Secilileri Ata"}
          </button>
        </div>
      ) : null}

      {/* Filtreler ve arama */}
      <div className="customer-filter-row">
        <label className="filter-field">
          Status
          <select value={statusFilter} onChange={(event) => updateParam("status", event.target.value)}>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          Priority
          <select value={priorityFilter} onChange={(event) => updateParam("priority", event.target.value)}>
            {priorityOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div className="filter-field date-filter-panel" ref={filterRef}>
          <button className="date-filter-trigger" onClick={() => setIsDatePopoverOpen((prev) => !prev)}>
            {formatDateFilterLabel()} <span>▾</span>
          </button>
          {isDatePopoverOpen ? (
            <div className="date-filter-content">
              <label>
                Filtre Tipi
                <select value={draftDateField} onChange={(event) => setDraftDateField(event.target.value)}>
                  {dateFieldOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Urun
                <select value={draftProduct} onChange={(event) => setDraftProduct(event.target.value)}>
                  {productOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <div className="date-range-group">
                <input type="date" value={draftStartDate} onChange={(event) => setDraftStartDate(event.target.value)} />
                <span className="date-range-separator">ile</span>
                <input type="date" value={draftEndDate} onChange={(event) => setDraftEndDate(event.target.value)} />
              </div>
              <div className="date-popover-actions">
                <button className="btn btn-secondary" onClick={clearDateFilter}>
                  Temizle
                </button>
                <button className="btn btn-primary" onClick={applyDateFilter}>
                  Uygula
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <label className="filter-field search-filter-inline">
          Arama
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              value={searchText}
              onChange={(event) => updateParam("search", event.target.value)}
              placeholder="Ticket ID, Baslik, Urun"
            />
          </div>
        </label>
        <div className="filter-actions">
          <button className="btn btn-secondary" onClick={clearFilters}>
            Temizle
          </button>
        </div>
      </div>

      {/* Hata mesajlari */}
      {error ? <p className="action-error">{error}</p> : null}
      {actionError ? <p className="action-error">{actionError}</p> : null}

      {/* Liste durumu: loading -> bos -> tablo */}
      {loading ? (
        <p>Ticketlar yukleniyor...</p>
      ) : filteredTickets.length === 0 ? (
        <div className="customer-empty-state">
          <div className="empty-icon">📭</div>
          <p>Filtreye uygun ticket bulunmadi.</p>
        </div>
      ) : (
        <div className="customer-table-wrapper">
          <table className="customer-ticket-table">
            <thead>
              <tr>
                <th className="center-col">
                  <input type="checkbox" checked={isAllSelected} onChange={onToggleSelectAll} />
                </th>
                <th>
                  <button className={`th-sort-btn ${sortConfig.key === "id" ? "active" : ""}`} onClick={() => toggleSort("id")}>
                    No <span className="th-sort-active-indicator">{sortIndicator("id")}</span>
                  </button>
                </th>
                <th>
                  <button className={`th-sort-btn ${sortConfig.key === "title" ? "active" : ""}`} onClick={() => toggleSort("title")}>
                    Konu & Musteri <span className="th-sort-active-indicator">{sortIndicator("title")}</span>
                  </button>
                </th>
                <th>
                  <button
                    className={`th-sort-btn ${sortConfig.key === "product" ? "active" : ""}`}
                    onClick={() => toggleSort("product")}
                  >
                    Urun <span className="th-sort-active-indicator">{sortIndicator("product")}</span>
                  </button>
                </th>
                <th>
                  <button className={`th-sort-btn ${sortConfig.key === "status" ? "active" : ""}`} onClick={() => toggleSort("status")}>
                    Statu <span className="th-sort-active-indicator">{sortIndicator("status")}</span>
                  </button>
                </th>
                <th>
                  <button
                    className={`th-sort-btn ${sortConfig.key === "priority" ? "active" : ""}`}
                    onClick={() => toggleSort("priority")}
                  >
                    Oncelik <span className="th-sort-active-indicator">{sortIndicator("priority")}</span>
                  </button>
                </th>
                <th>
                  <button
                    className={`th-sort-btn ${sortConfig.key === "slaDueDate" ? "active" : ""}`}
                    onClick={() => toggleSort("slaDueDate")}
                  >
                    SLA Durumu <span className="th-sort-active-indicator">{sortIndicator("slaDueDate")}</span>
                  </button>
                </th>
                <th>Atanan Kisi</th>
                <th>Islemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((ticket) => {
                const slaMeta = getSlaMeta(ticket);
                return (
                  <tr key={ticket.id}>
                    <td className="center-col">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(ticket.id)}
                        onChange={() => onToggleRow(ticket.id)}
                      />
                    </td>
                    <td className="center-col">{ticket.id}</td>
                    <td>
                      <div className="agent-ticket-title-cell">
                        <span className="agent-ticket-title">{ticket.title}</span>
                        <small className="agent-ticket-subtext">
                          {ticket.creatorName || ticket.creator?.name || `Musteri #${ticket.creatorId || "-"}`}
                        </small>
                      </div>
                    </td>
                    <td>
                      <span className="agent-product-badge">{ticket.product?.name || "Genel"}</span>
                    </td>
                    <td className="center-col">
                      <span className={`badge status-${(ticket.status || "").toLowerCase()}`}>{ticket.status}</span>
                    </td>
                    <td className="center-col">
                      <span className={`badge priority-${(ticket.priority || "").toLowerCase()}`}>{ticket.priority}</span>
                    </td>
                    <td>
                      <div className="sla-cell-stack">
                        <span>{formatDate(ticket.slaDueDate)}</span>
                        <span className={`sla-badge ${slaMeta.className}`}>{slaMeta.label}</span>
                      </div>
                    </td>
                    <td>
                      <select
                        className="manager-inline-assign"
                        value={ticket.assigneeId || ""}
                        onChange={(event) => assignSingleTicket(ticket.id, event.target.value)}
                        disabled={assigningId === ticket.id}
                      >
                        <option value="">Atanmamis</option>
                        {agents.map((agent) => (
                          <option key={agent.agentId} value={agent.agentId}>
                            {agent.agentName} ({agent.activeTicketCount}/{agent.maxTicketLimit})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button className="table-action-btn" onClick={() => navigate(`/manager/detail/${ticket.id}`)}>
                        <span>🔎</span> Detay
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default ManagerTicketsPage;

