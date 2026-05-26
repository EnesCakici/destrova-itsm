package com.ticket.backend.dto.webhook;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class SlaUpdatedPayload {

    private String slaDueDate;
    private String slaStartedAt;
    private String priority;
    private Boolean slaPaused;
    private Long totalPausedDurationMs;
    private String remainingDurationIso;
    private String reason;
    private String previousPriority;
}
