import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppShell from "../../shell/AppShell";
import { getRoleDefaultLanding, getRoleNavItem, SHELL_ROLES } from "../../shell/roleConfig";
import { useTickets } from "../../../../hooks/useTickets";
import { useKeycloak } from "../../../../context/KeycloakContext";
import DOMPurify from "dompurify";
import {
  addComment,
  createTicket,
  downloadAttachment,
  getAllProducts,
  getAttachments,
  getTicketById,
  uploadAttachment,
  getApiErrorMessage,
  formatAttachmentUploadFailures,
} from "../../../../services/api";
import {
  buildExpectedProjection,
  executeTicketAction,
  getDestrovaApiErrorMessage,
  ProjectionTimeoutError,
  waitForTicketProjection,
} from "../../shared/api/ticketActions";
import { htmlToPlainText } from "../../shared/htmlPlainText";
import {
  validateCustomerReplyAttachments,
  customerAttachmentConstants,
} from "../../../../utils/customerAttachmentValidation";
import { CUSTOMER_PAGE_WRAPPER, CUSTOMER_WORKSPACE } from "../customerTokens";
import CustomerMyTicketsView from "../components/CustomerMyTicketsView";
import CustomerNewTicketView from "../components/CustomerNewTicketView";
import CustomerTicketDetailView from "../components/CustomerTicketDetailView";
import { getCustomerPriorityBadgeClass } from "../utils/customerStatusDisplay";

/** Map of ticket id -> ISO string of last seen `updatedAt` (list marks "caught up" to that server version). */
const seenMapStorageKey = (userId) => `destrova.customer.seenUpdatedAtByTicket.v1.${userId || "anon"}`;

function readSeenMapFromStorage(userId) {
  try {
    const raw = window.localStorage.getItem(seenMapStorageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v != null && String(v).trim() !== "") out[String(k)] = String(v);
    }
    return out;
  } catch {
    return {};
  }
}

const PRIORITY_OPTIONS = ["ALL", "HIGH", "MEDIUM", "LOW"];
const PRIORITY_WEIGHT = { HIGH: 3, MEDIUM: 2, LOW: 1 };
const LIST_TABS = { ACTIVE: "ACTIVE", PAST: "PAST" };

/** Sections inside the Customer preview shell. The `ticketDetail` section is a
 *  preview-only detail view so we never redirect to the legacy production page. */
const CUSTOMER_SECTIONS = {
  MY_TICKETS: "myTickets",
  NEW_TICKET: "newTicket",
  TICKET_DETAIL: "ticketDetail",
};

const defaultForm = {
  title: "",
  description: "",
  productId: "",
  priority: "MEDIUM",
};

const priorityCards = [
  { value: "HIGH", title: "High", description: "Urgent impact, needs fast attention." },
  { value: "MEDIUM", title: "Medium", description: "Important issue, normal response." },
  { value: "LOW", title: "Low", description: "Minor request or low-impact issue." },
];

