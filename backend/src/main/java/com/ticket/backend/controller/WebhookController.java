package com.ticket.backend.controller;

import com.ticket.backend.service.NotificationService;
import com.ticket.backend.service.TicketService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
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
    private final TicketService ticketService;

    @PostMapping("/jbpm/sla-breach")
    public ResponseEntity<Void> handleSlaBreach(@RequestBody Map<String, Object> body) {
        Long ticketId = Long.valueOf(body.get("ticketId").toString());
        notificationService.notifySlaBreached(ticketId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/jbpm/paused-duration")
    public ResponseEntity<Void> handlePausedDuration(@RequestBody PausedDurationRequest request) {
        ticketService.updateTotalPausedDuration(request.ticketId(), request.totalPausedDurationMs());
        return ResponseEntity.ok().build();
    }

    public record PausedDurationRequest(Long ticketId, Long totalPausedDurationMs) {}
}
