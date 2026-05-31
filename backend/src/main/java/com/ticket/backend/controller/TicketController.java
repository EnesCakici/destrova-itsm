package com.ticket.backend.controller;

import com.ticket.backend.dto.AssignTicketRequest;
import com.ticket.backend.dto.CommentCreateRequest;
import com.ticket.backend.dto.WorklogCreateRequest;
import com.ticket.backend.dto.TicketRejectRequest;
import com.ticket.backend.entity.Comment;
import com.ticket.backend.entity.Ticket;
import com.ticket.backend.entity.Worklog;
import com.ticket.backend.enums.ClosureReason;
import com.ticket.backend.enums.Priority;
import com.ticket.backend.enums.Status;
import com.ticket.backend.service.TicketActionService;
import com.ticket.backend.service.TicketService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Map;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private static final Logger log = LoggerFactory.getLogger(TicketController.class);
    private static final String LEGACY_PUT_DISABLED_MESSAGE =
            "Please use /actions endpoints for workflow changes";

    private final TicketService ticketService;
    private final TicketActionService ticketActionService;

    @Value("${destrova.workflow.legacy-put-enabled:true}")
    private boolean legacyPutEnabled;

    @GetMapping
    @PreAuthorize("hasAnyRole('CUSTOMER', 'AGENT', 'MANAGER', 'ADMIN')")
    public List<Ticket> getAllTickets(Authentication authentication) {
        return ticketService.listTicketsFor(authentication);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'AGENT', 'MANAGER', 'ADMIN')")
    public Ticket getTicketById(@PathVariable Long id, Authentication authentication) {
        return ticketService.getTicketByIdForUser(id, authentication);
    }

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    @ResponseStatus(HttpStatus.CREATED)
    public Ticket createTicket(@AuthenticationPrincipal Jwt jwt, @RequestBody Ticket ticket) {
        return ticketService.createTicketForCustomer(ticket, jwt);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'AGENT', 'MANAGER', 'ADMIN')")
    public Ticket updateTicket(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication authentication) {

        validateLegacyPutWorkflowFields(id, body);

        Ticket ticketRequest = new Ticket();
        if (body.containsKey("description") && body.get("description") != null) {
            ticketRequest.setDescription(body.get("description").toString());
        }

        if (!legacyPutEnabled) {
            return ticketService.updateTicketForUser(id, ticketRequest, false, null, authentication);
        }

        // assigneeId: explicit null vs missing field ayrımı
        boolean assigneeIdProvided = body.containsKey("assigneeId");
        Long newAssigneeId = null;
        if (assigneeIdProvided) {
            Object val = body.get("assigneeId");
            if (val instanceof Integer) newAssigneeId = ((Integer) val).longValue();
            else if (val instanceof Long) newAssigneeId = (Long) val;
            // val null ise newAssigneeId null kalır → unassign
        }

        if (body.containsKey("status") && body.get("status") != null) {
            ticketRequest.setStatus(Status.valueOf(body.get("status").toString()));
        }
        if (body.containsKey("priority") && body.get("priority") != null) {
            ticketRequest.setPriority(Priority.valueOf(body.get("priority").toString()));
        }
        if (body.containsKey("closureReason") && body.get("closureReason") != null) {
            ticketRequest.setClosureReason(ClosureReason.valueOf(body.get("closureReason").toString()));
        }
        if (body.containsKey("customerRejectionNote") && body.get("customerRejectionNote") != null) {
            ticketRequest.setCustomerRejectionNote(body.get("customerRejectionNote").toString());
        }

        return ticketService.updateTicketForUser(id, ticketRequest, assigneeIdProvided, newAssigneeId, authentication);
    }

    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('AGENT', 'MANAGER', 'ADMIN')")
    public Ticket assignTicket(
            @PathVariable Long id,
            @RequestBody AssignTicketRequest request,
            Authentication authentication) {
        return ticketActionService.assignTicket(id, request, authentication);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTicket(@PathVariable Long id) {
        ticketService.deleteTicket(id);
    }

    @PostMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'AGENT', 'MANAGER', 'ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public Comment addComment(
            @PathVariable Long id,
            @RequestBody CommentCreateRequest request,
            Authentication authentication) {
        return ticketService.addCommentForUser(id, request, authentication);
    }

    @PostMapping("/{id}/worklogs")
    @PreAuthorize("hasAnyRole('AGENT', 'ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public Worklog addWorklog(
            @PathVariable Long id,
            @RequestBody WorklogCreateRequest request,
            Authentication authentication) {
        return ticketService.addWorklogForUser(id, request, authentication);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('CUSTOMER')")
    public Ticket approveTicket(
            @PathVariable Long id,
            Authentication authentication) {
        return ticketActionService.approveTicket(id, authentication);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('CUSTOMER')")
    public Ticket rejectTicket(
            @PathVariable Long id,
            @RequestBody TicketRejectRequest request,
            Authentication authentication) {
        return ticketActionService.rejectTicket(id, request, authentication);
    }

    private void validateLegacyPutWorkflowFields(Long ticketId, Map<String, Object> body) {
        boolean hasWorkflowField = body.containsKey("status")
                || body.containsKey("priority")
                || body.containsKey("assigneeId")
                || body.containsKey("closureReason")
                || body.containsKey("customerRejectionNote");

        if (!legacyPutEnabled && hasWorkflowField) {
            throw new IllegalArgumentException(LEGACY_PUT_DISABLED_MESSAGE);
        }

        if (!legacyPutEnabled) {
            return;
        }

        if (body.containsKey("status") && body.get("status") != null) {
            log.warn("deprecated PUT workflow field: status (ticketId={})", ticketId);
        }
        if (body.containsKey("priority") && body.get("priority") != null) {
            log.warn("deprecated PUT workflow field: priority (ticketId={})", ticketId);
        }
        if (body.containsKey("assigneeId")) {
            log.warn("deprecated PUT workflow field: assigneeId (ticketId={})", ticketId);
        }
        if (body.containsKey("closureReason") && body.get("closureReason") != null) {
            log.warn("deprecated PUT workflow field: closureReason (ticketId={})", ticketId);
        }
    }
}
