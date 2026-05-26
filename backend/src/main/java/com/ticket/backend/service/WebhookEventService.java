package com.ticket.backend.service;

import com.ticket.backend.entity.WebhookProcessedEvent;
import com.ticket.backend.repository.WebhookEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WebhookEventService {

    private final WebhookEventRepository webhookEventRepository;

    public boolean isDuplicate(String eventId) {
        return eventId != null && !eventId.isBlank() && webhookEventRepository.existsById(eventId);
    }

    @Transactional
    public void markProcessed(String eventId, Long ticketId, String eventType) {
        if (eventId == null || eventId.isBlank() || ticketId == null || eventType == null) {
            return;
        }
        webhookEventRepository.save(WebhookProcessedEvent.builder()
                .eventId(eventId)
                .ticketId(ticketId)
                .eventType(eventType)
                .build());
    }
}
