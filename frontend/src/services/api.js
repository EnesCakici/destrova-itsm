import axios from "axios";
import keycloak from "../keycloak";

async function attachFreshToken(config) {
  if (keycloak.authenticated) {
    try {
      await keycloak.updateToken(30);
    } catch {
      // Yenileme basarisizsa istek token olmadan veya eski token ile gidebilir; sunucu 401 donebilir.
    }
  }
  const token = keycloak.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}

// Ticket endpointleri icin ortak axios istemcisi.
const api = axios.create({
  baseURL: "http://localhost:8080/api/tickets",
});

api.interceptors.request.use(attachFreshToken, (error) => Promise.reject(error));

/**
 * Axios error → user-facing or fallback. Backend sends { message, status, timestamp }.
 * @param {unknown} error
 * @param {string} [fallback]
 * @returns {string}
 */
export function getApiErrorMessage(error, fallback = "Request failed.") {
  const d = error?.response?.data;
  if (typeof d === "string" && d.trim()) return d.trim();
  if (d && typeof d === "object" && typeof d.message === "string" && d.message.trim()) {
    return d.message.trim();
  }
  if (error?.message && String(error.message).trim()) {
    return String(error.message).trim();
  }
  return fallback;
}

/**
 * @param {Array<{ fileName?: string, error: unknown }>} failures
 * @returns {string} Per-file backend reasons (e.g. size, type, count).
 */
export function formatAttachmentUploadFailures(failures) {
  if (!Array.isArray(failures) || failures.length === 0) return "";
  return failures
    .map(({ fileName, error }) => {
      const detail = getApiErrorMessage(error, "Upload failed.");
      return fileName ? `${fileName}: ${detail}` : detail;
    })
    .join(" ");
}

// Genel axios istemcisi (products, dashboard, /users/me vb.)
const publicApi = axios.create({
  baseURL: "http://localhost:8080/api",
});

publicApi.interceptors.request.use(attachFreshToken, (error) => Promise.reject(error));

export const NOTIFICATIONS_BUMP_EVENT = "destrova:notifications";

/** Topbar bildirim rozetini güncellemek için (polling yok; bu event ile tetiklenir). */
export function bumpNotifications() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_BUMP_EVENT));
  }
}

// JWT'ye bagli uygulama kullanici kaydi (creatorId / assigneeId ile eslesir).
export const getCurrentAppUser = async () => {
  const response = await publicApi.get("/users/me");
  return response.data;
};

// Tum ticket listesini getirir.
export const getAllTickets = async () => {
  try {
    const response = await api.get("");
    return response.data;
  } catch (error) {
    console.error(error.response?.data || error.message);
    throw error;
  }
};

// Yeni ticket olusturur.
export const createTicket = async (ticketPayload) => {
  try {
    const response = await api.post("", ticketPayload);
    bumpNotifications();
    return response.data;
  } catch (error) {
    console.error(error.response?.data || error.message);
    throw error;
  }
};

// Ticket detayini id ile getirir.
export const getTicketById = async (id) => {
  try {
    const response = await api.get(`/${id}`);
    const data = response.data;
    return data === undefined || data === "" ? null : data;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("[api] getTicketById", id, error.response?.status, error.response?.data);
    }
    throw error;
  }
};

// Ticket statusunu (ve gerekiyorsa kapanis nedenini) gunceller.
export const updateTicketStatus = async (id, status, closureReason) => {
  try {
    const payload = closureReason ? { status, closureReason } : { status };
    const response = await api.put(`/${id}`, payload);
    bumpNotifications();
    return response.data;
  } catch (error) {
    console.error(error.response?.data || error.message);
    throw error;
  }
};

/** Full ticket PUT (status, priority, closureReason, assigneeId, description, …) */
export const updateTicket = async (id, payload) => {
  try {
    const response = await api.put(`/${id}`, payload);
    const data = response.data;
    if (import.meta.env.DEV) {
      console.debug("[api] updateTicket ok", { id, status: response.status, hasBody: data != null && data !== "" });
    }
    bumpNotifications();
    return data === undefined || data === "" ? null : data;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("[api] updateTicket failed", { id, payload, status: error.response?.status, data: error.response?.data });
    }
    throw error;
  }
};

// Ticketa agent atar (senkron DB guncellemesi — manager reassign / direct assign).
export const assignTicket = async (id, assigneeId, status) => {
  try {
    const payload = { assigneeId };
    if (status != null && status !== "") payload.status = status;
    const response = await api.post(`/${id}/assign`, payload);
    bumpNotifications();
    return response.data;
  } catch (error) {
    console.error(error.response?.data || error.message);
    throw error;
  }
};

// Agent kendi kendine atar (status ile birlikte).
export const assignTicketToMe = async (id, assigneeId, status = "IN_PROGRESS") => {
  return assignTicket(id, assigneeId, status);
};

