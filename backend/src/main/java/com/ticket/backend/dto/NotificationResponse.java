package com.ticket.backend.dto;

import com.ticket.backend.enums.NotificationType;
import java.time.Instant;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class NotificationResponse {
    Long id;
    Long userId;
    Long relatedTicketId;
    String message;
    NotificationType type;
    boolean read;
    Instant createdAt;
}
