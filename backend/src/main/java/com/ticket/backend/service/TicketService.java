package com.ticket.backend.service;
import com.ticket.backend.dto.*;
import java.util.*;
import com.ticket.backend.dto.AgentCapacityDto;
import com.ticket.backend.dto.AgentLimitUpdateRequest;
import com.ticket.backend.dto.AssignTicketRequest;
import com.ticket.backend.dto.ChartSliceDto;
import com.ticket.backend.dto.CommentCreateRequest;
import com.ticket.backend.dto.DashboardMetricsDto;
import com.ticket.backend.dto.ReportsDto;
import com.ticket.backend.dto.TransferAllRequest;
import com.ticket.backend.dto.WeeklyFlowDto;
import com.ticket.backend.dto.WorklogCreateRequest;
import com.ticket.backend.dto.CustomerCloseRequest;
import com.ticket.backend.dto.TransferTicketRequest;
import com.ticket.backend.dto.TransferRejectRequest;
import com.ticket.backend.dto.TicketRejectRequest;
import com.ticket.backend.entity.Comment;
import com.ticket.backend.entity.Product;
import com.ticket.backend.entity.Ticket;
import com.ticket.backend.entity.User;
import com.ticket.backend.entity.Worklog;
import com.ticket.backend.enums.ClosureReason;
import com.ticket.backend.enums.Priority;
import com.ticket.backend.enums.Status;
import com.ticket.backend.enums.UserRole;
import com.ticket.backend.repository.CommentRepository;
import com.ticket.backend.repository.ProductRepository;
import com.ticket.backend.repository.TicketRepository;
import com.ticket.backend.repository.UserRepository;
import com.ticket.backend.repository.WorklogRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import com.ticket.backend.enums.CommentAuthorType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.time.Instant;
import java.time.format.DateTimeFormatter;


@Service
@RequiredArgsConstructor
@Transactional
public class TicketService {

    private static final Logger log = LoggerFactory.getLogger(TicketService.class);

    private final TicketRepository ticketRepository;
    private final CommentRepository commentRepository;
    private final ProductRepository productRepository;
    private final WorklogRepository worklogRepository;
    private final UserRepository userRepository;
    private final AppUserService appUserService;
    private final NotificationService notificationService;
    private final KafkaLogProducer kafkaLogProducer;
    private final JbpmService jbpmService;

    private Ticket hydrateTicketDisplayNames(Ticket ticket) {
        if (ticket == null) return null;
        if (ticket.getCreatorId() != null) {
            userRepository.findById(ticket.getCreatorId()).map(User::getName).ifPresent(ticket::setCreatorName);
        }
        if (ticket.getAssigneeId() != null) {
            userRepository.findById(ticket.getAssigneeId()).map(User::getName).ifPresent(ticket::setAssigneeName);
        } else {
            ticket.setAssigneeName(null);
        }
        if (ticket.getPendingTransferToAgentId() != null) {
            userRepository.findById(ticket.getPendingTransferToAgentId())
                    .map(User::getName)
                    .ifPresent(ticket::setPendingTransferToAgentName);
        } else {
            ticket.setPendingTransferToAgentName(null);
        }
        if (ticket.getPendingTransferFromAgentId() != null) {
            userRepository.findById(ticket.getPendingTransferFromAgentId())
                    .map(User::getName)
                    .ifPresent(ticket::setPendingTransferFromAgentName);
        } else {
            ticket.setPendingTransferFromAgentName(null);
        }
        return ticket;
    }

    private List<Ticket> hydrateTicketDisplayNames(List<Ticket> tickets) {
        tickets.forEach(this::hydrateTicketDisplayNames);
        return tickets;
    }

    public List<Ticket> listTicketsFor(Authentication authentication) {
        if (isCustomerOnly(authentication)) {
            Long uid = appUserService.requireUserId(authentication);
            return hydrateTicketDisplayNames(ticketRepository.findByCreatorId(uid));
        }
        if (isAgentOnly(authentication)) {
            return hydrateTicketDisplayNames(findAccessibleTicketsForAgent(authentication));
        }
        return hydrateTicketDisplayNames(ticketRepository.findAll());
    }

    /**
     * CP-49: Ajan inbox — (1) kendisine atanan tüm biletler, (2) havuz CLOSED olmayanlar,
     * (3) internal @mention ile dahil olunan tüm biletler (tekil id, güncellenme azalan).
     */
    private List<Ticket> findAccessibleTicketsForAgent(Authentication authentication) {
        Long uid = appUserService.requireUserId(authentication);
        Map<Long, Ticket> byId = new LinkedHashMap<>();
        for (Ticket t : ticketRepository.findByAssigneeId(uid)) {
            byId.put(t.getId(), t);
        }
        for (Ticket t : ticketRepository.findByPendingTransferToAgentId(uid)) {
            byId.put(t.getId(), t);
        }
        for (Ticket t : ticketRepository.findByAssigneeIdIsNullAndStatusNot(Status.CLOSED)) {
            byId.put(t.getId(), t);
        }
        userRepository
                .findById(uid)
                .map(User::getEmail)
                .map(String::trim)
                .filter(e -> !e.isBlank())
                .ifPresent(email -> {
                    for (Comment c : commentRepository.findInternalCommentsForPotentialEmailMention(email)) {
                        if (!Boolean.TRUE.equals(c.getIsInternal())) {
                            continue;
                        }
                        if (notificationService.textMentionsEmail(c.getMessage(), email)
                                && c.getTicket() != null) {
                            Ticket t = c.getTicket();
                            byId.put(t.getId(), t);
                        }
                    }
                });
        return byId.values().stream()
                .sorted(Comparator.comparing(
                                Ticket::getUpdatedAt,
                                Comparator.nullsLast(Comparator.naturalOrder()))
                        .reversed())
                .toList();
    }

    /** Olusturan JWT ile {@link AppUserService#getOrCreateUserId}; e-posta claim'i DB'ye yazilir. */
    public Ticket createTicketForCustomer(Ticket ticket, Jwt jwt) {
        String creatorSub = jwt.getSubject();
        if (creatorSub == null || creatorSub.isBlank()) {
            throw new IllegalStateException("JWT sub zorunludur.");
        }
        ticket.setCreatorId(appUserService.getOrCreateUserId(jwt));
        ticket.setCreatorSub(creatorSub);
        if (ticket.getStatus() == null) ticket.setStatus(Status.NEW);
        if (ticket.getPriority() == null) ticket.setPriority(Priority.MEDIUM);
        Ticket saved = ticketRepository.save(ticket);
        if (saved.getCreatedAt() != null) {
            saved.setSlaDueDate(calculateSlaDueDate(saved.getPriority(), saved.getCreatedAt()));
            Ticket persisted = ticketRepository.save(saved);
            notificationService.notifyTicketCreated(persisted.getId());
            kafkaLogProducer.sendLog(LogEventDto.builder()
                    .timestamp(Instant.now())
                    .level("INFO")
                    .action("TICKET_CREATED")
                    .ticketId(persisted.getId())
                    .userId(persisted.getCreatorId())
                    .message("Ticket created by customer")
                    .serviceName(LogEventDto.SERVICE_NAME_DESTROVA_BACKEND)
                    .build());
            jbpmService.startTicketProcess(persisted.getId(), persisted.getPriority().name(), persisted.getSlaDueDate());
            return hydrateTicketDisplayNames(persisted);
        }
        notificationService.notifyTicketCreated(saved.getId());
        kafkaLogProducer.sendLog(LogEventDto.builder()
                .timestamp(Instant.now())
                .level("INFO")
                .action("TICKET_CREATED")
                .ticketId(saved.getId())
                .userId(saved.getCreatorId())
                .message("Ticket created by customer")
                .serviceName(LogEventDto.SERVICE_NAME_DESTROVA_BACKEND)
                .build());
        jbpmService.startTicketProcess(saved.getId(), saved.getPriority().name(), saved.getSlaDueDate());
        return hydrateTicketDisplayNames(saved);
    }

