package com.ticket.backend.dto.webhook;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class WebhookResponse {

    private boolean accepted;
    private boolean duplicate;
    private Long ticketId;
    private Instant appliedAt;
    private String error;

    public static WebhookResponse accepted(Long ticketId, Instant appliedAt) {
        return WebhookResponse.builder()
                .accepted(true)
                .duplicate(false)
                .ticketId(ticketId)
                .appliedAt(appliedAt)
                .build();
    }

    public static WebhookResponse duplicate(Long ticketId) {
        return WebhookResponse.builder()
                .accepted(true)
                .duplicate(true)
                .ticketId(ticketId)
                .build();
    }

    public static WebhookResponse rejected(Long ticketId, String error) {
        return WebhookResponse.builder()
                .accepted(false)
                .duplicate(false)
                .ticketId(ticketId)
                .error(error)
                .build();
    }
}
