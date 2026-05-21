import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useKeycloak } from "../../context/KeycloakContext";
import { useTickets } from "../../hooks/useTickets";

const priorityOptions = ["ALL", "HIGH", "MEDIUM", "LOW"];
const priorityWeightMap = { HIGH: 3, MEDIUM: 2, LOW: 1 };
const customerTabs = {
  ACTIVE: "ACTIVE",
  HISTORY: "HISTORY",
};
const dateFieldOptions = [
  { value: "SLA_DUE_DATE", label: "SLA Bitis Tarihi" },
  { value: "CREATED_AT", label: "Olusturma Tarihi" },
];

function CustomerMyTicketsPage() {
  // Musteri ticket listesi: aktif/gecmis sekmeleri + filtre/siralama state'i.
  const { appUser, logout } = useKeycloak();
  const navigate = useNavigate();
  const { tickets, loading, error } = useTickets();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get("tab") || customerTabs.ACTIVE;
  const priorityFilter = searchParams.get("priority") || "ALL";
  const dateField = searchParams.get("dateField") || "SLA_DUE_DATE";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const searchText = searchParams.get("search") || "";
  const sortConfig = {
    key: searchParams.get("sortKey") || "id",
    direction: searchParams.get("sortDir") || "asc",
  };
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [showCreatedToast, setShowCreatedToast] = useState(searchParams.get("created") === "1");
  const [draftDateField, setDraftDateField] = useState(dateField);
  const [draftStartDate, setDraftStartDate] = useState(startDate);
  const [draftEndDate, setDraftEndDate] = useState(endDate);
  const dateFilterRef = useRef(null);

  // Tek bir query param guncellemesi (URL'i source-of-truth olarak kullanir).
  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === "ALL") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  };

  // Filtreleri varsayilan degerlere sifirlar.
  const clearFilters = () => {
    const next = new URLSearchParams();
    next.set("tab", activeTab);
    next.set("sortKey", "id");
    next.set("sortDir", "asc");
    next.set("dateField", "SLA_DUE_DATE");
    setSearchParams(next);
  };

  // Tarih filtresi alanlarini temizler.
  const clearDateFilter = () => {
    setDraftDateField("SLA_DUE_DATE");
    setDraftStartDate("");
    setDraftEndDate("");
    const next = new URLSearchParams(searchParams);
    next.set("dateField", "SLA_DUE_DATE");
    next.delete("startDate");
    next.delete("endDate");
    setSearchParams(next);
  };

  // YYYY-MM-DD degerini Date nesnesine cevirir.
  const parseDateOnly = (value) => {
    if (!value) {
      return null;
    }
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) {
      return null;
    }
    return new Date(year, month - 1, day);
  };

  const customerId = appUser?.id;

  // Gorunecek musteri ticketlari: API musteri icin zaten filtreler; burada ek guvenlik + UI filtreleri.
  const myTickets = useMemo(() => {
    const filtered = tickets
      .filter((ticket) => (customerId ? ticket.creatorId === customerId : false))
      .filter((ticket) => {
        if (activeTab === customerTabs.HISTORY) {
          return ticket.status === "CLOSED";
        }
        return ticket.status !== "CLOSED";
      })
      .filter((ticket) => (priorityFilter === "ALL" ? true : ticket.priority === priorityFilter))
      .filter((ticket) => {
        const query = searchText.trim().toLowerCase();
        if (!query) {
          return true;
        }
        const idText = String(ticket.id ?? "");
        const titleText = (ticket.title || "").toLowerCase();
        const productText = (ticket.product?.name || "").toLowerCase();
        return idText.includes(query) || titleText.includes(query) || productText.includes(query);
      })
      .filter((ticket) => {
        if (!startDate && !endDate) {
          return true;
        }
        const referenceDateValue =
          dateField === "CREATED_AT" ? ticket.createdAt : ticket.slaDueDate;
        if (!referenceDateValue) {
          return false;
        }
        const referenceDate = new Date(referenceDateValue);
        if (Number.isNaN(referenceDate.getTime())) {
          return false;
        }
        const dateOnly = new Date(
          referenceDate.getFullYear(),
          referenceDate.getMonth(),
          referenceDate.getDate()
        );
        if (startDate) {
          const start = parseDateOnly(startDate);
          if (start && dateOnly < start) {
            return false;
          }
        }
        if (endDate) {
          const end = parseDateOnly(endDate);
          if (end && dateOnly > end) {
            return false;
          }
        }
        return true;
      });

    const sorted = [...filtered].sort((a, b) => {
      const directionFactor = sortConfig.direction === "asc" ? 1 : -1;
      const key = sortConfig.key;
      const getValue = (ticket) => {
        if (key === "id") return ticket.id ?? 0;
        if (key === "title") return ticket.title ?? "";
        if (key === "product") return ticket.product?.name ?? "";
        if (key === "priority") return priorityWeightMap[ticket.priority] ?? 0;
        if (key === "closedAt") return ticket.closedAt ? new Date(ticket.closedAt).getTime() : 0;
        if (key === "closureReason") return ticket.closureReason ?? "";
        if (key === "slaDueDate") {
          const value = ticket.slaDueDate || ticket.createdAt;
          return value ? new Date(value).getTime() : 0;
        }
        return "";
      };
      const left = getValue(a);
      const right = getValue(b);
      if (typeof left === "number" && typeof right === "number") {
        return (left - right) * directionFactor;
      }
      return String(left).localeCompare(String(right), "tr") * directionFactor;
    });

    return sorted;
  }, [
    tickets,
    customerId,
    activeTab,
    priorityFilter,
    dateField,
    startDate,
    endDate,
    searchText,
    sortConfig,
  ]);

  // Tarih/saat gosterim yardimcisi.
  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "-";
    }
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }
    return date.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Tablo basliklarindan siralama degistirme.
  const toggleSort = (key) => {
    const nextDir = sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    const next = new URLSearchParams(searchParams);
    next.set("sortKey", key);
    next.set("sortDir", nextDir);
    setSearchParams(next);
  };

  // Aktif siralama okunu gosterir.
  const sortIndicator = (key) => {
    if (sortConfig.key !== key) return "";
    return sortConfig.direction === "asc" ? "▲" : "▼";
  };

  // Aktif sekmede (kapali olmayan) ticket sayisini hesaplar.
  const activeTicketCount = useMemo(
    () =>
      customerId
        ? tickets.filter((ticket) => ticket.creatorId === customerId && ticket.status !== "CLOSED").length
        : 0,
    [tickets, customerId]
  );

  // Backend closureReason degerlerini kullanici dostu metne cevirir.
  const closureReasonLabel = (closureReason) => {
    if (!closureReason) return "-";
    const map = {
      SOLVED: "Cozuldu",
      CUSTOMER_APPROVED: "Musteri Onayi",
      INVALID: "Gecersiz",
      DUPLICATE: "Yinelenen",
      NO_RESPONSE: "Musteri Yanit Vermedi",
      CANCELLED: "Iptal",
      OTHER: "Diger",
    };
    return map[closureReason] || closureReason;
  };

  // Tarih filtresi butonunda gosterilen ozet metni olusturur.
  const formatDateFilterLabel = () => {
    const filterType = dateField === "CREATED_AT" ? "Olusturma" : "SLA Bitis";
    const startLabel = startDate ? startDate.split("-").reverse().join(".") : "--";
    const endLabel = endDate ? endDate.split("-").reverse().join(".") : "--";
    return `📅 ${filterType}: ${startLabel} - ${endLabel}`;
  };

  // Popover'daki tarih secimlerini URL'e uygular.
  const applyDateFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.set("dateField", draftDateField || "SLA_DUE_DATE");
    if (draftStartDate) next.set("startDate", draftStartDate);
    else next.delete("startDate");
    if (draftEndDate) next.set("endDate", draftEndDate);
    else next.delete("endDate");
    setSearchParams(next);
    setIsDatePopoverOpen(false);
  };

  // URL'den gelen filtreyi popover taslak state'i ile senkron tutar.
  useEffect(() => {
    setDraftDateField(dateField);
    setDraftStartDate(startDate);
    setDraftEndDate(endDate);
  }, [dateField, startDate, endDate]);

  // Popover disina tiklamada paneli kapatir.
  useEffect(() => {
    const onDocClick = (event) => {
      if (!dateFilterRef.current?.contains(event.target)) {
        setIsDatePopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // "created=1" query param'i ile gelen basari toastini tek sefer gosterir.
  useEffect(() => {
    if (searchParams.get("created") !== "1") {
      return;
    }
    setShowCreatedToast(true);
    const timer = setTimeout(() => {
      setShowCreatedToast(false);
      const next = new URLSearchParams(searchParams);
      next.delete("created");
      setSearchParams(next, { replace: true });
    }, 2500);
    return () => clearTimeout(timer);
  }, [searchParams, setSearchParams]);

  if (!customerId) {
    return (
      <section className="card">
        <p>Kullanici profili yukleniyor...</p>
      </section>
    );
  }

  return (
    <section className="customer-list-page">
      {/* Ust baslik ve yeni ticket butonu */}
      <div className="customer-page-topbar">
        <div>
          <h1 className="customer-page-title">Destek Taleplerim</h1>
        </div>
        <div className="customer-page-topbar-actions">
          <Link className="btn btn-primary new-ticket-btn" to="/customer/new">
            <span>＋</span> Yeni Ticket Ac
          </Link>
          <button type="button" className="btn btn-secondary navbar-logout" onClick={() => logout()}>
            Çıkış Yap
          </button>
        </div>
      </div>

      {/* Aktif / Gecmis sekmeleri */}
      <div className="customer-underlined-tabs">
        <button
          className={`customer-underlined-tab ${activeTab === customerTabs.ACTIVE ? "active" : ""}`}
          onClick={() => updateParam("tab", customerTabs.ACTIVE)}
        >
          Aktif Taleplerim ({activeTicketCount})
        </button>
        <button
          className={`customer-underlined-tab ${activeTab === customerTabs.HISTORY ? "active" : ""}`}
          onClick={() => updateParam("tab", customerTabs.HISTORY)}
        >
          Gecmis Talepler
        </button>
      </div>

      <section className="card customer-list-card">
      {/* Filtre ve arama alani */}
      <div className="customer-filter-row">
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
        <div className="filter-field date-filter-panel" ref={dateFilterRef}>
          <button
            className="date-filter-trigger"
            onClick={() => setIsDatePopoverOpen((prev) => !prev)}
          >
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
              <div className="date-range-group">
                <input
                  type="date"
                  value={draftStartDate}
                  onChange={(event) => setDraftStartDate(event.target.value)}
                />
                <span className="date-range-separator">ile</span>
                <input
                  type="date"
                  value={draftEndDate}
                  onChange={(event) => setDraftEndDate(event.target.value)}
                />
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

      {/* Hata ve basari mesajlari */}
      {error ? <p className="action-error">{error}</p> : null}
      {showCreatedToast ? <div className="toast-success">Biletiniz basariyla olusturuldu</div> : null}

      {/* Liste durumu: loading -> bos -> tablo */}
      {loading ? (
        <p>Liste yukleniyor...</p>
      ) : myTickets.length === 0 ? (
        <div className="customer-empty-state">
          <div className="empty-icon">📭</div>
          <p>Henuz bir talebiniz bulunmuyor</p>
        </div>
      ) : (
        <div className="customer-table-wrapper">
          <table className="customer-ticket-table">
            <thead>
              <tr>
                <th>
                  <button
                    className={`th-sort-btn ${sortConfig.key === "id" ? "active" : ""}`}
                    onClick={() => toggleSort("id")}
                  >
                    No <span className="th-sort-active-indicator">{sortIndicator("id")}</span>
                  </button>
                </th>
                <th>
                  <button
                    className={`th-sort-btn ${sortConfig.key === "title" ? "active" : ""}`}
                    onClick={() => toggleSort("title")}
                  >
                    Konu <span className="th-sort-active-indicator">{sortIndicator("title")}</span>
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
                  <button
                    className={`th-sort-btn ${sortConfig.key === "priority" ? "active" : ""}`}
                    onClick={() => toggleSort("priority")}
                  >
                    Oncelik <span className="th-sort-active-indicator">{sortIndicator("priority")}</span>
                  </button>
                </th>
                {activeTab === customerTabs.HISTORY ? (
                  <>
                    <th>
                      <button
                        className={`th-sort-btn ${sortConfig.key === "closedAt" ? "active" : ""}`}
                        onClick={() => toggleSort("closedAt")}
                      >
                        Kapatilma Tarihi <span className="th-sort-active-indicator">{sortIndicator("closedAt")}</span>
                      </button>
                    </th>
                    <th>
                      <button
                        className={`th-sort-btn ${sortConfig.key === "closureReason" ? "active" : ""}`}
                        onClick={() => toggleSort("closureReason")}
                      >
                        Kapatilma Nedeni <span className="th-sort-active-indicator">{sortIndicator("closureReason")}</span>
                      </button>
                    </th>
                  </>
                ) : (
                  <th>
                    <button
                      className={`th-sort-btn ${sortConfig.key === "slaDueDate" ? "active" : ""}`}
                      onClick={() => toggleSort("slaDueDate")}
                    >
                      SLA Bitis <span className="th-sort-active-indicator">{sortIndicator("slaDueDate")}</span>
                    </button>
                  </th>
                )}
                <th>Islemler</th>
              </tr>
            </thead>
            <tbody>
              {myTickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="center-col">{ticket.id}</td>
                  <td>{ticket.title}</td>
                  <td>{ticket.product?.name || "Genel"}</td>
                  <td className="center-col">
                    <span className={`badge priority-${(ticket.priority || "").toLowerCase()}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  {activeTab === customerTabs.HISTORY ? (
                    <>
                      <td>{formatDate(ticket.closedAt)}</td>
                      <td>{closureReasonLabel(ticket.closureReason)}</td>
                    </>
                  ) : (
                    <td>{formatDate(ticket.slaDueDate)}</td>
                  )}
                  <td>
                    <button
                      className="table-action-btn"
                      onClick={() => navigate(`/customer/tickets/${ticket.id}`)}
                    >
                      <span>🔎</span> Detay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>Z
        </div>
      )}
      </section>
    </section>
  );
}

export default CustomerMyTicketsPage;

