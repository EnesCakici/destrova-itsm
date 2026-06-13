package com.ticket.backend.service;

import com.ticket.backend.entity.Attachment;
import com.ticket.backend.entity.Ticket;
import com.ticket.backend.repository.AttachmentRepository;
import com.ticket.backend.repository.TicketRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AttachmentService {

    private final AttachmentRepository attachmentRepository;
    private final TicketRepository ticketRepository;
    private final FileStorageService fileStorageService;
    private final AppUserService appUserService;

    // ========== AUTH HELPERS ==========
    
    /**
     * 🔐 JWT'den mevcut kullanıcının Keycloak sub (UUID) değerini al
     */
    private String getCurrentUserSub() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new AccessDeniedException("You are not signed in.");
        }
        Jwt jwt = (Jwt) auth.getPrincipal();
        return jwt.getSubject(); // Keycloak sub (UUID)
    }

    /**
     * 🔐 Mevcut kullanıcının belirli bir rolü var mı?
     */
    private boolean hasRole(String role) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        
        String springRole = "ROLE_" + role;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(springRole) || 
                               a.getAuthority().equals(role));
    }

    /**
     * 🔐 Ticket erişim kontrolü (CUSTOMER sadece kendi ticket'ına)
     * NOT: creatorId String olmalı (Keycloak sub ile eşleşecek)
     */
    private void checkTicketAccess(Ticket ticket, boolean writeOperation) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new AccessDeniedException("You are not signed in.");
        }

        if (hasRole("ADMIN") || hasRole("MANAGER")) {
            return;
        }

        if (isCustomerOnly()) {
            assertCustomerOwnsTicket(ticket, auth);
            return;
        }

        if (hasRole("AGENT")) {
            if (!writeOperation) {
                return;
            }
            Long currentUserId = appUserService.requireUserId(auth);
            if (ticket.getAssigneeId() == null || !ticket.getAssigneeId().equals(currentUserId)) {
                throw new AccessDeniedException("Only the assigned agent can upload or delete attachments.");
            }
        }
    }

    private void assertCustomerOwnsTicket(Ticket ticket, Authentication auth) {
        String currentUserSub = getCurrentUserSub();
        Long currentUserId = appUserService.requireUserId(auth);

        boolean subMatches = ticket.getCreatorSub() != null && ticket.getCreatorSub().equals(currentUserSub);
        boolean idMatches = ticket.getCreatorId() != null && ticket.getCreatorId().equals(currentUserId);
        if (!subMatches && !idMatches) {
            throw new AccessDeniedException("You do not have access to this ticket.");
        }
    }

    private boolean isCustomerOnly() {
        return hasRole("CUSTOMER")
                && !hasRole("AGENT")
                && !hasRole("MANAGER")
                && !hasRole("ADMIN");
    }

    // Dosya adını temizle (boş veya geçersiz karakterleri kaldır)
    private String sanitizeFileName(String name) {
        if (name == null || name.isBlank()) {
            return "unknown_file";
        }
        return name.replaceAll("[^a-zA-Z0-9\\.\\-_]", "_");
    }

    // ========== BUSINESS METHODS ==========

    /**
     * 📌 Dosya yükleme (userId JWT'den alınır)
     */
    private static final int MAX_FILES_PER_USER_PER_TICKET = 5;

    @Transactional
    public Attachment uploadFile(Long ticketId, MultipartFile file, boolean requestedInternal) throws IOException {

        String uploaderSub = getCurrentUserSub();
        long count = attachmentRepository.countByTicketIdAndUploadedBySub(ticketId, uploaderSub);
        if (count >= MAX_FILES_PER_USER_PER_TICKET) {
            throw new IllegalArgumentException(
                    "You can upload a maximum of " + MAX_FILES_PER_USER_PER_TICKET + " files per ticket.");
        }

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found: " + ticketId));

        checkTicketAccess(ticket, true);

        boolean isInternal = resolveInternalFlag(requestedInternal);

        FileStorageService.StoredFile stored = fileStorageService.storeFile(file, ticketId);

        Attachment attachment = Attachment.builder()
                .ticketId(ticketId)
                .fileName(sanitizeFileName(file.getOriginalFilename()))
                .filePath(stored.path())
                .fileType(stored.mimeType())
                .fileSize(file.getSize())
                .uploadedBySub(uploaderSub)
                .isInternal(isInternal)
                .build();

        return attachmentRepository.save(attachment);
    }

    private boolean resolveInternalFlag(boolean requestedInternal) {
        if (!requestedInternal) {
            return false;
        }
        if (isCustomerOnly()) {
            throw new AccessDeniedException("Customers cannot upload internal attachments.");
        }
        if (hasRole("AGENT") || hasRole("MANAGER") || hasRole("ADMIN")) {
            return true;
        }
        throw new AccessDeniedException("You cannot upload internal attachments.");
    }

    /**
     * 📌 Ticket'a ait dosyaları getir
     */
    @Transactional(readOnly = true)
    public List<Attachment> getAttachmentsByTicketId(Long ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found: " + ticketId));

        checkTicketAccess(ticket, false);
        if (isCustomerOnly()) {
            return attachmentRepository.findByTicketIdAndIsInternalFalse(ticketId);
        }
        return attachmentRepository.findByTicketId(ticketId);
    }

    /**
     * 📌 Dosya silme
     */
    @Transactional
    public void deleteAttachment(Long ticketId, Long attachmentId) throws IOException {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found"));

        checkTicketAccess(ticket, true);

        Attachment attachment = getAttachment(ticketId, attachmentId);

        // 📁 Fiziksel dosyayı sil
        fileStorageService.deleteFile(attachment.getFilePath());

        // 🗑️ DB'den sil
        attachmentRepository.delete(attachment);
    }

    /**
     * 📌 Download için path döner
     */
    @Transactional(readOnly = true)
    public Path getAttachmentPath(Long ticketId, Long attachmentId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found"));

        checkTicketAccess(ticket, false);

        Attachment attachment = getAttachment(ticketId, attachmentId);
        assertCustomerCanViewAttachment(attachment);
        return Path.of("uploads").resolve(attachment.getFilePath()).normalize();
    }

    @Transactional(readOnly = true)
    public Attachment getAttachmentForDownload(Long ticketId, Long attachmentId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket not found"));

        checkTicketAccess(ticket, false);

        Attachment attachment = getAttachment(ticketId, attachmentId);
        assertCustomerCanViewAttachment(attachment);
        return attachment;
    }

    private void assertCustomerCanViewAttachment(Attachment attachment) {
        if (isCustomerOnly() && Boolean.TRUE.equals(attachment.getIsInternal())) {
            throw new AccessDeniedException("You do not have access to this attachment.");
        }
    }

    /**
     * 📌 Internal helper
     */
    private Attachment getAttachment(Long ticketId, Long attachmentId) {
        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new EntityNotFoundException("Attachment not found: " + attachmentId));

        if (!attachment.getTicketId().equals(ticketId)) {
            throw new IllegalArgumentException("File does not belong to this ticket.");
        }

        return attachment;
    }
}