package com.ticket.backend.dto;

import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AgentWorklogActivityDto {
    private String id;
    private String type; // reply, internal, worklog
    private LocalDateTime occurredAt;
    private String timeLabel;

    private Long ticketId;
    private String ticketCode;
    private String ticketTitle;
    private String productName;

    private String title;
    private String context;
    private Integer durationMinutes;
}