    public Ticket getTicketById(Long id) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found with id: " + id));
        if (ticket.getComments() != null) {
            ticket.getComments().sort(Comparator.comparing(c -> c.getCreatedAt() == null ? LocalDateTime.MIN : c.getCreatedAt()));
        }
        if (ticket.getWorklogs() != null) {
            ticket.getWorklogs().sort(Comparator.comparing(w -> w.getWorkDate() == null ? LocalDateTime.MIN : w.getWorkDate()));
        }
        return hydrateTicketDisplayNames(ticket);
    }

    public Ticket getTicketByIdForUser(Long id, Authentication authentication) {
        Ticket ticket = getTicketById(id);
        if (isCustomerOnly(authentication)) {
            Long uid = appUserService.requireUserId(authentication);
            if (!ticket.getCreatorId().equals(uid)) {
                throw new AccessDeniedException("Bu talebe erisim yetkiniz yok.");
            }
            if (ticket.getComments() != null) {
                ticket.setComments(ticket.getComments().stream()
                        .filter(comment -> !Boolean.TRUE.equals(comment.getIsInternal())).toList());
            }
            ticket.setWorklogs(List.of());
        }
        if (isAgentOnly(authentication)) {
            if (!agentCanAccessTicket(ticket, authentication)) {
                throw new AccessDeniedException("Bu talebe erisim yetkiniz yok.");
            }
        }
        return ticket;
    }

    public Ticket updateTicketForUser(Long id, Ticket updateRequest, boolean assigneeIdProvided, Long newAssigneeId, Authentication authentication){
        Ticket existing = ticketRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found with id: " + id));
        Long uid = appUserService.requireUserId(authentication);
        boolean owner = existing.getCreatorId().equals(uid);
        Status requestedStatus = updateRequest.getStatus();

        if (isCustomerOnly(authentication)) {
            if (!owner) throw new AccessDeniedException("Bu talebi guncelleme yetkiniz yok.");
            if (requestedStatus == null) throw new AccessDeniedException("Musteri sadece cozulmus ticket icin onay veya red islemi yapabilir.");
            throw new AccessDeniedException("Musteri sadece cozulmus ticket icin onay veya red islemi yapabilir.");
        }
        if (isAgentOnly(authentication)) {
            assertAssigneeAgent(existing, authentication, "Sadece uzerinize atanmis ticket uzerinde status islemi yapabilirsiniz.");
            if (updateRequest.getStatus() == Status.CLOSED) {
                throw new AccessDeniedException("Agents cannot close tickets. Set to Resolved and wait for the customer to confirm.");
            }
            if (existing.getStatus() == Status.RESOLVED && updateRequest.getStatus() != null && updateRequest.getStatus() != Status.RESOLVED) {
                throw new AccessDeniedException("Only the customer can change a resolved ticket (accept or decline).");
            }
        }
        if (isManagerOnly(authentication)) {
            boolean transitioningToClosed =
                    updateRequest.getStatus() == Status.CLOSED && existing.getStatus() != Status.CLOSED;
            if (transitioningToClosed) {
                if (updateRequest.getClosureReason() == null) {
                    throw new IllegalArgumentException("Manager ticket kapatirken closureReason belirtmelidir.");
                }
                if (updateRequest.getClosureReason() == ClosureReason.CUSTOMER_APPROVED) {
                    throw new IllegalArgumentException("CUSTOMER_APPROVED sadece customer tarafindan kullanilabilir.");
                }
            }
        }
        
        // 1. Önce orijinal assignee'yi kaydet
        Long previousAssigneeId = existing.getAssigneeId();

        Status previousStatus = existing.getStatus();
        Ticket updated = updateTicket(id, updateRequest, assigneeIdProvided, newAssigneeId);

        log.debug(
                ">>> Atama bildirimi kontrol: assigneeIdProvided={}, newAssigneeId={}, existingAssigneeId={}, fark={}",
                assigneeIdProvided,
                newAssigneeId,
                existing.getAssigneeId(),
                !Objects.equals(existing.getAssigneeId(), newAssigneeId));
        // 3. Karşılaştırmayı kaydedilmiş değerle yap
        if (assigneeIdProvided && newAssigneeId != null 
            && !Objects.equals(previousAssigneeId, newAssigneeId)) {
            notificationService.notifyTicketAssigned(updated.getId(), newAssigneeId, uid, updated.getTitle());
        }

        Status currentStatus = updated.getStatus();
        if (!Objects.equals(previousStatus, currentStatus)) {
            if (currentStatus == Status.CLOSED) {
                notificationService.notifyTicketClosed(updated.getId(), uid);
                kafkaLogProducer.sendLog(LogEventDto.builder()
                        .timestamp(Instant.now())
                        .level("INFO")
                        .action("TICKET_CLOSED")
                        .ticketId(updated.getId())
                        .userId(uid)
                        .message("Ticket closed")
                        .serviceName(LogEventDto.SERVICE_NAME_DESTROVA_BACKEND)
                        .build());
            } else {
                notificationService.notifyStatusChanged(updated.getId(), previousStatus, currentStatus, uid);
                kafkaLogProducer.sendLog(LogEventDto.builder()
                        .timestamp(Instant.now())
                        .level("INFO")
                        .action("STATUS_CHANGED")
                        .ticketId(updated.getId())
                        .userId(uid)
                        .message("Status changed: " + statusLabelEn(previousStatus) + " → " + statusLabelEn(currentStatus))
                        .serviceName(LogEventDto.SERVICE_NAME_DESTROVA_BACKEND)
                        .build());
            }
        }

        return updated;
    }

    public Comment addCommentForUser(Long ticketId, CommentCreateRequest request, Authentication authentication) {
        assertCustomerOwnsTicketIfCustomerOnly(ticketId, authentication);
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found with id: " + ticketId));
        if (isCustomerOnly(authentication) && request.getIsInternal()) {
            throw new AccessDeniedException("Customer internal note yazamaz.");
        }
        if (isAgentOnly(authentication) && !isAssignedToCurrentUser(ticket, authentication)) {
            Long uid = appUserService.requireUserId(authentication);
            if (!Boolean.TRUE.equals(request.getIsInternal())) {
                throw new AccessDeniedException("Atanmamis agent musteri gorunur yorum yazamaz.");
            }
            if (!agentHasInternalMentionAccess(ticket, uid)) {
                throw new AccessDeniedException("Bu ticket icin internal not yazma yetkiniz yok.");
            }
        }
        Comment saved = addComment(ticketId, request, authentication);
        scheduleNotifyCommentAddedAfterCommit(saved.getId());
        return saved;
    }

    private void scheduleNotifyCommentAddedAfterCommit(Long commentId) {
        if (commentId == null) {
            return;
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    notificationService.notifyCommentAdded(commentId);
                }
            });
        } else {
            notificationService.notifyCommentAdded(commentId);
        }
    }

    public Worklog addWorklogForUser(Long ticketId, WorklogCreateRequest request, Authentication authentication) {
        if (!hasAuthority(authentication, "ROLE_AGENT") && !hasAuthority(authentication, "ROLE_ADMIN")) {
            throw new AccessDeniedException("Sadece agent worklog ekleyebilir.");
        }
        Long agentId = appUserService.requireUserId(authentication);
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found with id: " + ticketId));
        boolean isAdmin = hasAuthority(authentication, "ROLE_ADMIN");
        if (!isAdmin && (ticket.getAssigneeId() == null || !ticket.getAssigneeId().equals(agentId))) {
            throw new AccessDeniedException("Sadece uzerinize atanmis ticket icin worklog ekleyebilirsiniz.");
        }
        return addWorklog(ticketId, request, agentId);
    }

    private void assertCustomerOwnsTicketIfCustomerOnly(Long ticketId, Authentication authentication) {
        if (!isCustomerOnly(authentication)) return;
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found with id: " + ticketId));
        Long uid = appUserService.requireUserId(authentication);
        if (!ticket.getCreatorId().equals(uid)) {
            throw new AccessDeniedException("Bu talebe yorum ekleme yetkiniz yok.");
        }
    }

    private boolean isCustomerOnly(Authentication authentication) {
        boolean customer = hasAuthority(authentication, "ROLE_CUSTOMER");
        boolean elevated = hasAuthority(authentication, "ROLE_AGENT") || hasAuthority(authentication, "ROLE_MANAGER") || hasAuthority(authentication, "ROLE_ADMIN");
        return customer && !elevated;
    }

    boolean isAgentOnly(Authentication authentication) {
        boolean agent = hasAuthority(authentication, "ROLE_AGENT");
        boolean elevated = hasAuthority(authentication, "ROLE_MANAGER") || hasAuthority(authentication, "ROLE_ADMIN");
        return agent && !elevated;
    }

    private boolean isManagerOnly(Authentication authentication) {
        boolean manager = hasAuthority(authentication, "ROLE_MANAGER");
        boolean elevated = hasAuthority(authentication, "ROLE_ADMIN");
        return manager && !elevated;
    }

    boolean isAssignedToCurrentUser(Ticket ticket, Authentication authentication) {
        if (ticket.getAssigneeId() == null) return false;
        Long uid = appUserService.requireUserId(authentication);
        return ticket.getAssigneeId().equals(uid);
    }

    /**
     * Agent GET/list erisim kurallari — findAccessibleTicketsForAgent ile uyumlu.
     * Kapali ticket: atanan agent okuyabilmeli (gecmis / closure reason).
     */
    boolean agentCanAccessTicket(Ticket ticket, Authentication authentication) {
        Long uid = appUserService.requireUserId(authentication);
        if (isAssignedToCurrentUser(ticket, authentication)) {
            return true;
        }
        if (ticket.getPendingTransferToAgentId() != null
                && ticket.getPendingTransferToAgentId().equals(uid)) {
            return true;
        }
        if (ticket.getAssigneeId() == null && ticket.getStatus() != Status.CLOSED) {
            return true;
        }
        if (agentHasInternalMentionAccess(ticket, uid)) {
            return true;
        }
        if (ticket.getStatus() == Status.CLOSED
                && worklogRepository.existsByTicket_IdAndAgentId(ticket.getId(), uid)) {
            return true;
        }
        if (ticket.getStatus() == Status.CLOSED
                && ticketRepository.existsByIdAndAssigneeId(ticket.getId(), uid)) {
            return true;
        }
        return false;
    }

    /** Agent atanmamis; en az bir internal yorumda kullanicinin e-postasi @mention ile geciyor mu? */
    private boolean agentHasInternalMentionAccess(Ticket ticket, Long userId) {
        String email = userRepository.findById(userId)
                .map(User::getEmail)
                .filter(e -> e != null && !e.isBlank())
                .map(String::trim)
                .orElse(null);
        if (email == null) {
            return false;
        }
        if (ticket.getComments() == null) {
            return false;
        }
        for (Comment c : ticket.getComments()) {
            if (!Boolean.TRUE.equals(c.getIsInternal())) {
                continue;
            }
            if (notificationService.textMentionsEmail(c.getMessage(), email)) {
                return true;
            }
        }
        return false;
    }

    void assertAssigneeAgent(Ticket ticket, Authentication authentication, String message) {
        if (!isAssignedToCurrentUser(ticket, authentication)) throw new AccessDeniedException(message);
    }

    private boolean hasAuthority(Authentication authentication, String authority) {
        return authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals(authority));
    }

    public Ticket updateTicket(Long id, Ticket updateRequest, boolean assigneeIdProvided, Long newAssigneeId) {
        Ticket existingTicket = ticketRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found with id: " + id));
        Status previousStatus = existingTicket.getStatus();
        Priority previousPriority = existingTicket.getPriority();
        Long previousAssigneeId = existingTicket.getAssigneeId();
        LocalDateTime now = LocalDateTime.now();

        ClosureReason requestedClosureReason = updateRequest.getClosureReason();
        boolean directCloseReason = isDirectCloseReason(requestedClosureReason);
        Status requestedStatus = updateRequest.getStatus();
        if (directCloseReason) requestedStatus = Status.CLOSED;

        if (requestedStatus != null && requestedStatus != previousStatus) {
            existingTicket.setStatus(requestedStatus);
        }

        if (updateRequest.getPriority() != null) existingTicket.setPriority(updateRequest.getPriority());
        if (assigneeIdProvided) {
            if (newAssigneeId != null) {
                assignWithLimitCheck(existingTicket, newAssigneeId);
            } else {
                existingTicket.setAssigneeId(null);  // Unassign
            }
        }
        if (assigneeIdProvided && newAssigneeId != null && existingTicket.getStatus() == Status.NEW) {
            existingTicket.setStatus(Status.IN_PROGRESS);
        }
        if (updateRequest.getDescription() != null) existingTicket.setDescription(updateRequest.getDescription());

        Status currentStatus = existingTicket.getStatus();
        if (currentStatus == Status.CLOSED) {
            ClosureReason closureReason = requestedClosureReason != null ? requestedClosureReason : existingTicket.getClosureReason();
            if (closureReason == null) throw new IllegalStateException("Ticket kapatilirken kapanis nedeni zorunludur.");
            existingTicket.setClosureReason(closureReason);
        } else if (updateRequest.getClosureReason() != null) {
            existingTicket.setClosureReason(updateRequest.getClosureReason());
        } else {
            existingTicket.setClosureReason(null);
        }

        if (currentStatus == Status.RESOLVED || currentStatus == Status.CLOSED) existingTicket.setClosedAt(now);
        else existingTicket.setClosedAt(null);

        if (existingTicket.getSlaDueDate() == null && existingTicket.getCreatedAt() != null
                && currentStatus != Status.RESOLVED && currentStatus != Status.CLOSED) {
            existingTicket.setSlaDueDate(calculateSlaDueDate(existingTicket.getPriority(), existingTicket.getCreatedAt()));
        }

        if (currentStatus == Status.RESOLVED && previousStatus != Status.RESOLVED) {
            existingTicket.setCustomerRejectionNote(null);
        }
        if (previousStatus == Status.RESOLVED && currentStatus == Status.IN_PROGRESS) {
            String n = updateRequest.getCustomerRejectionNote();
            if (n != null && !n.trim().isEmpty()) existingTicket.setCustomerRejectionNote(n.trim());
        }

        Ticket saved = ticketRepository.save(existingTicket);
        appendStatusTimelineCommentsIfNeeded(saved, previousStatus, updateRequest);
        appendPriorityAndAssigneeTimelineIfNeeded(saved, previousPriority, previousAssigneeId, updateRequest);
        return hydrateTicketDisplayNames(saved);
    }

    void appendStatusTimelineCommentsIfNeeded(Ticket ticket, Status previous, Ticket request) {
        if (previous == null || ticket.getStatus() == null) return;
        Status now = ticket.getStatus();
        if (previous == now) return;
        if (previous == Status.RESOLVED && now == Status.CLOSED) {
            if (ticket.getClosureReason() == ClosureReason.CUSTOMER_APPROVED) {
                saveSystemComment(ticket, "Customer approved the solution. Ticket closed.");
            } else if (ticket.getClosureReason() != null) {
                saveSystemComment(ticket, "Request closed. Reason: " + ticket.getClosureReason().name());
            } else {
                saveSystemComment(ticket, "Customer approved the solution. Ticket closed.");
            }
            return;
        }
        if (previous == Status.RESOLVED && now == Status.IN_PROGRESS) {
            saveSystemComment(ticket, "Customer rejected the resolution. Ticket reopened.");
            return;
        }
        if (now == Status.CLOSED && ticket.getClosureReason() != null) {
            saveSystemComment(ticket, "Request closed. Reason: " + ticket.getClosureReason().name());
            return;
        }
        saveSystemComment(ticket, "Status changed: " + statusLabelEn(previous) + " → " + statusLabelEn(now));
    }

    void appendPriorityAndAssigneeTimelineIfNeeded(Ticket saved, Priority previousPriority, Long previousAssigneeId, Ticket updateRequest) {
        if (updateRequest.getPriority() != null && previousPriority != null && !previousPriority.equals(saved.getPriority())) {
            saveSystemComment(saved, "Priority changed: " + previousPriority + " → " + saved.getPriority() + ".");
        }
        if (!Objects.equals(previousAssigneeId, saved.getAssigneeId())) {
            if (saved.getAssigneeId() == null && previousAssigneeId != null) {
                saveSystemComment(saved, "Ticket unassigned.");
            } else if (saved.getAssigneeId() != null) {
                String name = userRepository.findById(saved.getAssigneeId()).map(User::getName).orElse("Agent #" + saved.getAssigneeId());
                saveSystemComment(saved, "Ticket assigned to " + name + ".");
            }
        }
    }

    private String statusLabelEn(Status s) {
        if (s == null) return "—";
        return switch (s) {
            case NEW -> "New";
            case IN_PROGRESS -> "In progress";
            case WAITING_FOR_CUSTOMER -> "Waiting for you";
            case RESOLVED -> "Resolved";
            case CLOSED -> "Closed";
        };
    }

    private void saveSystemComment(Ticket ticket, String message) {
        commentRepository.save(Comment.builder()
                .ticket(ticket).authorName("System").authorType(CommentAuthorType.SYSTEM)
                .message(message).isInternal(false).build());
    }

    private Comment saveInternalSystemComment(Ticket ticket, String message, Long authorUserId) {
        Comment saved = commentRepository.save(Comment.builder()
                .ticket(ticket)
                .authorName("System")
                .authorUserId(authorUserId)
                .authorType(CommentAuthorType.SYSTEM)
                .message(message)
                .isInternal(true)
                .build());
        scheduleNotifyCommentAddedAfterCommit(saved.getId());
        return saved;
    }

    private void clearPendingTransfer(Ticket ticket) {
        ticket.setPendingTransferToAgentId(null);
        ticket.setPendingTransferFromAgentId(null);
        ticket.setPendingTransferReason(null);
        ticket.setPendingTransferNote(null);
        ticket.setPendingTransferAt(null);
    }

    private Comment saveAgentInternalComment(Ticket ticket, String message, Long authorUserId, String authorName) {
        Comment saved = commentRepository.save(Comment.builder()
                .ticket(ticket)
                .authorName(authorName != null && !authorName.isBlank() ? authorName : "Agent")
                .authorUserId(authorUserId)
                .authorType(CommentAuthorType.AGENT)
                .message(message.trim())
                .isInternal(true)
                .build());
        scheduleNotifyCommentAddedAfterCommit(saved.getId());
        return saved;
    }

    private String buildTransferRequestInternalMessage(
            String fromName, User target, TransferTicketRequest request) {
        StringBuilder sb = new StringBuilder();
        sb.append(fromName).append(" requests transfer to @").append(target.getEmail())
                .append(". Reason: ").append(request.getTransferReason().toUpperCase());
        if (request.getTransferNote() != null && !request.getTransferNote().isBlank()) {
            sb.append(" — ").append(request.getTransferNote().trim());
        }
        sb.append(". Awaiting approval from @").append(target.getEmail()).append(".");
        return sb.toString();
    }

    private String buildTransferCompletedInternalMessage(
            String actorName, User target, TransferTicketRequest request, boolean managerDirect) {
        StringBuilder sb = new StringBuilder();
        if (managerDirect) {
            sb.append(actorName).append(" (manager) assigned ticket to @").append(target.getEmail());
        } else {
            sb.append("Transfer approved — ticket assigned to @").append(target.getEmail());
        }
        sb.append(". Reason: ").append(request.getTransferReason().toUpperCase());
        if (request.getTransferNote() != null && !request.getTransferNote().isBlank()) {
            sb.append(" — ").append(request.getTransferNote().trim());
        }
        return sb.toString();
    }

    Ticket requireTicket(Long ticketId) {
        return ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found with id: " + ticketId));
    }

    void validateAgentAssignRules(Ticket ticket, Long targetAssigneeId, Authentication authentication) {
        if (targetAssigneeId == null) {
            throw new IllegalStateException("Atama yapilacak agent bilgisi zorunludur.");
        }
        if (isAgentOnly(authentication)) {
            Long currentUserId = appUserService.requireUserId(authentication);
            if (!targetAssigneeId.equals(currentUserId)) {
                throw new AccessDeniedException("Agent sadece kendine atama yapabilir.");
            }
            if (ticket.getAssigneeId() != null && !ticket.getAssigneeId().equals(currentUserId)) {
                throw new AccessDeniedException("Baska agente atanmis ticket kendinize atanamaz.");
            }
        }
        assignWithLimitCheck(ticket, targetAssigneeId);
    }

    public Ticket assignTicket(Long ticketId, AssignTicketRequest request, Authentication authentication) {
        Ticket ticket = requireTicket(ticketId);
        Long targetAssigneeId = request.getAssigneeId();
        Long previousAssignee = ticket.getAssigneeId();
        Status previousStatus = ticket.getStatus();
        Priority previousPriority = ticket.getPriority();
        validateAgentAssignRules(ticket, targetAssigneeId, authentication);
        if (request.getStatus() != null) ticket.setStatus(request.getStatus());
        if (ticket.getStatus() == Status.NEW) ticket.setStatus(Status.IN_PROGRESS);
        if (ticket.getSlaDueDate() == null && ticket.getCreatedAt() != null) {
            ticket.setSlaDueDate(calculateSlaDueDate(ticket.getPriority(), ticket.getCreatedAt()));
        }
        Ticket saved = ticketRepository.save(ticket);
        Ticket timelineRequest = new Ticket();
        appendStatusTimelineCommentsIfNeeded(saved, previousStatus, timelineRequest);
        appendPriorityAndAssigneeTimelineIfNeeded(saved, previousPriority, previousAssignee, timelineRequest);
        Long actorUid = appUserService.requireUserId(authentication);
        Status statusAfter = saved.getStatus();
        if (!Objects.equals(previousAssignee, saved.getAssigneeId()) && saved.getAssigneeId() != null) {
            notificationService.notifyTicketAssigned(saved.getId(), saved.getAssigneeId(), actorUid, saved.getTitle());
            kafkaLogProducer.sendLog(LogEventDto.builder()
                    .timestamp(Instant.now())
                    .level("INFO")
                    .action("TICKET_ASSIGNED")
                    .ticketId(saved.getId())
                    .userId(actorUid)
                    .message("Ticket assigned to agent")
                    .serviceName(LogEventDto.SERVICE_NAME_DESTROVA_BACKEND)
                    .build());
        }
        if (!Objects.equals(previousStatus, statusAfter) && statusAfter != Status.CLOSED) {
            scheduleStatusChangedAfterCommit(saved.getId(), previousStatus, statusAfter, actorUid);
        }
        return hydrateTicketDisplayNames(saved);
    }

    private void scheduleStatusChangedAfterCommit(Long ticketId, Status previousStatus, Status currentStatus, Long actorId) {
        if (ticketId == null || Objects.equals(previousStatus, currentStatus)) {
            return;
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    notificationService.notifyStatusChanged(ticketId, previousStatus, currentStatus, actorId);
                }
            });
        } else {
            notificationService.notifyStatusChanged(ticketId, previousStatus, currentStatus, actorId);
        }
    }

    public int transferAllTickets(TransferAllRequest request) {
        if (request.getFromAgentId() == null || request.getToAgentId() == null) throw new IllegalStateException("Kaynak ve hedef agent bilgisi zorunludur.");
        if (request.getFromAgentId().equals(request.getToAgentId())) throw new IllegalStateException("Kaynak ve hedef agent ayni olamaz.");
        List<Ticket> activeTickets = ticketRepository.findByAssigneeIdAndStatusIn(request.getFromAgentId(), activeStatuses());
        if (activeTickets.isEmpty()) return 0;
        long targetCurrentLoad = ticketRepository.countByAssigneeIdAndStatusIn(request.getToAgentId(), activeStatuses());
        User targetAgent = getAgentOrThrow(request.getToAgentId());
        int projected = (int) (targetCurrentLoad + activeTickets.size());
        if (projected > targetAgent.getMaxTicketLimit()) {
            throw new IllegalStateException("Agent bilet limitine ulasti! Mevcut: " + targetCurrentLoad + "/" + targetAgent.getMaxTicketLimit());
        }
        activeTickets.forEach(ticket -> ticket.setAssigneeId(request.getToAgentId()));
        ticketRepository.saveAll(activeTickets);
        for (Ticket ticket : activeTickets) {
            notificationService.notifyTicketTransferred(ticket.getId(), request.getToAgentId());
        }
        return activeTickets.size();
    }

    public Ticket transferTicket(Long ticketId, TransferTicketRequest request, Authentication auth) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found: " + ticketId));

        if (request.getToAgentId() == null) {
            throw new IllegalArgumentException("toAgentId zorunludur.");
        }
        if (request.getTransferReason() == null || request.getTransferReason().isBlank()) {
            throw new IllegalArgumentException("transferReason zorunludur.");
        }
        List<String> validReasons = List.of("VACATION", "OVERLOAD", "EXPERTISE", "KNOWLEDGE_GAP");
        String reasonKey = request.getTransferReason().toUpperCase();
        if (!validReasons.contains(reasonKey)) {
            throw new IllegalArgumentException("Geçersiz transferReason. Geçerli değerler: " + validReasons);
        }
        if (ticket.getPendingTransferToAgentId() != null) {
            throw new IllegalStateException("Bu ticket için zaten bekleyen bir devir talebi var.");
        }

        if (isAgentOnly(auth)) {
            Long uid = appUserService.requireUserId(auth);
            if (!uid.equals(ticket.getAssigneeId())) {
                throw new AccessDeniedException("Sadece size atanmış ticket'ı devredebilirsiniz.");
            }
        }

        if (request.getToAgentId().equals(ticket.getAssigneeId())) {
            throw new IllegalArgumentException("Ticket zaten bu agent'a atanmış.");
        }

        Long actorId = appUserService.requireUserId(auth);
        User targetAgent = getAgentOrThrow(request.getToAgentId());
        User actorUser = userRepository.findById(actorId).orElse(null);
        String actorName = actorUser != null && actorUser.getName() != null
                ? actorUser.getName()
                : "Agent #" + actorId;

        if (isAgentOnly(auth)) {
            if (targetAgent.getEmail() == null || targetAgent.getEmail().isBlank()) {
                throw new IllegalArgumentException("Hedef agent e-posta adresi tanimli degil; mention gonderilemez.");
            }

            ticket.setPendingTransferToAgentId(request.getToAgentId());
            ticket.setPendingTransferFromAgentId(ticket.getAssigneeId());
            ticket.setPendingTransferReason(reasonKey);
            ticket.setPendingTransferNote(
                    request.getTransferNote() != null && !request.getTransferNote().isBlank()
                            ? request.getTransferNote().trim()
                            : null);
            ticket.setPendingTransferAt(LocalDateTime.now());
            Ticket saved = ticketRepository.save(ticket);

            saveInternalSystemComment(
                    saved, buildTransferRequestInternalMessage(actorName, targetAgent, request), actorId);
            if (request.getInternalMessage() != null && !request.getInternalMessage().isBlank()) {
                saveAgentInternalComment(saved, request.getInternalMessage().trim(), actorId, actorName);
            }

            notificationService.notifyTransferPendingApproval(saved.getId(), request.getToAgentId(), actorId);

            kafkaLogProducer.sendLog(LogEventDto.builder()
                    .timestamp(Instant.now())
                    .level("INFO")
                    .action("TICKET_TRANSFER_REQUESTED")
                    .ticketId(saved.getId())
                    .userId(actorId)
                    .message("Transfer requested. Reason: " + reasonKey)
                    .serviceName(LogEventDto.SERVICE_NAME_DESTROVA_BACKEND)
                    .build());

            return hydrateTicketDisplayNames(saved);
        }

        assignWithLimitCheck(ticket, request.getToAgentId());
        clearPendingTransfer(ticket);
        Ticket saved = ticketRepository.save(ticket);

        saveInternalSystemComment(
                saved, buildTransferCompletedInternalMessage(actorName, targetAgent, request, true), actorId);
        notificationService.notifyTicketTransferred(saved.getId(), request.getToAgentId());

        kafkaLogProducer.sendLog(LogEventDto.builder()
                .timestamp(Instant.now())
                .level("INFO")
                .action("TICKET_TRANSFERRED")
                .ticketId(saved.getId())
                .userId(actorId)
                .message("Ticket transferred by manager. Reason: " + reasonKey)
                .serviceName(LogEventDto.SERVICE_NAME_DESTROVA_BACKEND)
                .build());

        return hydrateTicketDisplayNames(saved);
    }

    public Ticket approveTransferTicket(Long ticketId, Authentication auth) {
        Ticket ticket = requireTicket(ticketId);
        Long uid = appUserService.requireUserId(auth);

        if (ticket.getPendingTransferToAgentId() == null) {
            throw new IllegalStateException("Bekleyen devir talebi yok.");
        }
        if (!uid.equals(ticket.getPendingTransferToAgentId())) {
            throw new AccessDeniedException("Sadece hedef agent devir talebini onaylayabilir.");
        }

        Long fromAgentId = ticket.getPendingTransferFromAgentId();
        Long newAssigneeId = ticket.getPendingTransferToAgentId();
        String reasonKey = ticket.getPendingTransferReason();
        String pendingNote = ticket.getPendingTransferNote();

        assignWithLimitCheck(ticket, newAssigneeId);
        clearPendingTransfer(ticket);
        Ticket saved = ticketRepository.save(ticket);

        User target = getAgentOrThrow(newAssigneeId);
        TransferTicketRequest auditRequest = TransferTicketRequest.builder()
                .toAgentId(newAssigneeId)
                .transferReason(reasonKey != null ? reasonKey : "EXPERTISE")
                .transferNote(pendingNote)
                .build();
        saveInternalSystemComment(
                saved, buildTransferCompletedInternalMessage("Transfer", target, auditRequest, false), uid);

        if (fromAgentId != null) {
            notificationService.notifyTransferRequestResolved(saved.getId(), fromAgentId, true);
        }
        notificationService.notifyTicketTransferred(saved.getId(), newAssigneeId);

        kafkaLogProducer.sendLog(LogEventDto.builder()
                .timestamp(Instant.now())
                .level("INFO")
                .action("TICKET_TRANSFER_APPROVED")
                .ticketId(saved.getId())
                .userId(uid)
                .message("Transfer approved")
                .serviceName(LogEventDto.SERVICE_NAME_DESTROVA_BACKEND)
                .build());

        return hydrateTicketDisplayNames(saved);
    }

    public Ticket rejectTransferTicket(Long ticketId, TransferRejectRequest request, Authentication auth) {
        Ticket ticket = requireTicket(ticketId);
        Long uid = appUserService.requireUserId(auth);

        if (ticket.getPendingTransferToAgentId() == null) {
            throw new IllegalStateException("Bekleyen devir talebi yok.");
        }
        if (!uid.equals(ticket.getPendingTransferToAgentId())) {
            throw new AccessDeniedException("Sadece hedef agent devir talebini reddedebilir.");
        }

        Long fromAgentId = ticket.getPendingTransferFromAgentId();
        clearPendingTransfer(ticket);
        Ticket saved = ticketRepository.save(ticket);

        String note = request != null && request.getNote() != null ? request.getNote().trim() : "";
        String comment = "Transfer request declined.";
        if (!note.isBlank()) {
            comment += " — " + note;
        }
        saveInternalSystemComment(saved, comment, uid);

        if (fromAgentId != null) {
            notificationService.notifyTransferRequestResolved(saved.getId(), fromAgentId, false);
        }

        kafkaLogProducer.sendLog(LogEventDto.builder()
                .timestamp(Instant.now())
                .level("INFO")
                .action("TICKET_TRANSFER_REJECTED")
                .ticketId(saved.getId())
                .userId(uid)
                .message("Transfer declined")
                .serviceName(LogEventDto.SERVICE_NAME_DESTROVA_BACKEND)
                .build());

        return hydrateTicketDisplayNames(saved);
    }

    public List<AgentCapacityDto> getAgentCapacities() {
        return userRepository.findByRole(UserRole.AGENT).stream()
                .map(agent -> AgentCapacityDto.builder()
                        .agentId(agent.getId()).agentName(agent.getName()).maxTicketLimit(agent.getMaxTicketLimit())
                        .activeTicketCount((int) ticketRepository.countByAssigneeIdAndStatusIn(agent.getId(), activeStatuses()))
                        .build())
                .toList();
    }

    public AgentCapacityDto updateAgentLimit(Long agentId, AgentLimitUpdateRequest request) {
        if (request.getMaxTicketLimit() == null || request.getMaxTicketLimit() < 1) throw new IllegalStateException("Agent ticket limiti en az 1 olmalidir.");
        User agent = getAgentOrThrow(agentId);
        agent.setMaxTicketLimit(request.getMaxTicketLimit());
        User saved = userRepository.save(agent);
        int load = (int) ticketRepository.countByAssigneeIdAndStatusIn(saved.getId(), activeStatuses());
        return AgentCapacityDto.builder().agentId(saved.getId()).agentName(saved.getName()).activeTicketCount(load).maxTicketLimit(saved.getMaxTicketLimit()).build();
    }

    public DashboardMetricsDto getManagerDashboard(LocalDate startDate, LocalDate endDate) {
        LocalDate safeStart = startDate != null ? startDate : LocalDate.now().minusDays(30);
        LocalDate safeEnd = endDate != null ? endDate : LocalDate.now();
        LocalDateTime rangeStart = safeStart.atStartOfDay();
        LocalDateTime rangeEnd = safeEnd.plusDays(1).atStartOfDay().minusNanos(1);
        List<TicketRepository.DashboardTicketProjection> scopedTickets =
                ticketRepository.findDashboardTicketsByCreatedAtBetween(rangeStart, rangeEnd);
        if (scopedTickets.isEmpty()) {
            return DashboardMetricsDto.builder().openTickets(0).slaViolations(0).atRiskTickets(0)
                    .averageResolutionHours(0.0).slaCompliancePercent(0.0)
                    .statusDistribution(List.of()).closureReasonDistribution(List.of()).weeklyFlow(List.of()).build();
        }
        int openTickets = (int) scopedTickets.stream().filter(t -> t.getStatus() != Status.CLOSED).count();
        int slaViolations = (int) scopedTickets.stream()
                .filter(t -> t.getSlaDueDate() != null && t.getClosedAt() != null && t.getClosedAt().isAfter(t.getSlaDueDate())).count();
        int atRiskTickets = (int) scopedTickets.stream()
                .filter(t -> t.getStatus() == Status.IN_PROGRESS && t.getSlaDueDate() != null)
                .filter(t -> Duration.between(LocalDateTime.now(), t.getSlaDueDate()).toHours() <= 2
                        && Duration.between(LocalDateTime.now(), t.getSlaDueDate()).toMinutes() > 0).count();
        List<TicketRepository.DashboardTicketProjection> solvedTickets = scopedTickets.stream()
                .filter(t -> t.getClosedAt() != null && t.getCreatedAt() != null).toList();
        double avgResolutionHours = solvedTickets.stream()
                .mapToLong(t -> Duration.between(t.getCreatedAt(), t.getClosedAt()).toMinutes())
                .average().orElse(0.0) / 60.0;
        List<TicketRepository.DashboardTicketProjection> closedTickets = scopedTickets.stream()
                .filter(t -> t.getStatus() == Status.CLOSED).toList();
        long compliantCount = closedTickets.stream()
                .filter(t -> t.getClosedAt() != null && t.getSlaDueDate() != null && !t.getClosedAt().isAfter(t.getSlaDueDate())).count();
        double slaCompliancePercent = closedTickets.isEmpty() ? 0.0 : (compliantCount * 100.0) / closedTickets.size();
        List<ChartSliceDto> statusDistribution = toChartSlices(
                scopedTickets.stream().collect(Collectors.groupingBy(t -> t.getStatus().name(), Collectors.counting())));
        List<ChartSliceDto> closureDistribution = toChartSlices(scopedTickets.stream()
                .filter(t -> t.getClosureReason() != null)
                .collect(Collectors.groupingBy(t -> t.getClosureReason().name(), Collectors.counting())));
        return DashboardMetricsDto.builder()
                .openTickets(openTickets).slaViolations(slaViolations).atRiskTickets(atRiskTickets)
                .averageResolutionHours(Math.round(avgResolutionHours * 10.0) / 10.0)
                .slaCompliancePercent(Math.round(slaCompliancePercent * 10.0) / 10.0)
                .statusDistribution(statusDistribution).closureReasonDistribution(closureDistribution)
                .weeklyFlow(buildWeeklyFlowFromDashboardTickets(safeStart, scopedTickets)).build();
    }

    public void deleteTicket(Long id) {
        Ticket existingTicket = ticketRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found with id: " + id));
        ticketRepository.delete(existingTicket);
    }

    public Comment addComment(Long ticketId, CommentCreateRequest request, Authentication authentication) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found with id: " + ticketId));
        if (request.getMessage() == null || request.getMessage().trim().isEmpty()) throw new IllegalStateException("Yorum mesaji zorunludur.");
        boolean customerOnly = isCustomerOnly(authentication);
        boolean agentLike = hasAuthority(authentication, "ROLE_AGENT") || hasAuthority(authentication, "ROLE_MANAGER") || hasAuthority(authentication, "ROLE_ADMIN");
        String authorName = resolveAuthorName(authentication);
        CommentAuthorType authorType = agentLike ? CommentAuthorType.AGENT : CommentAuthorType.USER;
        Long authorUserId = appUserService.requireUserId(authentication);
        boolean requestedInternal = Boolean.TRUE.equals(request.getIsInternal());
        if (customerOnly && requestedInternal) throw new AccessDeniedException("Musteri internal yorum ekleyemez.");
        boolean isInternal = agentLike && requestedInternal;
        Status statusBeforeComment = ticket.getStatus();
        Comment comment = Comment.builder().ticket(ticket).message(request.getMessage().trim())
                .authorName(authorName).authorUserId(authorUserId).authorType(authorType).isInternal(isInternal).build();
        Comment saved = commentRepository.save(comment);
        if (customerOnly && statusBeforeComment == Status.WAITING_FOR_CUSTOMER) {
            ticket.setStatus(Status.IN_PROGRESS);
            ticketRepository.save(ticket);
            notificationService.notifyStatusChanged(ticket.getId(), statusBeforeComment, Status.IN_PROGRESS, authorUserId);
            jbpmService.signalProcess(ticket.getId(), "RESUMED");
        }
        return saved;
    }

    private String resolveAuthorName(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal instanceof Jwt jwt) {
            String preferredUsername = jwt.getClaimAsString("preferred_username");
            String email = jwt.getClaimAsString("email");
            String name = jwt.getClaimAsString("name");
            if (preferredUsername != null && !preferredUsername.isBlank()) return preferredUsername.trim();
            if (name != null && !name.isBlank()) return name.trim();
            if (email != null && !email.isBlank()) return email.trim();
            return jwt.getSubject();
        }
        return authentication.getName();
    }

    public Worklog addWorklog(Long ticketId, WorklogCreateRequest request, Long agentId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found with id: " + ticketId));
        if (agentId == null) throw new IllegalStateException("Agent bilgisi zorunludur.");
        if (request.getDurationMinutes() == null || request.getDurationMinutes() <= 0) throw new IllegalStateException("Efor suresi sifirdan buyuk olmalidir.");
        if (request.getDescription() == null || request.getDescription().trim().isEmpty()) throw new IllegalStateException("Worklog aciklamasi zorunludur.");
        Worklog worklog = Worklog.builder().ticket(ticket).agentId(agentId)
                .durationMinutes(request.getDurationMinutes()).description(request.getDescription().trim()).build();
        return worklogRepository.save(worklog);
    }

    public List<Product> getAllProducts() { return productRepository.findAll(); }

    private LocalDateTime calculateSlaDueDate(Priority priority, LocalDateTime baseTime) {
        return switch (priority) {
            case HIGH -> baseTime.plusHours(4);
            case MEDIUM -> baseTime.plusHours(24);
            case LOW -> baseTime.plusHours(48);
        };
    }

    private boolean isDirectCloseReason(ClosureReason closureReason) {
        return closureReason == ClosureReason.INVALID || closureReason == ClosureReason.DUPLICATE;
    }

    void assignWithLimitCheck(Ticket ticket, Long assigneeId) {
        if (ticket.getAssigneeId() != null && ticket.getAssigneeId().equals(assigneeId)) {
            ticket.setAssigneeId(assigneeId);
            return;
        }
        User agent = getAgentOrThrow(assigneeId);
        long currentLoad = ticketRepository.countByAssigneeIdAndStatusIn(assigneeId, activeStatuses());
        if (currentLoad >= agent.getMaxTicketLimit()) {
            throw new IllegalStateException("Agent bilet limitine ulasti! Mevcut: " + currentLoad + "/" + agent.getMaxTicketLimit());
        }
        ticket.setAssigneeId(assigneeId);
    }

    private User getAgentOrThrow(Long agentId) {
        return userRepository.findById(agentId)
                .orElseThrow(() -> new EntityNotFoundException("Agent bulunamadi: " + agentId));
    }

    private Collection<Status> activeStatuses() {
        return List.of(Status.NEW, Status.IN_PROGRESS, Status.WAITING_FOR_CUSTOMER, Status.RESOLVED);
    }

    private List<ChartSliceDto> toChartSlices(Map<String, Long> groupedValues) {
        return groupedValues.entrySet().stream()
                .map(entry -> ChartSliceDto.builder().name(entry.getKey()).value(entry.getValue()).build())
                .toList();
    }

    //private DateTimeFormatter fmt = DateTimeFormatter.ofPattern("d MMM");

    private List<WeeklyFlowDto> buildWeeklyFlow(LocalDate startDate, List<Ticket> scopedTickets) {
        return List.of(0, 1, 2, 3).stream().map(index -> {
            LocalDate weekStart = startDate.with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY)).plusWeeks(index);
            LocalDate weekEnd = weekStart.plusDays(6);
            long opened = scopedTickets.stream().filter(t -> t.getCreatedAt() != null)
                    .filter(t -> { LocalDate d = t.getCreatedAt().toLocalDate(); return !d.isBefore(weekStart) && !d.isAfter(weekEnd); }).count();
            long closed = scopedTickets.stream().filter(t -> t.getClosedAt() != null)
                    .filter(t -> { LocalDate d = t.getClosedAt().toLocalDate(); return !d.isBefore(weekStart) && !d.isAfter(weekEnd); }).count();
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("d MMM");
            String label = weekStart.format(fmt) + " – " + weekEnd.format(fmt);
            return WeeklyFlowDto.builder().label(label).opened(opened).closed(closed).build();
        }).toList();
    }

    private List<WeeklyFlowDto> buildWeeklyFlowFromDashboardTickets(LocalDate startDate, List<TicketRepository.DashboardTicketProjection> scopedTickets) {
        return List.of(0, 1, 2, 3).stream().map(index -> {
            LocalDate weekStart = startDate.with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY)).plusWeeks(index);
            LocalDate weekEnd = weekStart.plusDays(6);
            long opened = scopedTickets.stream().filter(t -> t.getCreatedAt() != null)
                    .filter(t -> { LocalDate d = t.getCreatedAt().toLocalDate(); return !d.isBefore(weekStart) && !d.isAfter(weekEnd); }).count();
            long closed = scopedTickets.stream().filter(t -> t.getClosedAt() != null)
                    .filter(t -> { LocalDate d = t.getClosedAt().toLocalDate(); return !d.isBefore(weekStart) && !d.isAfter(weekEnd); }).count();
            return WeeklyFlowDto.builder().label("Hafta " + (index + 1)).opened(opened).closed(closed).build();
        }).toList();
    }

    public Ticket approveResolution(Long id, Authentication auth) {
        Ticket t = ticketRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Ticket not found with id: " + id));
        if (!t.getCreatorId().equals(appUserService.requireUserId(auth))) throw new AccessDeniedException("This request does not belong to you.");
        if (t.getStatus() != Status.RESOLVED) throw new IllegalStateException("Ticket is not awaiting approval.");
        t.setStatus(Status.CLOSED);
        t.setClosureReason(ClosureReason.CUSTOMER_APPROVED);
        Ticket saved = ticketRepository.save(t);
        commentRepository.save(Comment.builder().ticket(saved).authorName("System").authorType(CommentAuthorType.SYSTEM)
                .message("Customer approved the resolution. Ticket closed.").isInternal(false).build());
        Long uid = appUserService.requireUserId(auth);
        notificationService.notifyTicketClosed(saved.getId(), uid);
        kafkaLogProducer.sendLog(LogEventDto.builder()
                .timestamp(Instant.now())
                .level("INFO")
                .action("TICKET_CLOSED")
                .ticketId(saved.getId())
                .userId(uid)
                .message("Ticket closed by customer approval")
                .serviceName(LogEventDto.SERVICE_NAME_DESTROVA_BACKEND)
                .build());
        return getTicketById(saved.getId());
    }

    public Ticket customerCloseTicket(Long id, CustomerCloseRequest request, Authentication auth) {
        Ticket t = ticketRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found: " + id));

        Long uid = appUserService.requireUserId(auth);
        if (!t.getCreatorId().equals(uid)) {
            throw new AccessDeniedException("Bu talep size ait değil.");
        }
        if (t.getStatus() == Status.CLOSED) {
            throw new IllegalStateException("This request is already closed.");
        }

        ClosureReason reason = request.getClosureReason();
        if (reason == null) reason = ClosureReason.SOLVED;

        if (reason == ClosureReason.INVALID || reason == ClosureReason.CUSTOMER_APPROVED) {
            throw new IllegalArgumentException("Bu kapatma nedeni müşteri tarafından kullanılamaz.");
        }

        t.setStatus(Status.CLOSED);
        t.setClosureReason(reason);
        t.setClosedAt(LocalDateTime.now());

        Ticket saved = ticketRepository.save(t);

        commentRepository.save(Comment.builder()
                .ticket(saved)
                .authorName("System")
                .authorType(CommentAuthorType.SYSTEM)
                .message("Customer closed the request. Reason: " + reason.name())
                .isInternal(false)
                .build());

        notificationService.notifyTicketClosed(saved.getId(), uid);
        kafkaLogProducer.sendLog(LogEventDto.builder()
                .timestamp(Instant.now())
                .level("INFO")
                .action("TICKET_CLOSED")
                .ticketId(saved.getId())
                .userId(uid)
                .message("Ticket closed by customer. Reason: " + reason.name())
                .serviceName(LogEventDto.SERVICE_NAME_DESTROVA_BACKEND)
                .build());

        return getTicketById(saved.getId());
    }

    public Ticket rejectResolution(Long id, TicketRejectRequest req, Authentication auth) {
        Ticket t = ticketRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Ticket not found with id: " + id));
        if (!t.getCreatorId().equals(appUserService.requireUserId(auth))) throw new AccessDeniedException("Bu talep size ait degil.");
        if (t.getStatus() != Status.RESOLVED) throw new IllegalStateException("Ticket is not awaiting approval.");
        String reason = req.getReason() == null ? "" : req.getReason().trim();
        if (reason.isEmpty()) throw new IllegalStateException("Reason is required.");
        LocalDateTime now = LocalDateTime.now();
        if (t.getSlaDueDate() != null && t.getUpdatedAt() != null) {
            Duration resolvedDuration = Duration.between(t.getUpdatedAt(), now);
            if (!resolvedDuration.isNegative()) t.setSlaDueDate(t.getSlaDueDate().plus(resolvedDuration));
        }
        t.setStatus(Status.IN_PROGRESS);
        t.setCustomerRejectionNote(reason);
        Ticket saved = ticketRepository.save(t);
        commentRepository.save(Comment.builder().ticket(saved).authorName(resolveAuthorName(auth))
                .authorUserId(appUserService.requireUserId(auth)).authorType(CommentAuthorType.USER)
                .message(reason).isInternal(false).build());
        commentRepository.save(Comment.builder().ticket(saved).authorName("System").authorType(CommentAuthorType.SYSTEM)
                .message("Customer rejected the resolution. Ticket reopened.").isInternal(false).build());
        notificationService.notifyCustomerRejected(saved.getId());
        Long customerId = appUserService.requireUserId(auth);
        kafkaLogProducer.sendLog(LogEventDto.builder()
                .timestamp(Instant.now())
                .level("WARN")
                .action("STATUS_CHANGED")
                .ticketId(saved.getId())
                .userId(customerId)
                .message("Ticket reopened by customer rejection")
                .serviceName(LogEventDto.SERVICE_NAME_DESTROVA_BACKEND)
                .build());
        return getTicketById(saved.getId());
    }

    public AgentWorklogSummaryDto getAgentWorklogSummary(String period, Long productId, Authentication auth) {
        Long agentId = appUserService.requireUserId(auth);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime start = "week".equalsIgnoreCase(period) ? now.minusDays(7) : now.toLocalDate().atStartOfDay();
        LocalDateTime end = now;
        List<Worklog> worklogs = worklogRepository.findByAgentIdAndWorkDateBetween(agentId, start, end);
        List<Comment> comments = commentRepository.findByAuthorUserIdAndCreatedAtBetween(agentId, start, end);
        if (productId != null) {
            worklogs = worklogs.stream()
                    .filter(w -> w.getTicket().getProduct() != null && productId.equals(w.getTicket().getProduct().getId()))
                    .collect(Collectors.toList());
            comments = comments.stream()
                    .filter(c -> c.getTicket().getProduct() != null && productId.equals(c.getTicket().getProduct().getId()))
                    .collect(Collectors.toList());
        }
        int totalMinutes = worklogs.stream().mapToInt(w -> Optional.ofNullable(w.getDurationMinutes()).orElse(0)).sum();
        Set<Long> ticketIds = worklogs.stream().map(w -> w.getTicket().getId()).collect(Collectors.toSet());
        int ticketCount = ticketIds.size();
        int avgPerTicket = ticketCount == 0 ? 0 : totalMinutes / ticketCount;
        List<AgentWorklogActivityDto> activities = new ArrayList<>();
        for (Worklog w : worklogs) {
            activities.add(AgentWorklogActivityDto.builder().id("w-" + w.getId()).type("worklog")
                    .occurredAt(w.getWorkDate()).timeLabel(w.getWorkDate().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")))
                    .ticketId(w.getTicket().getId()).ticketTitle(w.getTicket().getTitle())
                    .productName(w.getTicket().getProduct() != null ? w.getTicket().getProduct().getName() : null)
                    .title("Logged work").context(w.getDescription()).durationMinutes(w.getDurationMinutes()).build());
        }
        for (Comment c : comments) {
            String type = Boolean.TRUE.equals(c.getIsInternal()) ? "internal" : "reply";
            activities.add(AgentWorklogActivityDto.builder().id("c-" + c.getId()).type(type)
                    .occurredAt(c.getCreatedAt()).timeLabel(c.getCreatedAt().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")))
                    .ticketId(c.getTicket().getId()).ticketTitle(c.getTicket().getTitle())
                    .productName(c.getTicket().getProduct() != null ? c.getTicket().getProduct().getName() : null)
                    .title(type.equals("internal") ? "Added internal note" : "Replied to ticket")
                    .context(c.getMessage()).durationMinutes(null).build());
        }
        activities.sort((a, b) -> b.getOccurredAt().compareTo(a.getOccurredAt()));
        if (activities.size() > 6) activities = activities.subList(0, 6);
        int replyCount = (int) comments.stream().filter(c -> !Boolean.TRUE.equals(c.getIsInternal())).count();
        int internalCount = (int) comments.stream().filter(c -> Boolean.TRUE.equals(c.getIsInternal())).count();
        int worklogCount = worklogs.size();
        int totalActivity = replyCount + internalCount + worklogCount;
        List<AgentWorklogDistributionDto> distribution = List.of(
                AgentWorklogDistributionDto.builder().key("reply").label("Reply").count(replyCount).pct(totalActivity == 0 ? 0 : (replyCount * 100) / totalActivity).build(),
                AgentWorklogDistributionDto.builder().key("internal").label("Internal").count(internalCount).pct(totalActivity == 0 ? 0 : (internalCount * 100) / totalActivity).build(),
                AgentWorklogDistributionDto.builder().key("worklog").label("Worklog").count(worklogCount).pct(totalActivity == 0 ? 0 : (worklogCount * 100) / totalActivity).build());
        String mostWorkedProduct = worklogs.stream()
                .map(w -> w.getTicket().getProduct() != null ? w.getTicket().getProduct().getName() : null)
                .filter(Objects::nonNull).collect(Collectors.groupingBy(p -> p, Collectors.counting()))
                .entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse("-");
        int avgFocus = worklogs.isEmpty() ? 0 : worklogs.stream().mapToInt(Worklog::getDurationMinutes).sum() / worklogs.size();
        List<AgentWorklogInsightDto> insights = List.of(
                AgentWorklogInsightDto.builder().label("Most worked product").value(mostWorkedProduct).build(),
                AgentWorklogInsightDto.builder().label("Avg focus session").value(avgFocus + " min").build());
        return AgentWorklogSummaryDto.builder().totalLoggedMinutes(totalMinutes).ticketsWorked(ticketCount)
                .avgMinutesPerTicket(avgPerTicket).responseTimeMinutes(null)
                .activities(activities).distribution(distribution).insights(insights).build();
    }

    // ── Reports ──────────────────────────────────────────────────────────────

    /**
     * Manager Reports ekrani icin tarih araligina gore tam performans raporu.
     * Urun bazli, agent bazli ve haftalik trend hesaplar.
     */
    public ReportsDto getManagerReports(LocalDate startDate, LocalDate endDate) {
        LocalDate safeStart = startDate != null ? startDate : LocalDate.now().minusDays(30);
        LocalDate safeEnd   = endDate   != null ? endDate   : LocalDate.now();
        LocalDateTime rangeStart = safeStart.atStartOfDay();
        LocalDateTime rangeEnd   = safeEnd.plusDays(1).atStartOfDay().minusNanos(1);

        List<Ticket> tickets = ticketRepository.findByCreatedAtBetweenOrderByCreatedAtAsc(rangeStart, rangeEnd);

        int totalCreated  = tickets.size();
        int totalResolved = (int) tickets.stream().filter(t -> t.getClosedAt() != null).count();

        double avgResolutionHours = tickets.stream()
                .filter(t -> t.getClosedAt() != null && t.getCreatedAt() != null)
                .mapToLong(t -> Duration.between(t.getCreatedAt(), t.getClosedAt()).toMinutes())
                .average().orElse(0.0) / 60.0;
        avgResolutionHours = Math.round(avgResolutionHours * 10.0) / 10.0;

        List<Ticket> closedTickets = tickets.stream().filter(t -> t.getStatus() == Status.CLOSED).toList();
        long compliantCount = closedTickets.stream()
                .filter(t -> t.getClosedAt() != null && t.getSlaDueDate() != null && !t.getClosedAt().isAfter(t.getSlaDueDate()))
                .count();
        double slaCompliancePct = closedTickets.isEmpty() ? 0.0
                : Math.round((compliantCount * 1000.0) / closedTickets.size()) / 10.0;

        List<WeeklyFlowDto> volumeSeries = buildWeeklyFlow(safeStart, tickets);

        Map<String, List<Ticket>> byProduct = tickets.stream()
                .collect(Collectors.groupingBy(t -> t.getProduct() != null ? t.getProduct().getName() : "Other"));

        List<ReportsDto.ProductReportRow> productRows = byProduct.entrySet().stream().map(entry -> {
            List<Ticket> pt = entry.getValue();
            List<Ticket> pClosed = pt.stream().filter(t -> t.getStatus() == Status.CLOSED).toList();
            long pCompliant = pClosed.stream()
                    .filter(t -> t.getClosedAt() != null && t.getSlaDueDate() != null && !t.getClosedAt().isAfter(t.getSlaDueDate())).count();
            int pSlaMet = pClosed.isEmpty() ? 0 : (int) Math.round((pCompliant * 100.0) / pClosed.size());
            double pAvgMin = pt.stream().filter(t -> t.getClosedAt() != null && t.getCreatedAt() != null)
                    .mapToLong(t -> Duration.between(t.getCreatedAt(), t.getClosedAt()).toMinutes()).average().orElse(0.0);
            return ReportsDto.ProductReportRow.builder().name(entry.getKey()).tickets(pt.size())
                    .avgResolution(formatDurationMinutes((long) pAvgMin)).slaMet(pSlaMet).deltaPct(0).build();
        }).sorted(Comparator.comparingInt(ReportsDto.ProductReportRow::getTickets).reversed()).toList();

        List<ReportsDto.AgentReportRow> agentRows = userRepository.findByRole(UserRole.AGENT).stream().map(agent -> {
            List<Ticket> at = tickets.stream().filter(t -> agent.getId().equals(t.getAssigneeId())).toList();
            List<Ticket> aClosed = at.stream().filter(t -> t.getStatus() == Status.CLOSED).toList();
            long aCompliant = aClosed.stream()
                    .filter(t -> t.getClosedAt() != null && t.getSlaDueDate() != null && !t.getClosedAt().isAfter(t.getSlaDueDate())).count();
            int aSlaMet = aClosed.isEmpty() ? 0 : (int) Math.round((aCompliant * 100.0) / aClosed.size());
            double aAvgMin = aClosed.stream().filter(t -> t.getCreatedAt() != null)
                    .mapToLong(t -> Duration.between(t.getCreatedAt(), t.getClosedAt()).toMinutes()).average().orElse(0.0);
            return ReportsDto.AgentReportRow.builder().name(agent.getName()).role("Agent").resolved(aClosed.size())
                    .avgResolution(formatDurationMinutes((long) aAvgMin)).slaMet(aSlaMet).csat(null).build();
        }).filter(r -> r.getResolved() > 0).sorted(Comparator.comparingInt(ReportsDto.AgentReportRow::getResolved).reversed()).toList();

        List<ReportsDto.ResolutionTrendPoint> resolutionTrend = List.of(0, 1, 2, 3).stream().map(i -> {
            LocalDate wStart = safeStart.with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY)).plusWeeks(i);
            LocalDate wEnd = wStart.plusDays(6);
            double wAvg = tickets.stream().filter(t -> t.getClosedAt() != null && t.getCreatedAt() != null)
                    .filter(t -> { LocalDate d = t.getCreatedAt().toLocalDate(); return !d.isBefore(wStart) && !d.isAfter(wEnd); })
                    .mapToLong(t -> Duration.between(t.getCreatedAt(), t.getClosedAt()).toMinutes()).average().orElse(0.0) / 60.0;
            return ReportsDto.ResolutionTrendPoint.builder().label("W" + (i + 1)).avgHours(Math.round(wAvg * 10.0) / 10.0).build();
        }).toList();

        return ReportsDto.builder().totalCreated(totalCreated).totalResolved(totalResolved)
                .avgResolutionHours(avgResolutionHours).slaCompliancePercent(slaCompliancePct)
                .volumeSeries(volumeSeries).products(productRows).agents(agentRows).resolutionTrend(resolutionTrend).build();
    }

    private String formatDurationMinutes(long totalMinutes) {
        if (totalMinutes <= 0) return "—";
        long h = totalMinutes / 60;
        long m = totalMinutes % 60;
        if (h > 0 && m > 0) return h + "h " + m + "m";
        if (h > 0) return h + "h";
        return m + "m";
    }

    // ── Esnek ticket listesi ─────────────────────────────────────────────────

    /**
     * Manager All Tickets & agent bazli filtre icin esnek ticket listesi.
     * null parametre = filtresiz.
     */
    public List<Ticket> getFilteredTickets(Long assigneeId, Status status, Priority priority) {
        return hydrateTicketDisplayNames(ticketRepository.findByFilters(assigneeId, status, priority));
    }

    public List<Product> getActiveProducts() {
        return productRepository.findByIsActiveTrue();
    }

    public void updateTotalPausedDuration(Long ticketId, Long totalPausedDurationMs) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found with id: " + ticketId));
        ticket.setTotalPausedDurationMs(totalPausedDurationMs);
        ticketRepository.save(ticket);
    }
}
