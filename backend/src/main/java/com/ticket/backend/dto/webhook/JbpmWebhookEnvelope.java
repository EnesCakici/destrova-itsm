package com.ticket.backend.dto.webhook;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * jBPM webhook envelope (BPMN script task JSON). {@code payload} is typed per endpoint
 * ({@link StatusChangedPayload}, {@link SlaUpdatedPayload}, {@link AssignedPayload}).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class JbpmWebhookEnvelope<T> {

    private String eventId;
    private String eventType;
    private Instant occurredAt;
    private Long ticketId;
    private Long processInstanceId;
    private String correlationKey;
    private String processId;
    private String containerId;
    private JbpmTriggeredByDto triggeredBy;
    private T payload;
}
