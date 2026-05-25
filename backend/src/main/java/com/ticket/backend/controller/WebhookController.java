package com.ticket.backend.controller;

import com.ticket.backend.service.NotificationService;
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

    @PostMapping("/jbpm/sla-breach")
    public ResponseEntity<Void> handleSlaBreach(@RequestBody Map<String, Object> body) {
        Long ticketId = Long.valueOf(body.get("ticketId").toString());
        notificationService.notifySlaBreached(ticketId);
        return ResponseEntity.ok().build();
    }
}