// Ticketa yorum ekler. Body: { message, isInternal } (CommentCreateRequest)
export const addComment = async (ticketId, commentData) => {
  try {
    const response = await api.post(`/${ticketId}/comments`, commentData);
    const data = response.data;
    if (import.meta.env.DEV) {
      console.debug("[api] addComment ok", { ticketId, status: response.status, hasBody: data != null && data !== "" });
    }
    bumpNotifications();
    return data === undefined || data === "" ? null : data;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("[api] addComment failed", { ticketId, commentData, status: error.response?.status, data: error.response?.data });
    }
    throw error;
  }
};

// Ticketa worklog (efor kaydi) ekler.
export const addWorklog = async (ticketId, worklogData) => {
  try {
    const response = await api.post(`/${ticketId}/worklogs`, worklogData);
    return response.data;
  } catch (error) {
    console.error(error.response?.data || error.message);
    throw error;
  }
};

// Ticket formunda kullanilacak urunleri getirir.
export const getAllProducts = async () => {
  try {
    const response = await publicApi.get("/products");
    return response.data;
  } catch (error) {
    console.error(error.response?.data || error.message);
    throw error;
  }
};

/** Admin catalog — tum urunler (ADMIN rolu). GET /api/admin/products */
export const getAdminProducts = async () => {
  const response = await publicApi.get("/admin/products");
  return response.data;
};

/** Admin — yeni urun. POST /api/admin/products */
export const createProduct = async (product) => {
  const response = await publicApi.post("/admin/products", product);
  return response.data;
};

/** Admin — urun guncelle. PUT /api/admin/products/{id} */
export const updateProduct = async (id, product) => {
  const response = await publicApi.put(`/admin/products/${id}`, product);
  return response.data;
};

// Ticket kaydini siler.
export const deleteTicket = async (id) => {
  try {
    await api.delete(`/${id}`);
  } catch (error) {
    console.error(error.response?.data || error.message);
    throw error;
  }
};

// Manager dashboard KPI verisini getirir.
export const getManagerDashboard = async ({ startDate, endDate } = {}) => {
  try {
    const response = await publicApi.get("/manager/dashboard", {
      params: { startDate, endDate },
    });
    return response.data;
  } catch (error) {
    console.error(error.response?.data || error.message);
    throw error;
  }
};

/**
 * Manager Reports ekrani icin historik performans raporu.
 * GET /api/manager/reports?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
export const getManagerReports = async ({ startDate, endDate } = {}) => {
  try {
    const response = await publicApi.get("/manager/reports", {
      params: { startDate, endDate },
    });
    return response.data;
  } catch (error) {
    console.error(error.response?.data || error.message);
    throw error;
  }
};

/**
 * Manager esnek ticket listesi — agent / status / priority filtresi.
 * GET /api/manager/tickets?assigneeId=3&status=IN_PROGRESS&priority=HIGH
 * Tum parametreler opsiyonel.
 */
export const getFilteredTickets = async ({ assigneeId, status, priority } = {}) => {
  try {
    const params = {};
    if (assigneeId != null) params.assigneeId = assigneeId;
    if (status) params.status = status;
    if (priority) params.priority = priority;
    const response = await publicApi.get("/manager/tickets", { params });
    return response.data;
  } catch (error) {
    console.error(error.response?.data || error.message);
    throw error;
  }
};

// Agent kapasite tablosunu getirir.
export const getAgentCapacities = async () => {
  try {
    const response = await publicApi.get("/manager/capacity");
    return response.data;
  } catch (error) {
    console.error(error.response?.data || error.message);
    throw error;
  }
};

// Agent limitini manager ekranindan gunceller.
export const updateAgentLimit = async (agentId, maxTicketLimit) => {
  try {
    const response = await publicApi.put(`/manager/agents/${agentId}/limit`, {
      maxTicketLimit,
    });
    return response.data;
  } catch (error) {
    console.error(error.response?.data || error.message);
    throw error;
  }
};

// Bir agentin tum aktif ticketlarini baska bir agente devreder.
export const transferAllTickets = async (fromAgentId, toAgentId) => {
  try {
    const response = await publicApi.post("/manager/transfer-all", {
      fromAgentId,
      toAgentId,
    });
    return response.data;
  } catch (error) {
    console.error(error.response?.data || error.message);
    throw error;
  }
};

// Tek bir ticket'i baska bir agente devreder.
export const transferTicket = async (ticketId, data) => {
  const res = await api.post(`/${ticketId}/transfer`, data);
  bumpNotifications();
  return res.data;
};

export const approveTransferTicket = async (ticketId) => {
  const res = await api.post(`/${ticketId}/transfer/approve`);
  bumpNotifications();
  return res.data;
};

export const rejectTransferTicket = async (ticketId, note) => {
  const res = await api.post(
    `/${ticketId}/transfer/reject`,
    note?.trim() ? { note: note.trim() } : {},
  );
  bumpNotifications();
  return res.data;
};
// data: { toAgentId, transferReason, transferNote? }

/** Agent transfer picker — peer workload (AGENT role). */
export const getAgentPeerCapacities = async () => {
  const response = await publicApi.get("/agent/capacities");
  return response.data;
};

// 📎 Attachment upload
export const uploadAttachment = async (ticketId, file, onUploadProgress) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post(`/${ticketId}/attachments`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress,
  });

  return response.data;
};

