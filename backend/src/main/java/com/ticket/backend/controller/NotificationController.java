package com.ticket.backend.controller;

import com.ticket.backend.dto.NotificationResponse;
import com.ticket.backend.entity.Notification;
import com.ticket.backend.service.AppUserService;
import com.ticket.backend.service.NotificationService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final AppUserService appUserService;

    @GetMapping
    public List<NotificationResponse> list(Authentication authentication) {
        Long uid = appUserService.requireUserId(authentication);
        return notificationService.listForUser(uid).stream().map(this::toResponse).toList();
    }

    @GetMapping("/unread-count")
    public long unreadCount(Authentication authentication) {
        return notificationService.countUnread(appUserService.requireUserId(authentication));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long id, Authentication authentication) {
        Long uid = appUserService.requireUserId(authentication);
        boolean ok = notificationService.markRead(id, uid);
        if (!ok) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllRead(Authentication authentication) {
        notificationService.markAllRead(appUserService.requireUserId(authentication));
        return ResponseEntity.noContent().build();
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .userId(n.getUserId())
                .relatedTicketId(n.getRelatedTicketId())
                .message(n.getMessage())
                .type(n.getType())
                .read(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
