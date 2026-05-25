package com.ticket.backend.service;

import com.ticket.backend.entity.Comment;
import com.ticket.backend.entity.Notification;
import com.ticket.backend.entity.Ticket;
import com.ticket.backend.entity.User;
import com.ticket.backend.enums.CommentAuthorType;
import com.ticket.backend.enums.NotificationType;
import com.ticket.backend.enums.Status;
import com.ticket.backend.repository.CommentRepository;
import com.ticket.backend.repository.NotificationRepository;
import com.ticket.backend.repository.TicketRepository;
import com.ticket.backend.repository.UserRepository;
import com.ticket.backend.enums.UserRole;
import java.time.Instant;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    /** @([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}) — group 1 = full email without leading @ mention marker ambiguity */
    private static final Pattern MENTION_EMAIL =
            Pattern.compile("@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})");

    /**
     * Internal not metninde, {@link #MENTION_EMAIL} ile eşleşen bir @adres ifadesi verilen e-postaya eşit mi (büyük/küçük harf duyarsız).
     */
    public boolean textMentionsEmail(String text, String email) {
        if (text == null || email == null || email.isBlank()) {
            return false;
        }
        String needle = email.trim();
        Matcher m = MENTION_EMAIL.matcher(text);
        while (m.find()) {
            if (needle.equalsIgnoreCase(m.group(1))) {
                return true;
            }
        }
        return false;
    }

    private final NotificationRepository notificationRepository;
    private final TicketRepository ticketRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final MailService mailService;

    private static final DateTimeFormatter NOTIFICATION_TIME = DateTimeFormatter.ofPattern("HH:mm");

    /** Müşteri hedefli kopya için rol kontrolü (UserRole.CUSTOMER). */
    private boolean isCustomerUser(Long userId) {
        if (userId == null) {
            return false;
        }
        return userRepository.findById(userId).map(u -> u.getRole() == UserRole.CUSTOMER).orElse(false);
    }

    private static String notificationTimeNow() {
        return LocalTime.now().format(NOTIFICATION_TIME);
    }

    /** {@code #id — Başlık|||HH:mm · açıklama} */
    private String notificationLine(long ticketId, String headline, String descriptionTail) {
        return String.format("#%d — %s|||%s · %s", ticketId, headline, notificationTimeNow(), descriptionTail);
    }

    /**
     * In-app satırındaki ({@code ...|||HH:mm · açıklama}) son kısmını müşteri e-postası gövdesi olarak döndürür.
     */
    private static String descriptionFromNotificationLine(String line) {
        if (line == null || line.isBlank()) {
            return "";
        }
        int triple = line.indexOf("|||");
        if (triple < 0) {
            return line.trim();
        }
        String tail = line.substring(triple + 3).trim();
        int sep = tail.indexOf(" · ");
        if (sep < 0) {
            return tail;
        }
        return tail.substring(sep + 3).trim();
    }

    /**
     * E-posta gönderimi — hata in-app bildirimini etkilemez.
     */
    public void sendEmailToUser(Long userId, String subject, String body) {
        try {
            if (userId == null || subject == null || body == null) {
                return;
            }
            User u = userRepository.findById(userId).orElse(null);
            if (u == null || u.getEmail() == null || u.getEmail().isBlank()) {
                return;
            }
            mailService.sendSimpleEmail(u.getEmail().trim(), subject, body);
        } catch (Exception e) {
            log.warn("sendEmailToUser failed userId={}: {}", userId, e.getMessage());
        }
    }

    public String buildSlaWarningMessage(long ticketId, long minutesRemaining) {
        return notificationLine(ticketId, "SLA Warning", minutesRemaining + " minutes remaining.");
    }

    public String buildSlaBreachedMessage(long ticketId) {
        return notificationLine(ticketId, "SLA Breached", "Immediate action required.");
    }

    public void notifySlaBreached(Long ticketId) {
        try {
            Ticket ticket = ticketRepository.findById(ticketId).orElse(null);
            if (ticket == null) {
                return;
            }

            Instant oneDayAgo = Instant.now().minusSeconds(86400);
            long recentCount = notificationRepository.countRecentByTicketAndType(
                    ticket.getId(), NotificationType.SLA_BREACHED, oneDayAgo);
            if (recentCount > 0) {
                return;
            }

            String message = buildSlaBreachedMessage(ticket.getId());

            Long assigneeId = ticket.getAssigneeId();
            if (assigneeId != null && !isManagerUser(assigneeId)) {
                createNotification(assigneeId, ticket.getId(), message, NotificationType.SLA_BREACHED);
                sendEmailToUser(
                        assigneeId,
                        String.format("SLA breached for request #%d", ticket.getId()),
                        "SLA deadline missed — immediate action required.");
            }

            List<User> managers = userRepository.findByRole(UserRole.MANAGER);
            for (User manager : managers) {
                createNotification(manager.getId(), ticket.getId(), message, NotificationType.SLA_BREACHED);
                sendEmailToUser(
                        manager.getId(),
                        String.format("SLA breached for request #%d", ticket.getId()),
                        "SLA deadline missed — immediate action required.");
            }

            log.info("SLA breach notification sent: ticketId={}", ticketId);
        } catch (Exception e) {
            log.warn("notifySlaBreached failed: {}", e.getMessage());
        }
    }

    private boolean isManagerUser(Long userId) {
        return userRepository.findById(userId)
                .map(u -> u.getRole() == UserRole.MANAGER)
                .orElse(false);
    }

    private String buildStatusChangedMessage(
            long ticketId,
            Long recipientId,
            Ticket t,
            Status prev,
            Status cur,
            boolean customerResumeToAssignee) {
        if (customerResumeToAssignee) {
            return notificationLine(ticketId, "Customer Responded", "Request back in progress.");
        }
        Long creatorId = t.getCreatorId();
        boolean customerAudience =
                isCustomerUser(recipientId)
                        || (creatorId != null && creatorId.equals(recipientId));
        if (customerAudience) {
            if (cur == Status.IN_PROGRESS && prev == Status.RESOLVED) {
                return notificationLine(ticketId, "Request Reopened", "You declined the solution.");
            }
            if (cur == Status.IN_PROGRESS) {
                return notificationLine(ticketId, "Being Reviewed", "Our team is now reviewing your request.");
            }
            if (cur == Status.WAITING_FOR_CUSTOMER) {
                return notificationLine(ticketId, "Response Needed", "Please check the latest update.");
            }
            if (cur == Status.RESOLVED) {
                return notificationLine(ticketId, "Solution Proposed", "Please review and accept or decline.");
            }
            return notificationLine(ticketId, "Status Updated", "Your request status has changed.");
        }
        if (prev == Status.RESOLVED && cur == Status.IN_PROGRESS) {
            return notificationLine(ticketId, "Customer Declined", "Resolution declined, request reopened.");
        }
        if (cur == Status.IN_PROGRESS) {
            return notificationLine(ticketId, "Status Updated", "Request status changed to In Progress.");
        }
        if (cur == Status.WAITING_FOR_CUSTOMER) {
            return notificationLine(ticketId, "Moved to Waiting", "Request moved to Waiting for Customer.");
        }
        if (cur == Status.RESOLVED) {
            return notificationLine(ticketId, "Marked as Resolved", "Awaiting customer confirmation.");
        }
        return notificationLine(ticketId, "Status Updated", "Request status has changed.");
    }

    /**
     * Ticket oluşturma bildirimi — senkron; ticket ile aynı transaction içinde güvenilir kayıt.
     */
    public void notifyTicketCreated(Long ticketId) {
        log.debug(">>> [BİLDİRİM] notifyTicketCreated çağrıldı, ticketId={}", ticketId);
        try {
            Ticket t = ticketRepository.findById(ticketId).orElse(null);
            if (t == null || t.getCreatorId() == null) {
                log.debug(">>> [BİLDİRİM] notifyTicketCreated atlandı (ticket veya creatorId null), ticketId={}", ticketId);
                return;
            }
            String body = notificationLine(ticketId, "Request Received", "We'll start working on it soon.");
            log.debug(
                    ">>> [BİLDİRİM] notifyTicketCreated createNotification öncesi userId={}, ticketId={}, type={}, message={}",
                    t.getCreatorId(),
                    ticketId,
                    NotificationType.TICKET_CREATED,
                    body);
            createNotification(t.getCreatorId(), ticketId, body, NotificationType.TICKET_CREATED);
            if (isCustomerUser(t.getCreatorId())) {
                sendEmailToUser(
                        t.getCreatorId(),
                        String.format("Request #%d received", ticketId),
                        "Your request has been received. We'll start working on it soon.");
            }
            log.debug(">>> [BİLDİRİM] notifyTicketCreated createNotification sonrası tamamlandı, ticketId={}", ticketId);
        } catch (Exception e) {
            log.warn("notifyTicketCreated failed: {}", e.getMessage());
        }
    }

    /**
     * Atama bildirimi — senkron; PUT/update ile aynı transaction içinde çalışır.
     */
    public void notifyTicketAssigned(Long ticketId, Long assigneeId, Long actorId, String title) {
        log.debug(
                ">>> [BİLDİRİM] notifyTicketAssigned çağrıldı, ticketId={}, assigneeId={}, actorId={}",
                ticketId,
                assigneeId,
                actorId);
        try {
            if (ticketId == null || assigneeId == null) {
                log.debug(">>> [BİLDİRİM] notifyTicketAssigned atlandı (ticketId veya assigneeId null)");
                return;
            }
            if (actorId != null && assigneeId.equals(actorId)) {
                log.debug(">>> [BİLDİRİM] notifyTicketAssigned atlandı (actor assignee ile aynı), ticketId={}", ticketId);
                return;
            }
            String body = notificationLine(ticketId, "New Request Assigned", "A request has been assigned to you.");
            log.debug(
                    ">>> [BİLDİRİM] notifyTicketAssigned createNotification öncesi userId={}, ticketId={}, type={}, message={}",
                    assigneeId,
                    ticketId,
                    NotificationType.TICKET_ASSIGNED,
                    body);
            createNotification(assigneeId, ticketId, body, NotificationType.TICKET_ASSIGNED);
            sendEmailToUser(
                    assigneeId,
                    String.format("You've been assigned to request #%d", ticketId),
                    "A request has been assigned to you.");
            log.debug(">>> [BİLDİRİM] notifyTicketAssigned createNotification sonrası tamamlandı, ticketId={}", ticketId);
        } catch (Exception e) {
            log.warn("notifyTicketAssigned failed: {}", e.getMessage());
        }
    }

    /** Toplu devir: yeni atanan agent — in-app + e-posta (kendi üstüne alma yok). */
    public void notifyTicketTransferred(Long ticketId, Long newAssigneeId) {
        try {
            if (ticketId == null || newAssigneeId == null) {
                return;
            }
            String body =
                    notificationLine(ticketId, "Request Transferred", "A request has been transferred to you.");
            createNotification(newAssigneeId, ticketId, body, NotificationType.TICKET_ASSIGNED);
            sendEmailToUser(
                    newAssigneeId,
                    String.format("Request #%d transferred to you", ticketId),
                    "A request has been transferred to you.");
        } catch (Exception e) {
            log.warn("notifyTicketTransferred failed: {}", e.getMessage());
        }
    }

    /**
     * Agent/manager statü değişimi (commit sonrası async; {@code currentStatus} senkron taraftan gelir —
     * transaction yarışında DB'den okunan statüye güvenilmez).
     * <p>Müşteri WAITING_FOR_CUSTOMER iken yanıt verip IN_PROGRESS'e döndürdüğünde bildirim assignee'ye gider;
     * ekip üyesi güncellediğinde creator'a gider.
     */
    @Async
    public void notifyStatusChanged(Long ticketId, Status previousStatus, Status currentStatus, Long actorId) {
        try {
            log.debug("notifyStatusChanged: ticketId={}, previous={}, current={}, actorId={}", ticketId, previousStatus, currentStatus, actorId);
            if (Objects.equals(previousStatus, currentStatus)) return;
            if (currentStatus == Status.CLOSED) {
                return;
            }
            Ticket t = ticketRepository.findById(ticketId).orElse(null);
            if (t == null) return;
            String body =
                    buildStatusChangedMessage(ticketId, t.getCreatorId(), t, previousStatus, currentStatus, false);

            boolean customerResumed =
                    previousStatus == Status.WAITING_FOR_CUSTOMER
                            && currentStatus == Status.IN_PROGRESS
                            && actorId != null
                            && t.getCreatorId() != null
                            && actorId.equals(t.getCreatorId());

            if (customerResumed) {
                Long assigneeId = t.getAssigneeId();
                log.debug(
                        "notifyStatusChanged: müşteri yanıtı → assigneeId={}, creatorId={}",
                        assigneeId,
                        t.getCreatorId());
                if (assigneeId != null) {
                    String assigneeBody =
                            buildStatusChangedMessage(ticketId, assigneeId, t, previousStatus, currentStatus, true);
                    createNotification(assigneeId, ticketId, assigneeBody, NotificationType.STATUS_CHANGED);
                }
                return;
            }

            if (t.getCreatorId() == null) return;
            createNotification(t.getCreatorId(), ticketId, body, NotificationType.STATUS_CHANGED);
            if (isCustomerUser(t.getCreatorId())) {
                if (currentStatus == Status.RESOLVED) {
                    sendEmailToUser(
                            t.getCreatorId(),
                            String.format("Solution proposed for request #%d", ticketId),
                            "A solution has been proposed. Please review and accept or decline.");
                } else {
                    sendEmailToUser(
                            t.getCreatorId(),
                            String.format("Request #%d — status update", ticketId),
                            descriptionFromNotificationLine(body));
                }
            }
        } catch (Exception e) {
            log.warn("notifyStatusChanged failed: {}", e.getMessage());
        }
    }

    @Async
    public void notifyTicketClosed(Long ticketId, Long actorId) {
        try {
            Ticket t = ticketRepository.findById(ticketId).orElse(null);
            log.debug(
                    "notifyTicketClosed çağrıldı: ticketId={}, actorId={}, creatorId={}, assigneeId={}",
                    ticketId,
                    actorId,
                    t != null ? t.getCreatorId() : null,
                    t != null ? t.getAssigneeId() : null);
            if (t == null) return;
            notifyTicketClosedSnapshot(t);
        } catch (Exception e) {
            log.warn("notifyTicketClosed failed: {}", e.getMessage());
        }
    }

    private void notifyTicketClosedSnapshot(Ticket t) {
        Long ticketId = t.getId();
        java.util.LinkedHashSet<Long> recipients = new java.util.LinkedHashSet<>();
        if (t.getCreatorId() != null) {
            recipients.add(t.getCreatorId());
        }
        if (t.getAssigneeId() != null) {
            recipients.add(t.getAssigneeId());
        }
        log.debug("notifyTicketClosed bildirim alıcıları: ticketId={}, recipients={}", ticketId, recipients);
        for (Long userId : recipients) {
            String msg =
                    isCustomerUser(userId)
                            ? notificationLine(ticketId, "Request Closed", "Thank you!")
                            : notificationLine(ticketId, "Request Closed", "The request has been closed.");
            createNotification(userId, ticketId, msg, NotificationType.TICKET_CLOSED);
            sendEmailToUser(
                    userId,
                    String.format("Request #%d closed", ticketId),
                    "Your request has been closed.");
        }
    }

    @Async
    public void notifyCustomerRejected(Long ticketId) {
        try {
            Ticket t = ticketRepository.findById(ticketId).orElse(null);
            if (t == null || t.getAssigneeId() == null) return;
            String msg =
                    notificationLine(
                            ticketId,
                            "Customer Declined",
                            "Solution declined, request reopened.");
            createNotification(t.getAssigneeId(), ticketId, msg, NotificationType.STATUS_CHANGED);
            sendEmailToUser(
                    t.getAssigneeId(),
                    String.format("Customer reopened request #%d", ticketId),
                    "Customer declined the resolution. Request reopened.");
        } catch (Exception e) {
            log.warn("notifyCustomerRejected failed: {}", e.getMessage());
        }
    }

    @Async
    @Transactional
    public void notifyCommentAdded(Long commentId) {
        try {
            Comment c = commentRepository.findById(commentId).orElse(null);
            if (c == null || c.getTicket() == null) return;
            Long ticketIdFromComment = c.getTicket().getId();
            Ticket ticket =
                    ticketRepository.findById(ticketIdFromComment).orElse(null);
            if (ticket == null) return;
            Long ticketId = ticket.getId();
            Long authorId = c.getAuthorUserId();
            boolean internal = Boolean.TRUE.equals(c.getIsInternal());
            log.debug(
                    "notifyCommentAdded: commentId={}, authorType={}, internal={}, ticketId={}, assigneeId={}, creatorId={}, authorId={}",
                    c.getId(),
                    c.getAuthorType(),
                    internal,
                    ticketId,
                    ticket.getAssigneeId(),
                    ticket.getCreatorId(),
                    authorId);

            if (internal) {
                Set<Long> mentionedInThisComment = new LinkedHashSet<>();
                for (String email : extractMentionEmails(c.getMessage())) {
                    userRepository.findByEmail(email).ifPresent(u -> mentionedInThisComment.add(u.getId()));
                }
                Ticket refreshedForRecipients =
                        ticketRepository.findById(ticketId).orElse(ticket);
                Set<Long> allInvolved =
                        collectUserIdsMentionedInInternalComments(refreshedForRecipients);
                if (authorId != null) {
                    allInvolved.add(authorId);
                }

                // Assignee'yi de bildirim alıcılarına ekle (ama Involved listesine değil)
                if (ticket.getAssigneeId() != null) {
                    allInvolved.add(ticket.getAssigneeId());
                }

                for (Long recipientId : allInvolved) {
                    if (authorId != null && recipientId.equals(authorId)) {
                        continue;
                    }
                    String body =
                            mentionedInThisComment.contains(recipientId)
                                    ? notificationLine(
                                            ticketId, "You Were Mentioned", "You were mentioned in an internal note.")
                                    : notificationLine(
                                            ticketId,
                                            "New Internal Note",
                                            "New note on a request you're following.");
                    createNotification(recipientId, ticketId, body, NotificationType.COMMENT_ADDED);
                    if (mentionedInThisComment.contains(recipientId)) {
                        sendEmailToUser(
                                recipientId,
                                String.format("You were mentioned on request #%d", ticketId),
                                "You were mentioned in an internal note.");
                    } else {
                        sendEmailToUser(
                                recipientId,
                                String.format("New internal note on request #%d", ticketId),
                                "A new internal note was added on a request you're following.");
                    }
                }
                return;
            }

            if (c.getAuthorType() == CommentAuthorType.USER) {
                Long assigneeId = ticket.getAssigneeId();
                if (assigneeId == null) {
                    log.debug("notifyCommentAdded: müşteri yorumu — assigneeId yok, bildirim yok ticketId={}", ticketId);
                    return;
                }
                if (authorId != null && assigneeId.equals(authorId)) {
                    log.debug("notifyCommentAdded: müşteri yorumu — yazar assignee ile aynı, atlanıyor ticketId={}", ticketId);
                    return;
                }
                log.debug("notifyCommentAdded: müşteri → assignee bildirimi ticketId={}, assigneeId={}", ticketId, assigneeId);
                createNotification(
                        assigneeId,
                        ticketId,
                        notificationLine(ticketId, "New Customer Reply", "New reply from customer."),
                        NotificationType.COMMENT_ADDED);
                sendEmailToUser(
                        assigneeId,
                        String.format("New reply on request #%d", ticketId),
                        "A new reply has been added.");
                return;
            }

            if (c.getAuthorType() == CommentAuthorType.AGENT) {
                Long creatorId = ticket.getCreatorId();
                if (creatorId == null) return;
                if (authorId != null && creatorId.equals(authorId)) return;
                createNotification(
                        creatorId,
                        ticketId,
                        notificationLine(ticketId, "New Update", "Please check the latest response."),
                        NotificationType.COMMENT_ADDED);
                if (isCustomerUser(creatorId)) {
                    sendEmailToUser(
                            creatorId,
                            String.format("New reply on request #%d", ticketId),
                            "A new reply has been added.");
                }
            }
        } catch (Exception e) {
            log.warn("notifyCommentAdded failed: {}", e.getMessage());
        }
    }

    /** Ticket'taki tüm internal yorumlardan yazarlar ve @e-posta mention'larına karşılık gelen kullanıcı id'leri (sıra korunur). */
    private Set<Long> collectUserIdsMentionedInInternalComments(Ticket ticket) {
        Set<Long> ids = new LinkedHashSet<>();
        if (ticket.getComments() == null) {
            return ids;
        }
        for (Comment cm : ticket.getComments()) {
            if (!Boolean.TRUE.equals(cm.getIsInternal())) {
                continue;
            }
            Long commentAuthorId = cm.getAuthorUserId();
            if (commentAuthorId != null) {
                ids.add(commentAuthorId);
            }
            for (String email : extractMentionEmails(cm.getMessage())) {
                userRepository.findByEmail(email).ifPresent(u -> ids.add(u.getId()));
            }
        }
        return ids;
    }

    private static Set<String> extractMentionEmails(String message) {
        Set<String> out = new LinkedHashSet<>();
        if (message == null || message.isBlank()) return out;
        Matcher m = MENTION_EMAIL.matcher(message);
        while (m.find()) {
            String addr = m.group(1);
            if (addr != null && !addr.isBlank()) out.add(addr.trim());
        }
        return out;
    }

    private void createNotification(Long userId, Long relatedTicketId, String message, NotificationType type) {
        log.debug(">>> [BİLDİRİM] createNotification başladı userId={}, relatedTicketId={}, type={}", userId, relatedTicketId, type);
        if (userId == null) {
            log.debug(">>> [BİLDİRİM] createNotification atlandı userId null");
            return;
        }
        String safe = abbreviateMessage(message);
        log.debug(
                ">>> [BİLDİRİM] createNotification notificationRepository.save öncesi relatedTicketId={}, type={}, safeLen={}",
                relatedTicketId,
                type,
                safe.length());
        notificationRepository.save(Notification.builder()
                .userId(userId)
                .relatedTicketId(relatedTicketId)
                .message(safe)
                .type(type)
                .read(false)
                .build());
        log.debug(
                ">>> [BİLDİRİM] createNotification notificationRepository.save tamamlandı userId={}, relatedTicketId={}, type={}",
                userId,
                relatedTicketId,
                type);
    }

    private static String abbreviateMessage(String message) {
        if (message == null) return "";
        if (message.length() <= 500) return message;
        return message.substring(0, 497) + "...";
    }

    @Transactional(readOnly = true)
    public java.util.List<com.ticket.backend.entity.Notification> listForUser(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public long countUnread(Long userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public boolean markRead(Long notificationId, Long userId) {
        return notificationRepository
                .findById(notificationId)
                .filter(n -> n.getUserId().equals(userId))
                .map(n -> {
                    if (!n.isRead()) {
                        n.setRead(true);
                        notificationRepository.save(n);
                    }
                    return true;
                })
                .orElse(false);
    }

    @Transactional
    public int markAllRead(Long userId) {
        var list = notificationRepository.findByUserIdAndReadFalse(userId);
        int n = 0;
        for (com.ticket.backend.entity.Notification notification : list) {
            notification.setRead(true);
            n++;
        }
        if (n > 0) {
            notificationRepository.saveAll(list);
        }
        return n;
    }
}
