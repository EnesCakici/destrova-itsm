import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ROLES } from "../constants/roles";
import { useKeycloak } from "../context/KeycloakContext";
import {
  addComment,
  addWorklog,
  assignTicketToMe,
  deleteAttachment,
  downloadAttachment,
  getAttachments,
  getTicketById,
  updateTicketStatus,
  uploadAttachment,
} from "../services/api";
import PageAlert from "./PageAlert";

const replyTabs = [
  { key: "EXTERNAL", label: "External (Musteriye Yaz)" },
  { key: "INTERNAL", label: "Internal (Ekip Ici Not)" },
];

const mockAgentOptions = [
  { id: 2, name: "Agent Melis" },
  { id: 3, name: "Agent Ahmet" },
  { id: 4, name: "Agent Selin" },
];

function TicketDetailView({ role }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { appUser } = useKeycloak();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  /** Ortak kapatilabilir banner (hata / basari). */
  const [pageAlert, setPageAlert] = useState({ variant: "", text: "" });
  const dismissPageAlert = () => setPageAlert({ variant: "", text: "" });
  const showPageAlert = (variant, text) => setPageAlert({ variant, text });
  const [reply, setReply] = useState("");
  const [replyTab, setReplyTab] = useState("EXTERNAL");
  const [isSending, setIsSending] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isProcessingDecision, setIsProcessingDecision] = useState(false);
  const [agentStatusDraft, setAgentStatusDraft] = useState("IN_PROGRESS");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [worklogEffort, setWorklogEffort] = useState("");
  const [worklogDescription, setWorklogDescription] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);
  const [closureCode, setClosureCode] = useState("SOLVED");
  const [closureNote, setClosureNote] = useState("");
  const [showClosureActions, setShowClosureActions] = useState(false);
  const [isResolvingTicket, setIsResolvingTicket] = useState(false);
  const [isAddingWorklog, setIsAddingWorklog] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState(null);
  const [replyFiles, setReplyFiles] = useState([]);
  const [replyUploadProgress, setReplyUploadProgress] = useState(0);
  const [isReplyDropActive, setIsReplyDropActive] = useState(false);
  const fileInputRef = useRef(null);
  const canSeeWorklogs = role === ROLES.AGENT || role === ROLES.MANAGER;
  const ticketAssigneeId = ticket?.assigneeId ?? ticket?.assignee?.id ?? null;
  const currentUserId = appUser?.id ?? null;
  const isAssigneeAgent =
    role === ROLES.AGENT &&
    ticketAssigneeId != null &&
    currentUserId != null &&
    Number(ticketAssigneeId) === Number(currentUserId);
  const isNonAssigneeAgent = role === ROLES.AGENT && !isAssigneeAgent;
  const canAddWorklog = isAssigneeAgent;
  const canChangeStatus = isAssigneeAgent;
  const canResolveTicket = isAssigneeAgent;
  const canTransferAssign = role === ROLES.MANAGER;
  const canWriteExternalReply = role === ROLES.CUSTOMER || isAssigneeAgent;
  const canWriteInternalReply = role === ROLES.AGENT;
  const canUseReplyPanel = role === ROLES.CUSTOMER || role === ROLES.AGENT;
  const canAttachWithReply = role === ROLES.CUSTOMER || isAssigneeAgent;
  const canSelfAssign = role === ROLES.AGENT && ticketAssigneeId == null && currentUserId != null;

  const isReplyLocked =
    role === ROLES.CUSTOMER && (ticket?.status === "RESOLVED" || ticket?.status === "CLOSED");

  const listLabelByRole = {
    [ROLES.CUSTOMER]: "Taleplerim",
    [ROLES.AGENT]: "Destek Havuzu",
    [ROLES.MANAGER]: "Ticketlar",
  };

  const loadTicket = async () => {
    try {
      setLoading(true);
      const data = await getTicketById(id);
      const attachmentData = await getAttachments(id);

      setTicket(data);
      setAttachments(Array.isArray(attachmentData) ? attachmentData : []);
      setAgentStatusDraft(data.status || "IN_PROGRESS");
      setSelectedAssignee(String(data.assigneeId || data.assignee?.id || ""));

    } catch (loadError) {
      showPageAlert("error", loadError.response?.data?.message || "Ticket detayi yuklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    dismissPageAlert();
    loadTicket();
  }, [id]);

  useEffect(() => {
    // Atanmamis agent sadece internal sekmede kalir.
    if (role === ROLES.AGENT && isNonAssigneeAgent && replyTab !== "INTERNAL") {
      setReplyTab("INTERNAL");
    }
  }, [role, isNonAssigneeAgent, replyTab]);

  const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const timelineEvents = useMemo(() => {
    if (!ticket) return [];
    const systemEvents = [];
    if (ticket.createdAt) {
      systemEvents.push({ type: "SYSTEM", createdAt: ticket.createdAt, message: "Ticket Acildi" });
    }
    if (ticket.updatedAt && ticket.updatedAt !== ticket.createdAt) {
      systemEvents.push({
        type: "SYSTEM",
        createdAt: ticket.updatedAt,
        message: `Statu guncellendi (${ticket.status})`,
      });
    }
    if (ticket.status === "CLOSED" && ticket.closedAt) {
      systemEvents.push({
        type: "SYSTEM",
        createdAt: ticket.closedAt,
        message: `Ticket Kapatildi (Neden: ${ticket.closureReason || "-"})`,
      });
    }

    const commentEvents = (ticket.comments || [])
      .filter((comment) => (role === ROLES.CUSTOMER ? !comment.isInternal : true))
      .map((comment) => ({
        type: comment.authorType,
        createdAt: comment.createdAt,
        authorName: comment.authorName,
        message: comment.message,
        isInternal: Boolean(comment.isInternal),
      }));

    return [...systemEvents, ...commentEvents].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [ticket, role]);

  const handleSendReply = async () => {
    if (isReplyLocked || !reply.trim()) return;
    if (!canUseReplyPanel) return;
    if (replyTab === "EXTERNAL" && !canWriteExternalReply) {
      showPageAlert("error", "External reply sadece ticket assignee agent tarafindan gonderilebilir.");
      return;
    }
    if (replyTab === "INTERNAL" && !canWriteInternalReply) {
      showPageAlert("error", "Internal not gonderme yetkiniz yok.");
      return;
    }
    try {
      setIsSending(true);
      dismissPageAlert();
      await addComment(Number(id), {
        message: reply.trim(),
        isInternal: role === ROLES.AGENT && replyTab === "INTERNAL",
      });

      let uploadedCount = 0;
      let failedCount = 0;
      const totalFiles = replyFiles.length;
      setReplyUploadProgress(0);
      for (let index = 0; index < replyFiles.length; index += 1) {
        const file = replyFiles[index];
        try {
          await uploadAttachment(Number(id), file, (progressEvent) => {
            if (!progressEvent.total || totalFiles === 0) return;
            const fileProgress = progressEvent.loaded / progressEvent.total;
            const overallProgress = ((index + fileProgress) / totalFiles) * 100;
            setReplyUploadProgress(Math.min(100, Math.round(overallProgress)));
          });
          uploadedCount += 1;
        } catch (uploadError) {
          failedCount += 1;
          console.error(uploadError.response?.data || uploadError.message);
        }
      }

      if (uploadedCount > 0 && failedCount === 0) {
        showPageAlert("success", "Dosyalar basariyla yuklendi.");
      } else if (uploadedCount > 0 && failedCount > 0) {
        showPageAlert("error", `${uploadedCount} dosya yuklendi, ${failedCount} dosya yuklenemedi.`);
      } else if (replyFiles.length > 0 && failedCount > 0) {
        showPageAlert("error", "Dosya yukleme basarisiz oldu.");
      }

      setReply("");
      setReplyFiles([]);
      setReplyUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await loadTicket();
    } catch (sendError) {
      showPageAlert("error", sendError.response?.data?.message || "Yanit gonderilemedi.");
    } finally {
      setReplyUploadProgress(0);
      setIsSending(false);
    }
  };

  const addReplyFiles = (selectedFiles) => {
    if (selectedFiles.length === 0) return;
    if (!canAttachWithReply) {
      showPageAlert("error", "Attachment sadece musteri veya assignee agent tarafindan eklenebilir.");
      return;
    }
    dismissPageAlert();
    const allowedTypes = ["image/png", "image/jpeg", "application/pdf"];
    const validFiles = [];
    for (const file of selectedFiles) {
      if (file.size > 10 * 1024 * 1024) {
        showPageAlert("error", `${file.name} 10MB sinirini asiyor.`);
        continue;
      }
      if (!allowedTypes.includes(file.type)) {
        showPageAlert("error", `${file.name} desteklenmeyen dosya turu.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      // Ayni dosyayi tekrar eklemeyi engelle.
      setReplyFiles((prev) => {
        const existing = new Set(prev.map((file) => `${file.name}-${file.size}`));
        const appended = validFiles.filter((file) => !existing.has(`${file.name}-${file.size}`));
        return [...prev, ...appended];
      });
      dismissPageAlert();
    }
  };

  const handleReplyFileSelect = (event) => {
    addReplyFiles(Array.from(event.target.files || []));
    event.target.value = "";
  };

  const handleAgentStatusUpdate = async () => {
    if (!canChangeStatus) {
      showPageAlert("error", "Status islemini sadece ticket assignee agent yapabilir.");
      return;
    }
    try {
      setIsUpdatingStatus(true);
      dismissPageAlert();
      await updateTicketStatus(Number(id), agentStatusDraft);
      await loadTicket();
    } catch (updateError) {
      showPageAlert("error", updateError.response?.data?.message || "Statu guncellenemedi.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleReassign = async () => {
    if (!canTransferAssign) return;
    if (!selectedAssignee) return;
    const isConfirmed = window.confirm("Bu ticket'i secili agente devretmek istediginize emin misiniz?");
    if (!isConfirmed) {
      return;
    }

    try {
      setIsReassigning(true);
      dismissPageAlert();
      await assignTicketToMe(Number(id), Number(selectedAssignee), ticket.status || "IN_PROGRESS");
      navigate("/agent/inbox");
    } catch (assignError) {
      showPageAlert("error", assignError.response?.data?.message || "Ticket devredilemedi.");
    } finally {
      setIsReassigning(false);
    }
  };

  const handleSelfAssign = async () => {
    if (!canSelfAssign) return;
    try {
      setIsReassigning(true);
      dismissPageAlert();
      await assignTicketToMe(Number(id), Number(currentUserId), ticket?.status || "IN_PROGRESS");
      await loadTicket();
      showPageAlert("success", "Ticket uzerinize alindi.");
    } catch (assignError) {
      showPageAlert("error", assignError.response?.data?.message || "Ticket uzerinize alinamadi.");
    } finally {
      setIsReassigning(false);
    }
  };

  const parseEffortToMinutes = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
    const [hoursText, minutesText] = trimmed.split(":");
    const hours = Number(hoursText);
    const minutes = Number(minutesText);
    if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes < 0 || minutes > 59) {
      return null;
    }
    return hours * 60 + minutes;
  };

  const handleAddWorklog = async () => {
    const durationMinutes = parseEffortToMinutes(worklogEffort);
    if (!durationMinutes || durationMinutes <= 0) {
      showPageAlert("error", "Gecerli bir efor suresi giriniz. Ornek: 01:30 veya 90");
      return;
    }
    if (!worklogDescription.trim()) {
      showPageAlert("error", "Worklog aciklamasi zorunludur.");
      return;
    }

    try {
      setIsAddingWorklog(true);
      dismissPageAlert();
      await addWorklog(Number(id), {
        durationMinutes,
        description: worklogDescription.trim(),
      });
      setWorklogEffort("");
      setWorklogDescription("");
      await loadTicket();
    } catch (worklogError) {
      showPageAlert("error", worklogError.response?.data?.message || "Worklog eklenemedi.");
    } finally {
      setIsAddingWorklog(false);
    }
  };

  const handleResolveTicket = async () => {
    if (!canResolveTicket) {
      showPageAlert("error", "Kapatma islemini sadece ticket assignee agent yapabilir.");
      return;
    }
    if (!closureNote.trim()) {
      showPageAlert("error", "Bileti kapatmadan once kapanis aciklamasi zorunludur.");
      return;
    }
    const targetStatus =
      closureCode === "INVALID" || closureCode === "DUPLICATE" ? "CLOSED" : "RESOLVED";
    try {
      setIsResolvingTicket(true);
      dismissPageAlert();
      await updateTicketStatus(Number(id), targetStatus, closureCode);
      await addComment(Number(id), {
        message: `Cozum notu: ${closureNote.trim()} (Durum: ${closureCode}, Sonuc: ${targetStatus})`,
        isInternal: false,
      });
      setShowClosureActions(false);
      setClosureNote("");
      await loadTicket();
    } catch (resolveError) {
      showPageAlert("error", resolveError.response?.data?.message || "Ticket RESOLVED durumuna alinamadi.");
    } finally {
      setIsResolvingTicket(false);
    }
  };

  const handleApproveSolution = async () => {
    const isConfirmed = window.confirm(
      "Biletin basariyla cozuldugunu onayliyor musunuz? Bu islem biletinizi kalici olarak kapatacaktir."
    );
    if (!isConfirmed) return;

    try {
      setIsProcessingDecision(true);
      dismissPageAlert();
      await updateTicketStatus(Number(id), "CLOSED", "CUSTOMER_APPROVED");
      await addComment(Number(id), {
        message: "Musteri cozumu onayladi. Ticket kapatildi.",
        isInternal: false,
      });
      await loadTicket();
    } catch (decisionError) {
      showPageAlert("error", decisionError.response?.data?.message || "Onay islemi basarisiz oldu.");
    } finally {
      setIsProcessingDecision(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectionNote.trim()) {
      showPageAlert("error", "Cozumu reddederken kisa bir aciklama yaziniz.");
      return;
    }
    try {
      setIsProcessingDecision(true);
      dismissPageAlert();
      await updateTicketStatus(Number(id), "IN_PROGRESS");
      await addComment(Number(id), {
        message: `Musteri cozumu reddetti: ${rejectionNote.trim()}`,
        isInternal: false,
      });
      setRejectionNote("");
      setShowRejectForm(false);
      await loadTicket();
    } catch (decisionError) {
      showPageAlert("error", decisionError.response?.data?.message || "Red islemi basarisiz oldu.");
    } finally {
      setIsProcessingDecision(false);
    }
  };

  const handleDownloadAttachment = async (attachmentId, fileName) => {
    try {
      dismissPageAlert();
      await downloadAttachment(ticket.id, attachmentId, fileName);
    } catch (downloadError) {
      showPageAlert("error", downloadError.response?.data?.message || "Dosya indirilemedi.");
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    const isConfirmed = window.confirm("Bu dosyayi silmek istediginize emin misiniz?");
    if (!isConfirmed) {
      return;
    }

    try {
      setDeletingAttachmentId(attachmentId);
      dismissPageAlert();
      await deleteAttachment(ticket.id, attachmentId);
      const attachmentData = await getAttachments(id);
      setAttachments(Array.isArray(attachmentData) ? attachmentData : []);
      showPageAlert("success", "Dosya basariyla silindi.");
    } catch (deleteError) {
      showPageAlert("error", deleteError.response?.data?.message || "Dosya silinemedi.");
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  if (loading) return <section className="card">Detay yukleniyor...</section>;
  if (!ticket) {
    return (
      <section className="card">
        {pageAlert.text ? (
          <PageAlert variant={pageAlert.variant} message={pageAlert.text} onDismiss={dismissPageAlert} />
        ) : (
          <p>Ticket bulunamadi.</p>
        )}
        <Link className="btn btn-secondary" to={`/${role.toLowerCase()}/tickets`} style={{ marginTop: "12px", display: "inline-block" }}>
          Listeye don
        </Link>
      </section>
    );
  }

  return (
    <div>
      <nav className="detail-breadcrumb">
        <Link to="/">Anasayfa</Link>
        <span> &gt; </span>
        <Link to={`/${role.toLowerCase()}/tickets`}>{listLabelByRole[role] || "Ticketlar"}</Link>
        <span> &gt; </span>
        <strong>Detay</strong>
      </nav>

      {pageAlert.text ? (
        <PageAlert variant={pageAlert.variant} message={pageAlert.text} onDismiss={dismissPageAlert} />
      ) : null}

      <div className="detail-layout">
        <section className="card">
          <div className="detail-hero">
            <h2>{ticket.title}</h2>
            <p>{ticket.description}</p>
          </div>

          <div className="timeline-modern">
            {timelineEvents.map((event, index) => (
              <div key={`${event.createdAt}-${index}`} className="timeline-row">
                <div className="timeline-dot" />
                {event.type === "SYSTEM" ? (
                  <div className="timeline-system-event">
                    <small>{formatDateTime(event.createdAt)} - </small>
                    {event.message}
                  </div>
                ) : (
                  <div
                    className={`timeline-bubble ${
                      event.isInternal
                        ? "timeline-bubble-internal"
                        : event.type === "AGENT"
                          ? "timeline-bubble-agent"
                          : "timeline-bubble-user"
                    }`}
                  >
                    <strong>{event.authorName}</strong>
                    {event.isInternal ? <span className="internal-note-tag">Internal Note</span> : null}
                    <p>{event.message}</p>
                    <small>{formatDateTime(event.createdAt)}</small>
                  </div>
                )}
      </div>
            ))}
          </div>

          {canUseReplyPanel ? (
            <div
              className="reply-box"
              onDragOver={(event) => {
                event.preventDefault();
                setIsReplyDropActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsReplyDropActive(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsReplyDropActive(false);
                addReplyFiles(Array.from(event.dataTransfer.files || []));
              }}
              style={isReplyDropActive ? { borderColor: "#3b82f6", background: "#eff6ff" } : undefined}
            >
            <label>Yanit Yaz</label>
            {role === ROLES.AGENT ? (
              <div className="agent-reply-tabs">
                {replyTabs.map((tab) => (
                  <button
                    key={tab.key}
                    className={`agent-reply-tab ${replyTab === tab.key ? "active" : ""}`}
                    disabled={tab.key === "EXTERNAL" && !canWriteExternalReply}
                    onClick={() => setReplyTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            ) : null}
            <textarea
              className={role === ROLES.AGENT && replyTab === "INTERNAL" ? "internal-reply-textarea" : ""}
              rows={4}
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder={
                isReplyLocked
                  ? "Bilet statusu nedeniyle yeni yanit eklenemez. Lutfen sag paneldeki islem butonlarini kullanin."
                  : role === ROLES.AGENT && replyTab === "INTERNAL"
                    ? "Ekip ici notunuzu yazin..."
                    : "Yanitinizi buraya yazin..."
              }
              disabled={isReplyLocked || (replyTab === "EXTERNAL" && !canWriteExternalReply)}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf"
              style={{ display: "none" }}
              onChange={handleReplyFileSelect}
            />
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "8px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isReplyLocked || isSending || !canAttachWithReply}
                title="Dosya ekle"
                style={{ minWidth: "44px", padding: "8px 12px" }}
              >
                📎
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSendReply}
                disabled={
                  isSending ||
                  isReplyLocked ||
                  (replyTab === "EXTERNAL" && !canWriteExternalReply) ||
                  (replyTab === "INTERNAL" && !canWriteInternalReply)
                }
              >
                {isSending ? "Gonderiliyor..." : "Gonder"}
              </button>
            </div>
            {replyFiles.length > 0 ? (
              <ul className="selected-file-list" style={{ marginTop: "8px" }}>
                {replyFiles.map((file, index) => (
                  <li key={`${file.name}-${file.size}-${index}`}>
                    <span>
                      {file.name} - {Math.round(file.size / 1024)} KB
                    </span>
                    <button
                      type="button"
                      className="btn btn-link"
                      onClick={() => setReplyFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))}
                    >
                      Kaldir
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {isSending && replyFiles.length > 0 ? (
              <div style={{ marginTop: "8px" }}>
                <small>Upload ilerlemesi: %{replyUploadProgress}</small>
                <div
                  style={{
                    height: "6px",
                    background: "#e5e7eb",
                    borderRadius: "999px",
                    overflow: "hidden",
                    marginTop: "4px",
                  }}
                >
                  <div
                    style={{
                      width: `${replyUploadProgress}%`,
                      height: "100%",
                      background: "#3b82f6",
                      transition: "width 0.2s ease",
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
          ) : null}
        </section>

        <aside className="card detail-side">
          <div className="detail-side-card">
            <h3>Ticket Bilgileri</h3>
            <p>Ticket ID: {ticket.id}</p>
            <p>
              Statu: <span className={`badge status-${(ticket.status || "").toLowerCase()}`}>{ticket.status}</span>
            </p>
            <p>
              Oncelik:{" "}
              <span className={`badge priority-${(ticket.priority || "").toLowerCase()}`}>{ticket.priority}</span>
            </p>
            <p>Olusturma Tarihi: {formatDateTime(ticket.createdAt)}</p>
            {canSelfAssign ? (
              <button className="btn btn-primary" disabled={isReassigning} onClick={handleSelfAssign}>
                {isReassigning ? "Ataniyor..." : "Ticket'i Uzerime Al"}
              </button>
            ) : null}
          </div>

          {role === ROLES.AGENT && canChangeStatus ? (
            <>
              <div className="detail-side-card">
                <h4>Aksiyonlar</h4>
                <label>
                  Statu
                  <select value={agentStatusDraft} onChange={(event) => setAgentStatusDraft(event.target.value)}>
                    <option value="NEW">NEW</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                </label>
                <button className="btn btn-primary" disabled={isUpdatingStatus} onClick={handleAgentStatusUpdate}>
                  {isUpdatingStatus ? "Guncelleniyor..." : "Statuyu Guncelle"}
                </button>
              </div>
            </>
          ) : null}

          {canSeeWorklogs ? (
            <div className="detail-side-card">
              <h4>Worklog</h4>

              {canAddWorklog ? (
                <>
                  <label>
                    Harcanan Efor (Saat/Dk)
                    <input
                      type="text"
                      placeholder="Orn: 01:30"
                      value={worklogEffort}
                      onChange={(event) => setWorklogEffort(event.target.value)}
                    />
                  </label>

                  <label>
                    Aciklama
                    <textarea
                      rows={2}
                      placeholder="Yapilan is ozetini yazin..."
                      value={worklogDescription}
                      onChange={(event) => setWorklogDescription(event.target.value)}
                    />
                  </label>

                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={handleAddWorklog}
                    disabled={isAddingWorklog}
                  >
                    {isAddingWorklog ? "Ekleniyor..." : "Ekle"}
                  </button>
                </>
              ) : null}

              {(ticket.worklogs || []).length > 0 ? (
                <div className="worklog-list">
                  {(ticket.worklogs || []).map((worklog) => (
                    <div key={worklog.id} className="worklog-item">
                      <strong>{worklog.durationMinutes} dk</strong>
                      <span>{worklog.description}</span>
                      <small>{formatDateTime(worklog.workDate)}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Henuz worklog bulunmuyor.</p>
              )}
            </div>
          ) : null}

          {canTransferAssign ? (
            <>
              <div className="detail-side-card">
                <h4>Devir</h4>
                <label>
                  Kisi Sec
                  <select value={selectedAssignee} onChange={(event) => setSelectedAssignee(event.target.value)}>
                    <option value="">Seciniz</option>
                    {mockAgentOptions.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="btn btn-secondary" disabled={!selectedAssignee || isReassigning} onClick={handleReassign}>
                  {isReassigning ? "Devrediliyor..." : "Devret"}
                </button>
              </div>
            </>
          ) : null}

          {canResolveTicket ? (
            <div className="detail-side-card">
              <h4>Kapatma</h4>
              <label>
                Cozum Kodu
                <select
                  value={closureCode}
                  onChange={(event) => {
                    setClosureCode(event.target.value);
                    setShowClosureActions(true);
                  }}
                >
                  <option value="SOLVED">Cozuldu</option>
                  <option value="CUSTOMER_APPROVED">Musteri onayi alindi</option>
                  <option value="INVALID">Gecersiz / Cozulemez</option>
                  <option value="NO_RESPONSE">Musteri yanit vermedi</option>
                  <option value="DUPLICATE">Yinelenen kayit</option>
                </select>
              </label>

              {showClosureActions ? (
                <div className="closure-action-panel">
                  <label>
                    Kapanis Aciklamasi
                    <textarea
                      rows={3}
                      value={closureNote}
                      onChange={(event) => setClosureNote(event.target.value)}
                      placeholder="Cozum detayini zorunlu olarak yaziniz..."
                    />
                  </label>
                  <div className="reject-form-actions">
                    <button className="btn btn-primary" onClick={handleResolveTicket} disabled={isResolvingTicket}>
                      {isResolvingTicket ? "Kapatiliyor..." : "Bileti Kapat"}
                    </button>
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => {
                        setShowClosureActions(false);
                        setClosureNote("");
                      }}
                    >
                      Vazgec
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {role === ROLES.CUSTOMER && ticket.status === "RESOLVED" ? (
            <div className="customer-decision-box">
              <h4>Musteri Karari</h4>
              <button className="btn btn-primary" disabled={isProcessingDecision} onClick={handleApproveSolution}>
                Cozumu Onayla
              </button>
              <button
                className="btn btn-secondary"
                disabled={isProcessingDecision}
                onClick={() => {
                  dismissPageAlert();
                  setShowRejectForm((prev) => !prev);
                }}
              >
                Cozumu Reddet
              </button>
              <div className={`reject-form-collapse ${showRejectForm ? "open" : ""}`}>
                <label htmlFor="rejectNote">Red Aciklamasi</label>
                <textarea
                  id="rejectNote"
                  rows={3}
                  value={rejectionNote}
                  onChange={(event) => setRejectionNote(event.target.value)}
                  placeholder="Neden reddettiginizi kisaca yaziniz..."
                />
                <div className="reject-form-actions">
                  <button className="btn btn-secondary" disabled={isProcessingDecision} onClick={handleRejectSubmit}>
                    Reddi Gonder
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={isProcessingDecision}
                    onClick={() => {
                      setRejectionNote("");
                      dismissPageAlert();
                      setShowRejectForm(false);
                    }}
                  >
                    Vazgec
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="file-list-box">
            <h4>Ekli Dosyalar</h4>

            {attachments.length === 0 ? (
              <p>Bu ticket icin ekli dosya bulunmuyor.</p>
            ) : (
              <ul>
                {attachments.map((file) => (
                  <li key={file.id}>
                    <span>📎 {file.fileName}</span>
                    <span>{Math.round(file.fileSize / 1024)} KB</span>
                    <button
                      type="button"
                      className="btn btn-link"
                      onClick={() => handleDownloadAttachment(file.id, file.fileName)}
                    >
                      Indir
                    </button>
                    <button
                      type="button"
                      className="btn btn-link"
                      disabled={deletingAttachmentId === file.id}
                      onClick={() => handleDeleteAttachment(file.id)}
                    >
                      {deletingAttachmentId === file.id ? "Siliniyor..." : "Sil"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link className="btn btn-secondary" to={`/${role.toLowerCase()}/tickets`}>
            Listeye don
          </Link>
        </aside>
      </div>
    </div>
  );
}

export default TicketDetailView;