// 📎 Attachment listeleme
export const getAttachments = async (ticketId) => {
  const response = await api.get(`/${ticketId}/attachments`);
  return response.data;
};

// 📎 Attachment indirme
export const downloadAttachment = async (ticketId, attachmentId, fileName) => {
  const response = await api.get(`/${ticketId}/attachments/${attachmentId}`, {
    responseType: "blob",
  });

  const blob = new Blob([response.data]);
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || "dosya";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.URL.revokeObjectURL(url);
};

// 📎 Attachment silme
export const deleteAttachment = async (ticketId, attachmentId) => {
  try {
    await api.delete(`/${ticketId}/attachments/${attachmentId}`);
  } catch (error) {
    console.error(error.response?.data || error.message);
    throw error;
  }
};

export const approveTicket = async (id) => {
  const res = await api.post(`/${id}/approve`);
  bumpNotifications();
  return res.data;
};

export const rejectTicket = async (id, reason) => {
  const res = await api.post(`/${id}/reject`, { reason });
  bumpNotifications();
  return res.data;
};

export const customerCloseTicket = async (ticketId, closureReason) => {
  const res = await api.post(`/${ticketId}/customer-close`, { closureReason });
  bumpNotifications();
  return res.data;
};

export const getAgentWorklogSummary = async ({ period = "today", productId = null } = {}) => {
  const response = await publicApi.get("/agent/worklog-summary", {
    params: {
      period,
      ...(productId && productId !== "all" ? { productId } : {}),
    },
  });

  return response.data;
};

/** Download CSV report for the given date range. GET /api/manager/reports/export */
export const exportReportCsv = async (startDate, endDate) => {
  try {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await publicApi.get("/manager/reports/export", {
      params,
      responseType: "blob",
    });
    return response.data;
  } catch (error) {
    console.error("CSV export failed", error);
    throw error;
  }
};

/** Admin — kullanıcı listesi. GET /api/admin/users */
export const getAdminUsers = async () => {
  const response = await publicApi.get("/admin/users");
  return response.data;
};

/** Admin — kullanıcı güncelle. PUT /api/admin/users/{id} */
export const updateUser = async (id, data) => {
  const response = await publicApi.put(`/admin/users/${id}`, data);
  return response.data;
};

/** Admin — yeni kullanıcı oluştur (Keycloak provisionlu). POST /api/admin/users */
export const createAdminUser = async (data) => {
  const response = await publicApi.post("/admin/users", data);
  return response.data;
};

/** Admin — kullanıcıyı devre dışı bırak. DELETE /api/admin/users/{id} */
export const disableUser = async (id) => {
  const response = await publicApi.delete(`/admin/users/${id}`);
  return response.data;
};

/** Bildirim listesi — GET /api/notifications */
export const getNotifications = async () => {
  const response = await publicApi.get("/notifications");
  return response.data;
};

/** Okunmamış bildirim sayısı — GET /api/notifications/unread-count */
export const getUnreadNotificationCount = async () => {
  const response = await publicApi.get("/notifications/unread-count");
  return response.data;
};

/** Tek bildirimi okundu işaretle — PATCH /api/notifications/{id}/read */
export const markNotificationRead = async (id) => {
  await publicApi.patch(`/notifications/${id}/read`);
};

/** Tümünü okundu — PATCH /api/notifications/read-all */
export const markAllNotificationsRead = async () => {
  await publicApi.patch("/notifications/read-all");
};

/** Admin Overview için aktif ticket sayısı. GET /api/admin/overview/tickets */
export const getActiveTicketCount = async () => {
  const response = await publicApi.get("/admin/overview/tickets");
  return response.data;
};

/** Aktif ürünler — ticket formu / ekip ataması. GET /api/products */
export const getActiveProducts = getAllProducts;

/** Ekip yönetimi — GET /api/teams */
export const getTeams = async () => {
  const response = await publicApi.get("/teams");
  return response.data;
};

export const getTeamById = async (id) => {
  const response = await publicApi.get(`/teams/${id}`);
  return response.data;
};

export const createTeam = async (data) => {
  const response = await publicApi.post("/teams", data);
  return response.data;
};

export const updateTeam = async (id, data) => {
  const response = await publicApi.put(`/teams/${id}`, data);
  return response.data;
};

export const deleteTeam = async (id) => {
  await publicApi.delete(`/teams/${id}`);
};

export const addTeamMember = async (teamId, userId) => {
  const response = await publicApi.post(`/teams/${teamId}/members`, { userId });
  return response.data;
};

export const removeTeamMember = async (teamId, userId) => {
  const response = await publicApi.delete(`/teams/${teamId}/members/${userId}`);
  return response.data;
};

export const addTeamProduct = async (teamId, productId) => {
  const response = await publicApi.post(`/teams/${teamId}/products`, { productId });
  return response.data;
};

export const removeTeamProduct = async (teamId, productId) => {
  const response = await publicApi.delete(`/teams/${teamId}/products/${productId}`);
  return response.data;
};
