package com.ticket.backend.service;

import com.ticket.backend.dto.webhook.AssignedPayload;
import com.ticket.backend.dto.webhook.SlaUpdatedPayload;
import com.ticket.backend.dto.webhook.StatusChangedPayload;
import com.ticket.backend.entity.Ticket;
import com.ticket.backend.enums.ClosureReason;
import com.ticket.backend.enums.Priority;
import com.ticket.backend.enums.Status;
import com.ticket.backend.repository.TicketRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@RequiredArgsConstructor
public class TicketProjectionService {

    private static final Logger log = LoggerFactory.getLogger(TicketProjectionService.class);

    private final TicketRepository ticketRepository;
    private final TicketService ticketService;
    private final NotificationService notificationService;

    @Transactional
    public boolean applyStatusChanged(Long ticketId, StatusChangedPayload payload, Instant occurredAt) {
        Ticket ticket = loadTicket(ticketId);
        if (isStale(ticket, occurredAt, "status-changed")) {
            return false;
        }

        Status previousStatus = ticket.getStatus();
        Status newStatus = parseStatus(payload.getNewStatus(), ticket.getStatus());
        ticket.setStatus(newStatus);

        if (newStatus == Status.RESOLVED || newStatus == Status.CLOSED) {
            ticket.setClosedAt(parseDateTime(payload.getClosedAt()));
        } else {
            ticket.setClosedAt(null);
        }

        if (newStatus == Status.CLOSED && payload.getClosureReason() != null) {
            ticket.setClosureReason(parseClosureReason(payload.getClosureReason()));
        } else if (newStatus != Status.CLOSED) {
            ticket.setClosureReason(null);
        }

        if (newStatus == Status.RESOLVED && previousStatus != Status.RESOLVED) {
            ticket.setCustomerRejectionNote(null);
        }
        if (previousStatus == Status.RESOLVED && newStatus == Status.IN_PROGRESS) {
            String note = payload.getCustomerRejectionNote();
            if (note != null && !note.isBlank()) {
                ticket.setCustomerRejectionNote(note.trim());
            }
        }

        Ticket saved = ticketRepository.save(ticket);
        Ticket timelineRequest = new Ticket();
        timelineRequest.setCustomerRejectionNote(saved.getCustomerRejectionNote());
        ticketService.appendStatusTimelineCommentsIfNeeded(saved, previousStatus, timelineRequest);

        Status statusAfter = saved.getStatus();
        if (!Objects.equals(previousStatus, statusAfter)) {
            runAfterCommit(() -> dispatchStatusNotifications(saved.getId(), previousStatus, statusAfter, null));
        }
        return true;
    }

    @Transactional
    public boolean applySlaUpdated(Long ticketId, SlaUpdatedPayload payload, Instant occurredAt) {
        Ticket ticket = loadTicket(ticketId);
        if (isStale(ticket, occurredAt, "sla-updated")) {
            return false;
        }

        if (payload.getPriority() != null) {
            ticket.setPriority(parsePriority(payload.getPriority(), ticket.getPriority()));
        }
        LocalDateTime slaDue = parseDateTime(payload.getSlaDueDate());
        if (slaDue != null) {
            ticket.setSlaDueDate(slaDue);
        }
        if (payload.getTotalPausedDurationMs() != null) {
            ticket.setTotalPausedDurationMs(payload.getTotalPausedDurationMs());
        }

        ticketRepository.save(ticket);
        return true;
    }

    @Transactional
    public boolean applyAssigned(Long ticketId, AssignedPayload payload, Instant occurredAt) {
        Ticket ticket = loadTicket(ticketId);
        if (isStale(ticket, occurredAt, "assigned")) {
            return false;
        }

        Long previousAssigneeId = ticket.getAssigneeId();
        Status previousStatus = ticket.getStatus();
        Priority previousPriority = ticket.getPriority();

        ticket.setAssigneeId(payload.getNewAssigneeId());
        Status newStatus = parseStatus(payload.getNewStatus(), ticket.getStatus());
        if (newStatus != null) {
            ticket.setStatus(newStatus);
        }

        Ticket saved = ticketRepository.save(ticket);
        Ticket timelineRequest = new Ticket();
        ticketService.appendStatusTimelineCommentsIfNeeded(saved, previousStatus, timelineRequest);
        ticketService.appendPriorityAndAssigneeTimelineIfNeeded(
                saved, previousPriority, previousAssigneeId, timelineRequest);

        Long actorId = payload.getAssignedByUserId();
        Long newAssigneeId = saved.getAssigneeId();
        Status statusAfter = saved.getStatus();

        if (!Objects.equals(previousAssigneeId, newAssigneeId) && newAssigneeId != null) {
            String title = saved.getTitle();
            runAfterCommit(() -> notificationService.notifyTicketAssigned(saved.getId(), newAssigneeId, actorId, title));
        }
        if (!Objects.equals(previousStatus, statusAfter)) {
            runAfterCommit(() -> dispatchStatusNotifications(saved.getId(), previousStatus, statusAfter, actorId));
        }
        return true;
    }

    @Transactional
    public void applyTotalPausedDuration(Long ticketId, Long totalPausedDurationMs) {
        Ticket ticket = loadTicket(ticketId);
        ticket.setTotalPausedDurationMs(totalPausedDurationMs);
        ticketRepository.save(ticket);
    }

    private Ticket loadTicket(Long ticketId) {
        return ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found with id: " + ticketId));
    }

    private boolean isStale(Ticket ticket, Instant occurredAt, String eventType) {
        if (occurredAt == null || ticket.getUpdatedAt() == null) {
            return false;
        }
        LocalDateTime occurred = LocalDateTime.ofInstant(occurredAt, ZoneId.systemDefault());
        if (ticket.getUpdatedAt().isAfter(occurred)) {
            log.warn(
                    "Stale webhook projection ignored for ticket {} ({}): updatedAt={} occurredAt={}",
                    ticket.getId(),
                    eventType,
                    ticket.getUpdatedAt(),
                    occurredAt);
            return true;
        }
        return false;
    }

    private void dispatchStatusNotifications(Long ticketId, Status previousStatus, Status currentStatus, Long actorId) {
        if (currentStatus == Status.CLOSED) {
            notificationService.notifyTicketClosed(ticketId, actorId);
        } else {
            notificationService.notifyStatusChanged(ticketId, previousStatus, currentStatus, actorId);
        }
    }

    private void runAfterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }

    private static Status parseStatus(String value, Status fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return Status.valueOf(value.trim());
    }

    private static Priority parsePriority(String value, Priority fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return Priority.valueOf(value.trim());
    }

    private static ClosureReason parseClosureReason(String value) {
        return ClosureReason.valueOf(value.trim());
    }

    private static LocalDateTime parseDateTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.ofInstant(Instant.parse(value), ZoneId.systemDefault());
        } catch (DateTimeParseException ignored) {
            return LocalDateTime.parse(value);
        }
    }
}
