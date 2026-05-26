package com.ticket.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ticket.backend.dto.webhook.AssignedPayload;
import com.ticket.backend.dto.webhook.JbpmWebhookEnvelope;
import com.ticket.backend.dto.webhook.PausedDurationPayload;
import com.ticket.backend.dto.webhook.SlaUpdatedPayload;
import com.ticket.backend.dto.webhook.StatusChangedPayload;
import com.ticket.backend.dto.webhook.WebhookResponse;
import com.ticket.backend.entity.Ticket;
import com.ticket.backend.repository.TicketRepository;
import com.ticket.backend.service.NotificationService;
import com.ticket.backend.service.TicketProjectionService;
import com.ticket.backend.service.WebhookEventService;
import com.ticket.backend.service.WebhookShadowComparator;
import jakarta.persistence.EntityNotFoundException;
import java.time.Instant;
import java.util.function.Supplier;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/webhook")
@RequiredArgsConstructor
public class WebhookController {

    private final NotificationService notificationService;
    private final TicketProjectionService ticketProjectionService;
    private final WebhookEventService webhookEventService;
    private final WebhookShadowComparator webhookShadowComparator;
    private final TicketRepository ticketRepository;
    private final ObjectMapper objectMapper;

    @Value("${destrova.workflow.shadow-projection}")
    private boolean shadowProjection;

    @PostMapping("/jbpm/status-changed")
    public ResponseEntity<WebhookResponse> handleStatusChanged(
            @RequestBody JbpmWebhookEnvelope<StatusChangedPayload> envelope) {
        return processEvent(
                envelope.getEventId(),
                envelope.getTicketId(),
                envelope.getEventType(),
                "status-changed",
                () -> {
                    Ticket ticket = loadTicketForShadow(envelope.getTicketId());
                    webhookShadowComparator.compareStatusChanged(ticket, envelope.getPayload());
                },
                () -> ticketProjectionService.applyStatusChanged(
                        envelope.getTicketId(), envelope.getPayload(), envelope.getOccurredAt()));
    }

    @PostMapping("/jbpm/sla-updated")
    public ResponseEntity<WebhookResponse> handleSlaUpdated(
            @RequestBody JbpmWebhookEnvelope<SlaUpdatedPayload> envelope) {
        return processEvent(
                envelope.getEventId(),
                envelope.getTicketId(),
                envelope.getEventType(),
                "sla-updated",
                () -> {
                    Ticket ticket = loadTicketForShadow(envelope.getTicketId());
                    webhookShadowComparator.compareSlaUpdated(ticket, envelope.getPayload());
                },
                () -> ticketProjectionService.applySlaUpdated(
                        envelope.getTicketId(), envelope.getPayload(), envelope.getOccurredAt()));
    }

    @PostMapping("/jbpm/assigned")
    public ResponseEntity<WebhookResponse> handleAssigned(
            @RequestBody JbpmWebhookEnvelope<AssignedPayload> envelope) {
        return processEvent(
                envelope.getEventId(),
                envelope.getTicketId(),
                envelope.getEventType(),
                "assigned",
                () -> {
                    Ticket ticket = loadTicketForShadow(envelope.getTicketId());
                    webhookShadowComparator.compareAssigned(ticket, envelope.getPayload());
                },
                () -> ticketProjectionService.applyAssigned(
                        envelope.getTicketId(), envelope.getPayload(), envelope.getOccurredAt()));
    }

    @PostMapping("/jbpm/paused-duration")
    public ResponseEntity<WebhookResponse> handlePausedDuration(@RequestBody JsonNode body) {
        if (isEnvelopeBody(body)) {
            JbpmWebhookEnvelope<PausedDurationPayload> envelope =
                    objectMapper.convertValue(body, objectMapper.getTypeFactory().constructParametricType(
                            JbpmWebhookEnvelope.class, PausedDurationPayload.class));
            Long totalMs = envelope.getPayload() != null ? envelope.getPayload().getTotalPausedDurationMs() : null;
            return processEvent(
                    envelope.getEventId(),
                    envelope.getTicketId(),
                    envelope.getEventType(),
                    "paused-duration",
                    () -> {
                        Ticket ticket = loadTicketForShadow(envelope.getTicketId());
                        webhookShadowComparator.compareTotalPausedDuration(ticket, totalMs);
                    },
                    () -> {
                        ticketProjectionService.applyTotalPausedDuration(envelope.getTicketId(), totalMs);
                        return true;
                    });
        }

        PausedDurationRequest legacy = objectMapper.convertValue(body, PausedDurationRequest.class);
        if (shadowProjection) {
            Ticket ticket = loadTicketForShadow(legacy.ticketId());
            webhookShadowComparator.compareTotalPausedDuration(ticket, legacy.totalPausedDurationMs());
        } else {
            ticketProjectionService.applyTotalPausedDuration(legacy.ticketId(), legacy.totalPausedDurationMs());
        }
        return ResponseEntity.ok(WebhookResponse.accepted(legacy.ticketId(), Instant.now()));
    }

    @PostMapping("/jbpm/sla-breach")
    public ResponseEntity<WebhookResponse> handleSlaBreach(@RequestBody JsonNode body) {
        if (isEnvelopeBody(body)) {
            JbpmWebhookEnvelope<JsonNode> envelope =
                    objectMapper.convertValue(body, objectMapper.getTypeFactory().constructParametricType(
                            JbpmWebhookEnvelope.class, JsonNode.class));
            return processEvent(
                    envelope.getEventId(),
                    envelope.getTicketId(),
                    envelope.getEventType(),
                    "sla-breach",
                    () -> loadTicketForShadow(envelope.getTicketId()),
                    () -> {
                        notificationService.notifySlaBreached(envelope.getTicketId());
                        return true;
                    });
        }

        Long ticketId = body.has("ticketId") ? body.get("ticketId").asLong() : null;
        if (ticketId == null) {
            return ResponseEntity.badRequest()
                    .body(WebhookResponse.rejected(null, "ticketId is required"));
        }
        if (shadowProjection) {
            loadTicketForShadow(ticketId);
        } else {
            notificationService.notifySlaBreached(ticketId);
        }
        return ResponseEntity.ok(WebhookResponse.accepted(ticketId, Instant.now()));
    }

    private ResponseEntity<WebhookResponse> processEvent(
            String eventId,
            Long ticketId,
            String envelopeEventType,
            String defaultEventType,
            Runnable shadowAction,
            Supplier<Boolean> applyAction) {
        if (ticketId == null) {
            return ResponseEntity.badRequest()
                    .body(WebhookResponse.rejected(null, "ticketId is required"));
        }

        if (webhookEventService.isDuplicate(eventId)) {
            return ResponseEntity.ok(WebhookResponse.duplicate(ticketId));
        }

        if (shadowProjection) {
            shadowAction.run();
        } else {
            applyAction.get();
        }

        String eventType = envelopeEventType != null ? envelopeEventType : defaultEventType;
        webhookEventService.markProcessed(eventId, ticketId, eventType);
        return ResponseEntity.ok(WebhookResponse.accepted(ticketId, Instant.now()));
    }

    private Ticket loadTicketForShadow(Long ticketId) {
        return ticketRepository
                .findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found with id: " + ticketId));
    }

    private static boolean isEnvelopeBody(JsonNode body) {
        return body != null && (body.has("eventId") || body.has("eventType"));
    }

    public record PausedDurationRequest(Long ticketId, Long totalPausedDurationMs) {}
}