function formatDate(dateValue) {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseDateOnly(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

/* ──────────────────────────────────────────────────────────────────────────── */
/* CustomerTicketsPanel — list + filters + pagination                          */
/* ──────────────────────────────────────────────────────────────────────────── */

export function CustomerTicketsPanel({
  onOpenTicket,
  onNewTicket,
  seenUpdatedAtByTicket,
  setSeenUpdatedAtByTicket,
  tickets,
  loading,
  error,
}) {
  const { appUser } = useKeycloak();
  const [listTab, setListTab] = useState(LIST_TABS.ACTIVE);
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [dateField, setDateField] = useState("SLA_DUE_DATE");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [draftDateField, setDraftDateField] = useState("SLA_DUE_DATE");
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const dateFilterRef = useRef(null);

  const customerId = appUser?.id;

  useEffect(() => {
    if (!isDatePopoverOpen) return;
    setDraftDateField(dateField);
    setDraftStartDate(startDate);
    setDraftEndDate(endDate);
  }, [isDatePopoverOpen, dateField, startDate, endDate]);

  useEffect(() => {
    const onDocClick = (event) => {
      if (!dateFilterRef.current?.contains(event.target)) {
        setIsDatePopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const formatDateFilterLabel = () => {
    const filterType = dateField === "CREATED_AT" ? "Created" : "SLA Due";
    const startLabel = startDate ? startDate.split("-").reverse().join(".") : "--";
    const endLabel = endDate ? endDate.split("-").reverse().join(".") : "--";
    return `${filterType}: ${startLabel} – ${endLabel}`;
  };

  const clearFilters = () => {
    setPriorityFilter("ALL");
    setStatusFilter("ALL");
    setSearchText("");
    setDateField("SLA_DUE_DATE");
    setStartDate("");
    setEndDate("");
    setDraftDateField("SLA_DUE_DATE");
    setDraftStartDate("");
    setDraftEndDate("");
    setSortKey("createdAt");
    setSortDir("desc");
    setIsDatePopoverOpen(false);
    setPage(1);
  };

  const clearDateFilter = () => {
    setDraftDateField("SLA_DUE_DATE");
    setDraftStartDate("");
    setDraftEndDate("");
    setDateField("SLA_DUE_DATE");
    setStartDate("");
    setEndDate("");
    setIsDatePopoverOpen(false);
    setPage(1);
  };

  const applyDateFilter = () => {
    setDateField(draftDateField || "SLA_DUE_DATE");
    setStartDate(draftStartDate);
    setEndDate(draftEndDate);
    setIsDatePopoverOpen(false);
    setPage(1);
  };

  const activeRequestCount = useMemo(() => {
    const mine = (ticket) => (customerId ? ticket.creatorId === customerId : true);
    return tickets.filter((ticket) => mine(ticket) && ticket.status !== "CLOSED").length;
  }, [tickets, customerId]);

  const filteredSorted = useMemo(() => {
    const filtered = tickets
      .filter((ticket) => (customerId ? ticket.creatorId === customerId : true))
      .filter((ticket) => {
        if (listTab === LIST_TABS.PAST) return ticket.status === "CLOSED";
        return ticket.status !== "CLOSED";
      })
      .filter((ticket) => (priorityFilter === "ALL" ? true : ticket.priority === priorityFilter))
      .filter((ticket) => statusFilter === "ALL" || ticket.status === statusFilter)
      .filter((ticket) => {
        const query = searchText.trim().toLowerCase();
        if (!query) return true;
        const idText = String(ticket.id ?? "");
        const titleText = (ticket.title || "").toLowerCase();
        const productText = (ticket.product?.name || "").toLowerCase();
        return idText.includes(query) || titleText.includes(query) || productText.includes(query);
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

    const getValue = (ticket) => {
      if (sortKey === "id") return ticket.id ?? 0;
      if (sortKey === "createdAt") return new Date(ticket.createdAt || 0).getTime();
      if (sortKey === "title") return (ticket.title || "").toLowerCase();
      if (sortKey === "priority") return PRIORITY_WEIGHT[ticket.priority] ?? 0;
      if (sortKey === "updatedAt") return new Date(ticket.updatedAt || ticket.createdAt || 0).getTime();
      if (sortKey === "closedAt") return new Date(ticket.closedAt || 0).getTime();
      if (sortKey === "slaDueDate") {
        const value = ticket.slaDueDate || ticket.createdAt;
        return value ? new Date(value).getTime() : 0;
      }
      return "";
    };

    const factor = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const left = getValue(a);
      const right = getValue(b);
      if (typeof left === "number" && typeof right === "number") return (left - right) * factor;
      return String(left).localeCompare(String(right), "en") * factor;
    });
  }, [
    tickets,
    customerId,
    listTab,
    priorityFilter,
    statusFilter,
    searchText,
    dateField,
    startDate,
    endDate,
    sortKey,
    sortDir,
  ]);

  const waitingOnYouCount = useMemo(() => {
    const mine = (ticket) => (customerId ? ticket.creatorId === customerId : true);
    return tickets.filter(
      (ticket) => mine(ticket) && ticket.status === "WAITING_FOR_CUSTOMER",
    ).length;
  }, [tickets, customerId]);

  const hasActiveFilters =
    priorityFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    Boolean(searchText.trim()) ||
    Boolean(startDate) ||
    Boolean(endDate);

  useEffect(() => {
    if (!tickets || tickets.length === 0) return;
    const stillThere = new Set(tickets.map((t) => String(t.id)));
    setSeenUpdatedAtByTicket((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const k of Object.keys(next)) {
        if (!stillThere.has(k)) {
          delete next[k];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [tickets, setSeenUpdatedAtByTicket]);

  const totalFilteredCount = filteredSorted.length;

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [totalFilteredCount, pageSize, page]);

  const rows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSorted.slice(start, start + pageSize);
  }, [filteredSorted, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [listTab, priorityFilter, statusFilter, searchText, dateField, startDate, endDate]);

  const setSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "createdAt" || key === "updatedAt" || key === "closedAt" ? "desc" : "asc");
  };

  const handlePageSizeChange = (next) => {
    setPageSize(next);
    setPage(1);
  };

  return (
    <CustomerMyTicketsView
      rows={rows}
      totalFilteredCount={totalFilteredCount}
      loading={loading}
      error={error}
      listTab={listTab === LIST_TABS.PAST ? "PAST" : "ACTIVE"}
      onListTabChange={(tab) => setListTab(tab === "PAST" ? LIST_TABS.PAST : LIST_TABS.ACTIVE)}
      activeRequestCount={activeRequestCount}
      priorityFilter={priorityFilter}
      onPriorityFilterChange={(v) => {
        setPriorityFilter(v);
        setPage(1);
      }}
      statusFilter={statusFilter}
      onStatusFilterChange={(v) => {
        setStatusFilter(v);
        setPage(1);
      }}
      priorityOptions={PRIORITY_OPTIONS}
      searchText={searchText}
      onSearchTextChange={(v) => {
        setSearchText(v);
        setPage(1);
      }}
      onClearFilters={clearFilters}
      dateFilterRef={dateFilterRef}
      isDatePopoverOpen={isDatePopoverOpen}
      onDatePopoverToggle={setIsDatePopoverOpen}
      dateFilterLabel={formatDateFilterLabel()}
      draftDateField={draftDateField}
      onDraftDateFieldChange={setDraftDateField}
      draftStartDate={draftStartDate}
      onDraftStartDateChange={setDraftStartDate}
      draftEndDate={draftEndDate}
      onDraftEndDateChange={setDraftEndDate}
      onClearDateFilter={clearDateFilter}
      onApplyDateFilter={applyDateFilter}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={setSort}
      priorityClass={getCustomerPriorityBadgeClass}
      formatDate={formatDate}
      onViewDetails={(id) => {
        onOpenTicket?.(id);
      }}
      waitingOnYouCount={waitingOnYouCount}
      hasActiveFilters={hasActiveFilters}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={handlePageSizeChange}
      onNewTicket={onNewTicket}
      seenUpdatedAtByTicket={seenUpdatedAtByTicket}
    />
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */
/* CustomerNewTicketPanel                                                       */
/* ──────────────────────────────────────────────────────────────────────────── */

export function CustomerNewTicketPanel({ onTicketCreated }) {
  const [formData, setFormData] = useState(defaultForm);
  const [products, setProducts] = useState([]);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [uploadMessage, setUploadMessage] = useState({ type: "", text: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDropActive, setIsDropActive] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoadingProducts(true);
        const response = await getAllProducts();
        setProducts(Array.isArray(response) ? response : []);
      } catch {
        setProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    loadProducts();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addFiles = (selectedFiles) => {
    if (!selectedFiles.length) return;
    setError("");
    setUploadMessage({ type: "", text: "" });
    const allowedTypes = ["image/png", "image/jpeg", "application/pdf"];
    const validFiles = [];
    for (const file of selectedFiles) {
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} exceeds 10MB limit.`);
        continue;
      }
      if (!allowedTypes.includes(file.type)) {
        setError(`${file.name} is not a supported file type.`);
        continue;
      }
      validFiles.push(file);
    }
    setFiles((prev) => {
      const existing = new Set(prev.map((file) => `${file.name}-${file.size}`));
      const appended = validFiles.filter((file) => !existing.has(`${file.name}-${file.size}`));
      return [...prev, ...appended];
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setUploadMessage({ type: "", text: "" });
    const descriptionPlain = htmlToPlainText(formData.description);
    if (!formData.title.trim() || !descriptionPlain) {
      setError("Title and Description are required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(0);
      const payload = {
        title: formData.title.trim(),
        description: DOMPurify.sanitize(formData.description.trim(), { USE_PROFILES: { html: true } }),
        priority: formData.priority,
        status: "NEW",
      };
      if (formData.productId) payload.product = { id: Number(formData.productId) };
      const createdTicket = await createTicket(payload);

      let uploadedCount = 0;
      let failedCount = 0;
      const uploadFailures = [];
      const totalFiles = files.length;
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        try {
          await uploadAttachment(createdTicket.id, file, (progressEvent) => {
            if (!progressEvent.total || totalFiles === 0) return;
            const fileProgress = progressEvent.loaded / progressEvent.total;
            const overallProgress = ((index + fileProgress) / totalFiles) * 100;
            setUploadProgress(Math.min(100, Math.round(overallProgress)));
          });
          uploadedCount += 1;
        } catch (uploadError) {
          failedCount += 1;
          uploadFailures.push({ fileName: file.name, error: uploadError });
        }
      }

      const failureDetails = formatAttachmentUploadFailures(uploadFailures);
      if (uploadedCount > 0 && failedCount === 0) {
        setUploadMessage({ type: "success", text: "Attachments uploaded successfully." });
      } else if (uploadedCount > 0 && failedCount > 0) {
        setUploadMessage({
          type: "error",
          text: `Ticket created. ${uploadedCount} attachment(s) uploaded, ${failedCount} failed. ${failureDetails}`.trim(),
        });
      } else if (files.length > 0 && failedCount > 0) {
        setUploadMessage({
          type: "error",
          text: `Ticket created, but attachments could not be uploaded. ${failureDetails}`.trim(),
        });
      } else {
        setUploadMessage({ type: "success", text: "Ticket created successfully." });
      }

      setFiles([]);
      setFormData(defaultForm);
      setUploadProgress(0);
      onTicketCreated?.();
    } catch {
      setError("Ticket could not be created.");
    } finally {
      setUploadProgress(0);
      setIsSubmitting(false);
    }
  };

  return (
    <CustomerNewTicketView
      formData={formData}
      onFieldChange={handleChange}
      products={products}
      isLoadingProducts={isLoadingProducts}
      priorityCards={priorityCards}
      onPriorityChange={(value) => setFormData((prev) => ({ ...prev, priority: value }))}
      files={files}
      isDropActive={isDropActive}
      onDragOver={() => setIsDropActive(true)}
      onDragLeave={() => setIsDropActive(false)}
      onDropFiles={addFiles}
      onInputFiles={addFiles}
      onRemoveFile={(fileIndex) => setFiles((prev) => prev.filter((_, index) => index !== fileIndex))}
      isSubmitting={isSubmitting}
      uploadProgress={uploadProgress}
      error={error}
      uploadMessage={uploadMessage}
      onSubmit={handleSubmit}
    />
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */
/* CustomerTicketDetailPanel — preview-only detail view                         */
/* Loads ticket + attachments, handles customer reply (addComment + upload).    */
/* ──────────────────────────────────────────────────────────────────────────── */

export function CustomerTicketDetailPanel({ ticketId, onBack, onTicketViewed, onListReload }) {
  const { appUser } = useKeycloak();
  const [ticket, setTicket] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [replyFiles, setReplyFiles] = useState([]);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyUploadProgress, setReplyUploadProgress] = useState(0);
  const [pageMessage, setPageMessage] = useState({ type: "", text: "" });
  const [messageAttachmentHistory, setMessageAttachmentHistory] = useState([]);
  const [resolutionBusy, setResolutionBusy] = useState(false);
  /** null | "syncing" | "timeout" — optimistic action awaiting webhook projection */
  const [syncState, setSyncState] = useState(null);
  const customerActionInFlightRef = useRef(false);
  const ticketSnapshotRef = useRef(null);

  const loadAll = useCallback(async (options = {}) => {
    const keepTicketOnError = options.keepTicketOnError === true;
    if (!ticketId) return;
    try {
      setLoading(true);
      setError("");
      const [ticketData, attachmentData] = await Promise.all([
        getTicketById(ticketId),
        getAttachments(ticketId).catch(() => []),
      ]);
      setTicket(ticketData);
      setAttachments(Array.isArray(attachmentData) ? attachmentData : []);
    } catch (loadError) {
      const msg = getApiErrorMessage(loadError, "This request could not be loaded.");
      if (keepTicketOnError) {
        if (import.meta.env.DEV) {
          console.error("[CustomerTicket] loadAll after save failed", loadError);
        }
        return;
      }
      setError(msg);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    setSyncState(null);
  }, [ticketId]);

  useEffect(() => {
    if (!ticket?.id) return;
    onTicketViewed?.(String(ticket.id), ticket.updatedAt || ticket.createdAt);
  }, [ticket?.id, ticket?.updatedAt, ticket?.createdAt, onTicketViewed]);

  const handleAddReplyFiles = (selectedFiles) => {
    if (!selectedFiles?.length) return;
    setReplyFiles((prev) => {
      const { valid, errors } = validateCustomerReplyAttachments(selectedFiles, prev);
      if (errors.length > 0) {
        setPageMessage({ type: "error", text: errors.join(" ") });
      }
      if (valid.length === 0) return prev;
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const appended = valid.filter((f) => !existing.has(`${f.name}-${f.size}`));
      if (appended.length === 0 && errors.length === 0) {
        setPageMessage({ type: "error", text: "Those files are already attached." });
      }
      return [...prev, ...appended];
    });
  };

  const handleSubmitReply = async () => {
    const plainReply = htmlToPlainText(reply);
    if (!plainReply || !ticket) return;
    if (customerActionInFlightRef.current) return;
    customerActionInFlightRef.current = true;
    try {
      const submittedMessage = DOMPurify.sanitize(reply.trim(), { USE_PROFILES: { html: true } });
      setIsSendingReply(true);
      setPageMessage({ type: "", text: "" });
      await addComment(Number(ticket.id), {
        message: submittedMessage,
        isInternal: false,
      });

      const totalFiles = replyFiles.length;
      let uploaded = 0;
      let failed = 0;
      const uploadFailures = [];
      const uploadedFileNames = [];
      setReplyUploadProgress(0);
      for (let index = 0; index < replyFiles.length; index += 1) {
        const file = replyFiles[index];
        try {
          await uploadAttachment(Number(ticket.id), file, (progressEvent) => {
            if (!progressEvent.total || totalFiles === 0) return;
            const fileProgress = progressEvent.loaded / progressEvent.total;
            const overallProgress = ((index + fileProgress) / totalFiles) * 100;
            setReplyUploadProgress(Math.min(100, Math.round(overallProgress)));
          });
          uploaded += 1;
          uploadedFileNames.push(file.name);
        } catch (uploadError) {
          failed += 1;
          uploadFailures.push({ fileName: file.name, error: uploadError });
        }
      }

      const failureDetails = formatAttachmentUploadFailures(uploadFailures);

      if (uploadedFileNames.length > 0) {
        // Preview-only mapping to show files under the same conversation message.
        setMessageAttachmentHistory((prev) => [
          ...prev,
          {
            message: submittedMessage,
            createdAt: new Date().toISOString(),
            fileNames: uploadedFileNames,
          },
        ]);
      }

      setReply("");
      setReplyFiles([]);
      setReplyUploadProgress(0);

      if (totalFiles === 0) {
        setPageMessage({ type: "success", text: "Your reply was sent." });
      } else if (uploaded > 0 && failed === 0) {
        setPageMessage({ type: "success", text: "Your reply and attachments were sent." });
      } else if (uploaded > 0 && failed > 0) {
        setPageMessage({
          type: "error",
          text: `Reply sent. ${uploaded} uploaded, ${failed} failed. ${failureDetails}`.trim(),
        });
      } else if (failed > 0) {
        setPageMessage({
          type: "error",
          text: `Reply sent, but attachments could not be uploaded. ${failureDetails}`.trim(),
        });
      }

      await loadAll({ keepTicketOnError: true });
      onListReload?.();
    } catch (sendError) {
      setPageMessage({
        type: "error",
        text: getApiErrorMessage(sendError, "Your reply could not be sent."),
      });
    } finally {
      customerActionInFlightRef.current = false;
      setReplyUploadProgress(0);
      setIsSendingReply(false);
    }
  };

  const handleDownloadAttachment = async (att) => {
    if (!att) return;
    try {
      await downloadAttachment(Number(ticket.id), att.id, att.fileName || att.name);
    } catch {
      setPageMessage({ type: "error", text: "Attachment could not be downloaded." });
    }
  };

  const applyTicketToState = useCallback((t) => {
    if (t && typeof t === "object" && t.id != null) {
      setTicket(t);
    }
  }, []);

  const handleAcceptResolution = useCallback(async () => {
    if (!ticket) return;
    if (customerActionInFlightRef.current) return;

    customerActionInFlightRef.current = true;
    ticketSnapshotRef.current = ticket;
    setResolutionBusy(true);
    setSyncState("syncing");
    setPageMessage({ type: "", text: "" });

    applyTicketToState({
      ...ticket,
      status: "CLOSED",
      closureReason: "CUSTOMER_APPROVED",
    });

    try {
      const accepted = await executeTicketAction(ticket.id, "approve");
      const expected =
        accepted?.expectedProjection ?? buildExpectedProjection("approve");
      const confirmed = await waitForTicketProjection(
        ticket.id,
        expected,
        accepted?.poll,
        () => getTicketById(ticket.id),
      );

      applyTicketToState(confirmed);
      setSyncState(null);
      setPageMessage({
        type: "success",
        text: "Thanks — this request is now closed.",
      });
      onListReload?.();
    } catch (e) {
      if (e instanceof ProjectionTimeoutError) {
        setSyncState("timeout");
        setPageMessage({
          type: "error",
          text: "Your approval was sent. The page is still catching up — refresh if the status looks unchanged.",
        });
        onListReload?.();
      } else {
        applyTicketToState(ticketSnapshotRef.current);
        setSyncState(null);
        setPageMessage({
          type: "error",
          text: getDestrovaApiErrorMessage(e, "Could not close ticket."),
        });
      }
    } finally {
      customerActionInFlightRef.current = false;
      setResolutionBusy(false);
    }
  }, [ticket, applyTicketToState, onListReload]);

  const handleRejectResolution = useCallback(
    async (customerRejectionNote) => {
      if (!ticket) return;
      if (customerActionInFlightRef.current) return;

      const note = String(customerRejectionNote || "").trim();

      customerActionInFlightRef.current = true;
      ticketSnapshotRef.current = ticket;
      setResolutionBusy(true);
      setSyncState("syncing");
      setPageMessage({ type: "", text: "" });

      applyTicketToState({
        ...ticket,
        status: "IN_PROGRESS",
        customerRejectionNote: note,
        closureReason: null,
        closedAt: null,
      });

      try {
        const accepted = await executeTicketAction(ticket.id, "reject", { reason: note });
        const expected =
          accepted?.expectedProjection ?? buildExpectedProjection("reject");
        const confirmed = await waitForTicketProjection(
          ticket.id,
          expected,
          accepted?.poll,
          () => getTicketById(ticket.id),
        );

        applyTicketToState(confirmed);
        setSyncState(null);
        setPageMessage({
          type: "success",
          text: "We’ve let the team know you still need help.",
        });
        onListReload?.();
      } catch (e) {
        if (e instanceof ProjectionTimeoutError) {
          setSyncState("timeout");
          setPageMessage({
            type: "error",
            text: "Your feedback was sent. The page is still catching up — refresh if the status looks unchanged.",
          });
          onListReload?.();
        } else {
          applyTicketToState(ticketSnapshotRef.current);
          setSyncState(null);
          setPageMessage({
            type: "error",
            text: getDestrovaApiErrorMessage(e, "Could not reject resolution."),
          });
        }
      } finally {
        customerActionInFlightRef.current = false;
        setResolutionBusy(false);
      }
    },
    [ticket, applyTicketToState, onListReload],
  );

  return (
    <CustomerTicketDetailView
      ticket={ticket}
      attachments={attachments}
      loading={loading}
      error={error}
      onBack={onBack}
      reply={reply}
      onReplyChange={setReply}
      replyFiles={replyFiles}
      onAddReplyFiles={handleAddReplyFiles}
      onRemoveReplyFile={(index) => setReplyFiles((prev) => prev.filter((_, i) => i !== index))}
      onSubmitReply={handleSubmitReply}
      isSendingReply={isSendingReply}
      replyUploadProgress={replyUploadProgress}
      onDownloadAttachment={handleDownloadAttachment}
      customerName={appUser?.firstName || appUser?.name || "You"}
      pageMessage={pageMessage}
      messageAttachmentHistory={messageAttachmentHistory}
      resolutionBusy={resolutionBusy}
      syncState={syncState}
      onAcceptResolution={handleAcceptResolution}
      onRejectResolution={handleRejectResolution}
    />
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */
/* CustomerPreviewPage — preview shell matches CustomerShellLayout outlet       */
/* ──────────────────────────────────────────────────────────────────────────── */

export default function CustomerPreviewPage() {
  const { appUser } = useKeycloak();
  const [activeSection, setActiveSection] = useState(getRoleDefaultLanding(SHELL_ROLES.CUSTOMER));
  const [detailTicketId, setDetailTicketId] = useState(null);
  /** Persists when navigating to detail so list “new update” markers clear and stay cleared. */
  const [seenUpdatedAtByTicket, setSeenUpdatedAtByTicket] = useState({});
  const { tickets, loading, error, reload } = useTickets();

  useEffect(() => {
    if (appUser?.id == null) return;
    setSeenUpdatedAtByTicket((prev) => ({ ...readSeenMapFromStorage(appUser.id), ...prev }));
  }, [appUser?.id]);

  useEffect(() => {
    if (appUser?.id == null) return;
    try {
      window.localStorage.setItem(seenMapStorageKey(appUser.id), JSON.stringify(seenUpdatedAtByTicket));
    } catch {
      /* ignore */
    }
  }, [appUser?.id, seenUpdatedAtByTicket]);

  const handleTicketCreated = useCallback(() => {
    reload();
    setActiveSection(CUSTOMER_SECTIONS.MY_TICKETS);
  }, [reload]);

  const markTicketSeenAt = useCallback((ticketId, updatedAt) => {
    if (ticketId == null || updatedAt == null) return;
    setSeenUpdatedAtByTicket((prev) => ({ ...prev, [String(ticketId)]: String(updatedAt) }));
  }, []);

  // The sidebar only switches between list and new request. Detail is preview-only.
  const navItemId =
    activeSection === CUSTOMER_SECTIONS.TICKET_DETAIL
      ? CUSTOMER_SECTIONS.MY_TICKETS
      : activeSection;
  const activeNav = getRoleNavItem(SHELL_ROLES.CUSTOMER, navItemId);

  const topbarTitle =
    activeSection === CUSTOMER_SECTIONS.TICKET_DETAIL
      ? `Request #${detailTicketId || ""}`
      : activeNav?.label || "Customer Portal";

  const handleSelectSection = (sectionId) => {
    setActiveSection(sectionId);
    if (sectionId !== CUSTOMER_SECTIONS.TICKET_DETAIL) {
      setDetailTicketId(null);
    }
  };

  const handleOpenTicket = useCallback(
    (id) => {
      const t = (tickets || []).find((x) => String(x.id) === String(id));
      if (t) {
        markTicketSeenAt(String(t.id), t.updatedAt || t.createdAt);
      }
      setDetailTicketId(id);
      setActiveSection(CUSTOMER_SECTIONS.TICKET_DETAIL);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    },
    [tickets, markTicketSeenAt],
  );

  const handleBackFromDetail = () => {
    setDetailTicketId(null);
    setActiveSection(CUSTOMER_SECTIONS.MY_TICKETS);
  };

  return (
    <AppShell
      role={SHELL_ROLES.CUSTOMER}
      activeNavId={navItemId}
      onNavChange={handleSelectSection}
      topbarTitle={topbarTitle}
      onTopbarAction={(action) => {
        if (action === "newTicket") handleSelectSection(CUSTOMER_SECTIONS.NEW_TICKET);
      }}
    >
      <div className={CUSTOMER_WORKSPACE.main}>
        <div className={CUSTOMER_PAGE_WRAPPER}>
          {activeSection === CUSTOMER_SECTIONS.TICKET_DETAIL ? (
            <CustomerTicketDetailPanel
              ticketId={detailTicketId}
              onBack={handleBackFromDetail}
              onTicketViewed={markTicketSeenAt}
              onListReload={reload}
            />
          ) : activeSection === CUSTOMER_SECTIONS.NEW_TICKET ? (
            <CustomerNewTicketPanel onTicketCreated={handleTicketCreated} />
          ) : (
            <CustomerTicketsPanel
              onOpenTicket={handleOpenTicket}
              onNewTicket={() => handleSelectSection(CUSTOMER_SECTIONS.NEW_TICKET)}
              seenUpdatedAtByTicket={seenUpdatedAtByTicket}
              setSeenUpdatedAtByTicket={setSeenUpdatedAtByTicket}
              tickets={tickets}
              loading={loading}
              error={error}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
