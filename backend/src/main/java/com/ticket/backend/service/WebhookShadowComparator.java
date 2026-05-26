package com.ticket.backend.service;

import com.ticket.backend.dto.webhook.AssignedPayload;
import com.ticket.backend.dto.webhook.SlaUpdatedPayload;
import com.ticket.backend.dto.webhook.StatusChangedPayload;
import com.ticket.backend.entity.Ticket;
import com.ticket.backend.enums.ClosureReason;
import com.ticket.backend.enums.Priority;
import com.ticket.backend.enums.Status;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class WebhookShadowComparator {

    private static final Logger log = LoggerFactory.getLogger(WebhookShadowComparator.class);

    public void logDrift(Long ticketId, String field, Object dbValue, Object webhookValue) {
        if (valuesEqual(dbValue, webhookValue)) {
            log.debug("SHADOW_OK ticketId={} field={} value={}", ticketId, field, webhookValue);
        } else {
            log.warn("SHADOW_DRIFT ticketId={} field={} db={} webhook={}", ticketId, field, dbValue, webhookValue);
        }
    }

    public void compareStatusChanged(Ticket ticket, StatusChangedPayload payload) {
        Long ticketId = ticket.getId();
        logDrift(ticketId, "status", ticket.getStatus(), parseStatusName(payload.getNewStatus()));
        logDrift(ticketId, "closedAt", ticket.getClosedAt(), parseDateTime(payload.getClosedAt()));
        logDrift(ticketId, "closureReason", ticket.getClosureReason(), parseClosureReason(payload.getClosureReason()));
        logDrift(ticketId, "customerRejectionNote", ticket.getCustomerRejectionNote(), payload.getCustomerRejectionNote());
    }

    public void compareSlaUpdated(Ticket ticket, SlaUpdatedPayload payload) {
        Long ticketId = ticket.getId();
        logDrift(ticketId, "priority", ticket.getPriority(), parsePriorityName(payload.getPriority()));
        logDrift(ticketId, "slaDueDate", ticket.getSlaDueDate(), parseDateTime(payload.getSlaDueDate()));
        logDrift(ticketId, "totalPausedDurationMs", ticket.getTotalPausedDurationMs(), payload.getTotalPausedDurationMs());
    }

    public void compareAssigned(Ticket ticket, AssignedPayload payload) {
        Long ticketId = ticket.getId();
        logDrift(ticketId, "assigneeId", ticket.getAssigneeId(), payload.getNewAssigneeId());
        logDrift(ticketId, "status", ticket.getStatus(), parseStatusName(payload.getNewStatus()));
    }

    public void compareTotalPausedDuration(Ticket ticket, Long totalPausedDurationMs) {
        logDrift(ticket.getId(), "totalPausedDurationMs", ticket.getTotalPausedDurationMs(), totalPausedDurationMs);
    }

    private static boolean valuesEqual(Object dbValue, Object webhookValue) {
        Object left = normalize(dbValue);
        Object right = normalize(webhookValue);
        return Objects.equals(left, right);
    }

    private static Object normalize(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Enum<?> e) {
            return e.name();
        }
        if (value instanceof LocalDateTime ldt) {
            return ldt.atZone(ZoneId.systemDefault()).toInstant().toString();
        }
        if (value instanceof Instant instant) {
            return instant.toString();
        }
        if (value instanceof String s) {
            return s.isBlank() ? null : s.trim();
        }
        return value;
    }

    private static Status parseStatusName(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return Status.valueOf(value.trim());
    }

    private static Priority parsePriorityName(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return Priority.valueOf(value.trim());
    }

    private static ClosureReason parseClosureReason(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
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
