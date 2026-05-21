/** Manager UI entry for shared API — re-exports from app services. */
export {
  assignTicketToMe,
  getAgentCapacities,
  getAllTickets,
  getFilteredTickets,
  getManagerDashboard,
  getManagerReports,
  getTicketById,
  transferAllTickets,
  updateAgentLimit,
  updateTicket,
  addComment,
  getAttachments,
  downloadAttachment,
  deleteAttachment,
  uploadAttachment,
  exportReportCsv
} from "../../../../services/api";
