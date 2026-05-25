package com.ticket.backend.scheduler;

import com.ticket.backend.entity.Ticket;
import com.ticket.backend.entity.User;
import com.ticket.backend.enums.NotificationType;
import com.ticket.backend.enums.Status;
import com.ticket.backend.repository.NotificationRepository;
import com.ticket.backend.repository.TicketRepository;
import com.ticket.backend.repository.UserRepository;
import com.ticket.backend.service.NotificationService;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SlaNotificationScheduler {

    private static final Logger log = LoggerFactory.getLogger(SlaNotificationScheduler.class);

    private final TicketRepository ticketRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    //@Scheduled(fixedRate = 300_000) // 5 dakikada bir çalışır
    public void checkSlaStatuses() {
        log.debug("SLA bildirim scheduler çalışıyor...");
        List<Ticket> activeTickets = ticketRepository.findByStatusIn(
                List.of(Status.NEW, Status.IN_PROGRESS, Status.RESOLVED)
        );

        LocalDateTime now = LocalDateTime.now();

        for (Ticket ticket : activeTickets) {
            if (ticket.getSlaDueDate() == null || ticket.getCreatedAt() == null) continue;

            long totalDuration = Duration.between(ticket.getCreatedAt(), ticket.getSlaDueDate()).toMinutes();
            long elapsed = Duration.between(ticket.getCreatedAt(), now).toMinutes();
            double progress = (double) elapsed / totalDuration;

            // SLA ihlali: süre dolmuş
            if (now.isAfter(ticket.getSlaDueDate())) {
                notifySlaBreached(ticket);
            }
            // SLA riski: %80 dolmuş
            else if (progress >= 0.8 && progress < 1.0) {
                notifySlaWarning(ticket);
            }
        }
        log.debug("SLA bildirim scheduler tamamlandı.");
    }

    private void notifySlaBreached(Ticket ticket) {
        // Son 30 dakikada aynı bildirim gönderilmiş mi?
        Instant oneDayAgo = Instant.now().minusSeconds(86400);
        long recentCount = notificationRepository.countRecentByTicketAndType(
                ticket.getId(), NotificationType.SLA_BREACHED, oneDayAgo);

        if (recentCount > 0) {
            log.debug("SLA ihlal bildirimi zaten gönderilmiş: ticketId={}", ticket.getId());
            return;
        }

        String message = notificationService.buildSlaBreachedMessage(ticket.getId());

        // Agent'a bildirim
        Long assigneeId = ticket.getAssigneeId();
        if (assigneeId != null && !isManager(assigneeId)) {
            notificationRepository.save(com.ticket.backend.entity.Notification.builder()
                    .userId(assigneeId).relatedTicketId(ticket.getId())
                    .message(message).type(NotificationType.SLA_BREACHED)
                    .read(false).build());
            notificationService.sendEmailToUser(
                    assigneeId,
                    String.format("SLA breached for request #%d", ticket.getId()),
                    "SLA deadline missed — immediate action required.");
        }

        // Tüm manager'lara bildirim
        List<User> managers = userRepository.findByRole(com.ticket.backend.enums.UserRole.MANAGER);
        for (User manager : managers) {
            notificationRepository.save(com.ticket.backend.entity.Notification.builder()
                    .userId(manager.getId()).relatedTicketId(ticket.getId())
                    .message(message).type(NotificationType.SLA_BREACHED)
                    .read(false).build());
            notificationService.sendEmailToUser(
                    manager.getId(),
                    String.format("SLA breached for request #%d", ticket.getId()),
                    "SLA deadline missed — immediate action required.");
        }

        log.info("SLA ihlal bildirimi gönderildi: ticketId={}", ticket.getId());
    }

    private void notifySlaWarning(Ticket ticket) {
        // Son 2 saatte aynı bildirim gönderilmiş mi?
        Instant oneDayAgo = Instant.now().minusSeconds(86400);
        long recentCount = notificationRepository.countRecentByTicketAndType(
                ticket.getId(), NotificationType.SLA_WARNING, oneDayAgo);

        if (recentCount > 0) {
            log.debug("SLA uyarı bildirimi zaten gönderilmiş: ticketId={}", ticket.getId());
            return;
        }

        long remainingMinutes = Duration.between(LocalDateTime.now(), ticket.getSlaDueDate()).toMinutes();
        String message = notificationService.buildSlaWarningMessage(ticket.getId(), remainingMinutes);

        // Agent'a bildirim
        Long assigneeId = ticket.getAssigneeId();
        if (assigneeId != null && !isManager(assigneeId)) {
            notificationRepository.save(com.ticket.backend.entity.Notification.builder()
                    .userId(assigneeId).relatedTicketId(ticket.getId())
                    .message(message).type(NotificationType.SLA_WARNING)
                    .read(false).build());
            notificationService.sendEmailToUser(
                    assigneeId,
                    String.format("SLA warning for request #%d", ticket.getId()),
                    String.format("SLA deadline approaching — %d minutes remaining.", remainingMinutes));
        }

        // Tüm manager'lara bildirim
        List<User> managers = userRepository.findByRole(com.ticket.backend.enums.UserRole.MANAGER);
        for (User manager : managers) {
            notificationRepository.save(com.ticket.backend.entity.Notification.builder()
                    .userId(manager.getId()).relatedTicketId(ticket.getId())
                    .message(message).type(NotificationType.SLA_WARNING)
                    .read(false).build());
            notificationService.sendEmailToUser(
                    manager.getId(),
                    String.format("SLA warning for request #%d", ticket.getId()),
                    String.format("SLA deadline approaching — %d minutes remaining.", remainingMinutes));
        }

        log.info("SLA uyarı bildirimi gönderildi: ticketId={}", ticket.getId());
    }

    private boolean isManager(Long userId) {
        return userRepository.findById(userId)
                .map(u -> u.getRole() == com.ticket.backend.enums.UserRole.MANAGER)
                .orElse(false);
    }
}