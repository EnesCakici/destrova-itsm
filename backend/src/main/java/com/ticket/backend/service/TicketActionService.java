package com.ticket.backend.service;

import com.ticket.backend.dto.AssignTicketRequest;
import com.ticket.backend.dto.TicketRejectRequest;
import com.ticket.backend.dto.action.ActionAcceptedResponse;
import com.ticket.backend.dto.action.AssignActionRequest;
import com.ticket.backend.dto.action.ChangePriorityActionRequest;
import com.ticket.backend.dto.action.CloseActionRequest;
import com.ticket.backend.dto.action.RejectActionRequest;
import com.ticket.backend.dto.action.ResolveActionRequest;
import com.ticket.backend.entity.Ticket;
import org.springframework.security.core.Authentication;

/**
 * Ticket workflow actions (Faz 1). Action endpoints return {@link ActionAcceptedResponse} (202);
 * legacy assign/approve/reject on {@link com.ticket.backend.controller.TicketController} delegate here until fully migrated.
 */
public interface TicketActionService {

    ActionAcceptedResponse assign(Long ticketId, AssignActionRequest request, Authentication authentication);

    ActionAcceptedResponse unassign(Long ticketId, Authentication authentication);

    ActionAcceptedResponse waitForCustomer(Long ticketId, Authentication authentication);

    ActionAcceptedResponse resume(Long ticketId, Authentication authentication);

    ActionAcceptedResponse resolve(Long ticketId, ResolveActionRequest request, Authentication authentication);

    ActionAcceptedResponse close(Long ticketId, CloseActionRequest request, Authentication authentication);

    ActionAcceptedResponse changePriority(
            Long ticketId, ChangePriorityActionRequest request, Authentication authentication);

    ActionAcceptedResponse approve(Long ticketId, Authentication authentication);

    ActionAcceptedResponse reject(Long ticketId, RejectActionRequest request, Authentication authentication);

    ActionAcceptedResponse assignToMe(Long ticketId, Authentication authentication);

    /** Legacy {@code POST /api/tickets/{id}/assign} — delegates to {@link TicketService} until Faz 1.2 jBPM-only path. */
    Ticket assignTicket(Long ticketId, AssignTicketRequest request, Authentication authentication);

    /** Legacy {@code POST /api/tickets/{id}/approve}. */
    Ticket approveTicket(Long ticketId, Authentication authentication);

    /** Legacy {@code POST /api/tickets/{id}/reject}. */
    Ticket rejectTicket(Long ticketId, TicketRejectRequest request, Authentication authentication);
}
