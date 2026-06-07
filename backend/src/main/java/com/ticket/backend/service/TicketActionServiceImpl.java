package com.ticket.backend.service;

import com.ticket.backend.dto.AssignTicketRequest;
import com.ticket.backend.dto.TicketRejectRequest;
import com.ticket.backend.dto.action.ActionAcceptedResponse;
import com.ticket.backend.dto.action.ActionPollConfig;
import com.ticket.backend.dto.action.AssignActionRequest;
import com.ticket.backend.dto.action.ChangePriorityActionRequest;
import com.ticket.backend.dto.action.CloseActionRequest;
import com.ticket.backend.dto.action.RejectActionRequest;
import com.ticket.backend.dto.action.ResolveActionRequest;
import com.ticket.backend.entity.Ticket;
import com.ticket.backend.enums.ClosureReason;
import com.ticket.backend.enums.Priority;
import com.ticket.backend.enums.Status;
import com.ticket.backend.exception.TicketActionConflictException;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TicketActionServiceImpl implements TicketActionService {

    private static final Set<ClosureReason> FORCE_CLOSE_REASONS =
            Set.of(ClosureReason.INVALID, ClosureReason.DUPLICATE, ClosureReason.NO_RESPONSE);

    private final TicketService ticketService;
    private final AppUserService appUserService;
    private final JbpmService jbpmService;

    @Value("${destrova.workflow.poll.recommended-interval-ms:500}")
    private int pollRecommendedIntervalMs;

    @Value("${destrova.workflow.poll.max-attempts:20}")
    private int pollMaxAttempts;

    @Value("${destrova.workflow.poll.timeout-ms:10000}")
    private int pollTimeoutMs;

    @Override
    public ActionAcceptedResponse assign(Long ticketId, AssignActionRequest request, Authentication authentication) {
        Ticket ticket = ticketService.requireTicket(ticketId);
        Long assigneeId = request != null ? request.getAssigneeId() : null;
        ticketService.validateAgentAssignRules(ticket, assigneeId, authentication);

        Long actorId = appUserService.requireUserId(authentication);
        Map<String, Object> variables = new HashMap<>();
        variables.put("assigneeId", assigneeId);
        variables.put("assignedByUserId", actorId);
        signal(ticketId, "ASSIGNED", variables);

        Map<String, Object> projection = new LinkedHashMap<>();
        projection.put("status", Status.IN_PROGRESS.name());
        projection.put("assigneeId", assigneeId);
        return accepted(ticketId, "assign", projection);
    }

    @Override
    public ActionAcceptedResponse unassign(Long ticketId, Authentication authentication) {
        ticketService.requireTicket(ticketId);
        Long actorId = appUserService.requireUserId(authentication);
        Map<String, Object> variables = new HashMap<>();
        variables.put("assigneeId", null);
        variables.put("assignedByUserId", actorId);
        signal(ticketId, "ASSIGNED", variables);
        Map<String, Object> projection = new LinkedHashMap<>();
        projection.put("assigneeId", null);
        return accepted(ticketId, "unassign", projection);
    }

    @Override
    public ActionAcceptedResponse waitForCustomer(Long ticketId, Authentication authentication) {
        Ticket ticket = ticketService.requireTicket(ticketId);
        if (ticketService.isAgentOnly(authentication)) {
            ticketService.assertAssigneeAgent(
                    ticket, authentication, "Sadece uzerinize atanmis ticket uzerinde islem yapabilirsiniz.");
        }
        signal(ticketId, "WAITING_FOR_CUSTOMER", Map.of());
        return accepted(ticketId, "wait-for-customer", Map.of("status", Status.WAITING_FOR_CUSTOMER.name()));
    }

    @Override
    public ActionAcceptedResponse resume(Long ticketId, Authentication authentication) {
        Ticket ticket = ticketService.requireTicket(ticketId);
        if (ticketService.isAgentOnly(authentication)) {
            ticketService.assertAssigneeAgent(
                    ticket, authentication, "Sadece uzerinize atanmis ticket uzerinde islem yapabilirsiniz.");
        }
        signal(ticketId, "RESUMED", Map.of());
        return accepted(ticketId, "resume", Map.of("status", Status.IN_PROGRESS.name()));
    }

    @Override
    public ActionAcceptedResponse resolve(
            Long ticketId, ResolveActionRequest request, Authentication authentication) {
        Ticket ticket = ticketService.requireTicket(ticketId);
        if (ticketService.isAgentOnly(authentication)) {
            ticketService.assertAssigneeAgent(
                    ticket, authentication, "Sadece uzerinize atanmis ticket uzerinde islem yapabilirsiniz.");
        }
        String note = request != null && request.getResolutionNote() != null
                ? request.getResolutionNote().trim()
                : "";
        ticketService.saveResolutionNote(ticketId, note, authentication);
        signal(ticketId, "RESOLVED", Map.of());
        return accepted(ticketId, "resolve", Map.of("status", Status.RESOLVED.name()));
    }

    @Override
    public ActionAcceptedResponse close(Long ticketId, CloseActionRequest request, Authentication authentication) {
        Ticket ticket = ticketService.requireTicket(ticketId);
        ClosureReason reason = request != null ? request.getClosureReason() : null;
        if (reason == null) {
            throw new IllegalStateException("Ticket kapatilirken kapanis nedeni zorunludur.");
        }
        if (reason == ClosureReason.CUSTOMER_APPROVED) {
            throw new IllegalStateException("CUSTOMER_APPROVED is only valid for approve action.");
        }
        if (reason == ClosureReason.SOLVED) {
            throw new IllegalStateException("SOLVED is not a force-close reason. Use resolve or customer-close.");
        }
        if (!FORCE_CLOSE_REASONS.contains(reason)) {
            throw new IllegalStateException("Invalid closure reason for force-close: " + reason);
        }
        if (ticket.getStatus() == Status.CLOSED) {
            throw new TicketActionConflictException("Ticket is already closed.");
        }
        if (ticketService.isAgentOnly(authentication)) {
            ticketService.assertAssigneeAgent(
                    ticket, authentication, "Sadece uzerinize atanmis ticket'i kapatabilirsiniz.");
        }
        signal(ticketId, "FORCE_CLOSED", Map.of("closureReason", reason.name()));
        Map<String, Object> projection = new LinkedHashMap<>();
        projection.put("status", Status.CLOSED.name());
        projection.put("closureReason", reason.name());
        return accepted(ticketId, "close", projection);
    }

    @Override
    public ActionAcceptedResponse changePriority(
            Long ticketId, ChangePriorityActionRequest request, Authentication authentication) {
        Ticket ticket = ticketService.requireTicket(ticketId);
        if (ticketService.isAgentOnly(authentication)) {
            ticketService.assertAssigneeAgent(
                    ticket, authentication, "Sadece uzerinize atanmis ticket uzerinde islem yapabilirsiniz.");
        }
        Priority priority = request != null ? request.getPriority() : null;
        if (priority == null) {
            throw new IllegalStateException("Priority is required.");
        }
        if (ticket.getStatus() == Status.RESOLVED || ticket.getStatus() == Status.CLOSED) {
            throw new TicketActionConflictException("Cannot change priority on resolved or closed tickets.");
        }
        signal(ticketId, "PRIORITY_UPDATED", Map.of("priority", priority.name()));
        return accepted(ticketId, "change-priority", Map.of("priority", priority.name()));
    }

    @Override
    public ActionAcceptedResponse approve(Long ticketId, Authentication authentication) {
        Ticket ticket = ticketService.requireTicket(ticketId);
        Long userId = appUserService.requireUserId(authentication);
        if (!ticket.getCreatorId().equals(userId)) {
            throw new AccessDeniedException("This request does not belong to you.");
        }
        if (ticket.getStatus() != Status.RESOLVED) {
            throw new TicketActionConflictException("Ticket is not awaiting approval.");
        }
        signal(ticketId, "CUSTOMER_APPROVED", Map.of());
        Map<String, Object> projection = new LinkedHashMap<>();
        projection.put("status", Status.CLOSED.name());
        projection.put("closureReason", ClosureReason.CUSTOMER_APPROVED.name());
        return accepted(ticketId, "approve", projection);
    }

    @Override
    public ActionAcceptedResponse reject(Long ticketId, RejectActionRequest request, Authentication authentication) {
        Ticket ticket = ticketService.requireTicket(ticketId);
        Long userId = appUserService.requireUserId(authentication);
        if (!ticket.getCreatorId().equals(userId)) {
            throw new AccessDeniedException("Bu talep size ait degil.");
        }
        if (ticket.getStatus() != Status.RESOLVED) {
            throw new TicketActionConflictException("Ticket is not awaiting approval.");
        }
        String reason = request != null && request.getReason() != null ? request.getReason().trim() : "";
        if (reason.isEmpty()) {
            throw new IllegalStateException("Reason is required.");
        }
        ticketService.recordCustomerRejectionComment(ticketId, reason, authentication);
        signal(ticketId, "CUSTOMER_REJECTED", Map.of("customerRejectionNote", reason));
        return accepted(ticketId, "reject", Map.of("status", Status.IN_PROGRESS.name()));
    }

    @Override
    public ActionAcceptedResponse assignToMe(Long ticketId, Authentication authentication) {
        Long userId = appUserService.requireUserId(authentication);
        AssignActionRequest selfAssign = new AssignActionRequest();
        selfAssign.setAssigneeId(userId);
        return assign(ticketId, selfAssign, authentication);
    }

    @Override
    public Ticket assignTicket(Long ticketId, AssignTicketRequest request, Authentication authentication) {
        return ticketService.assignTicket(ticketId, request, authentication);
    }

    @Override
    public Ticket approveTicket(Long ticketId, Authentication authentication) {
        return ticketService.approveResolution(ticketId, authentication);
    }

    @Override
    public Ticket rejectTicket(Long ticketId, TicketRejectRequest request, Authentication authentication) {
        return ticketService.rejectResolution(ticketId, request, authentication);
    }

    private void signal(Long ticketId, String signalName, Map<String, Object> variables) {
        jbpmService.signalProcessSync(ticketId, signalName, variables);
    }

    private ActionAcceptedResponse accepted(Long ticketId, String action, Map<String, Object> expectedProjection) {
        return ActionAcceptedResponse.builder()
                .commandId("cmd-" + UUID.randomUUID())
                .ticketId(ticketId)
                .action(action)
                .status("ACCEPTED")
                .poll(ActionPollConfig.builder()
                        .recommendedIntervalMs(pollRecommendedIntervalMs)
                        .maxAttempts(pollMaxAttempts)
                        .timeoutMs(pollTimeoutMs)
                        .build())
                .expectedProjection(expectedProjection)
                .build();
    }
}
