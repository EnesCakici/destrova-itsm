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
            throw new AccessDeniedException("Kullanıcı giriş yapmamış.");
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
            throw new AccessDeniedException("Kullanıcı giriş yapmamış.");
        }

        if (hasRole("ADMIN")) {
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
                throw new AccessDeniedException("Sadece atanmis agent attachment yukleyebilir veya silebilir.");
            }
            return;
        }
    }

    private void assertCustomerOwnsTicket(Ticket ticket, Authentication auth) {
        String currentUserSub = getCurrentUserSub();
        Long currentUserId = appUserService.requireUserId(auth);

        boolean subMatches = ticket.getCreatorSub() != null && ticket.getCreatorSub().equals(currentUserSub);
        boolean idMatches = ticket.getCreatorId() != null && ticket.getCreatorId().equals(currentUserId);
        if (!subMatches && !idMatches) {
            throw new AccessDeniedException("Bu ticket'a erişim yetkiniz yok.");
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
    @Transactional
    public Attachment uploadFile(Long ticketId, MultipartFile file) throws IOException {

        long count = attachmentRepository.countByTicketId(ticketId);
        if (count >= 5) {
            throw new IllegalArgumentException("Maksimum 5 dosya yüklenebilir.");
        }

        // 1️⃣ Ticket var mı?
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket bulunamadı: " + ticketId));

        // 2️⃣ 🔐 Yetki kontrolü
        checkTicketAccess(ticket, true);

        FileStorageService.StoredFile stored = fileStorageService.storeFile(file, ticketId);

        // 4️⃣ 📊 Metadata oluştur (MIME tipi Tika'dan geliyor, client'a güvenme)
        Attachment attachment = Attachment.builder()
                .ticketId(ticketId)
                .fileName(sanitizeFileName(file.getOriginalFilename()))
                .filePath(stored.path())
                .fileType(stored.mimeType()) // MIME tipi
                .fileSize(file.getSize())
                .uploadedBySub(getCurrentUserSub()) // Keycloak sub
                .build();

        return attachmentRepository.save(attachment);

        
    }

    /**
     * 📌 Ticket'a ait dosyaları getir
     */
    @Transactional(readOnly = true)
    public List<Attachment> getAttachmentsByTicketId(Long ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket bulunamadı: " + ticketId));

        checkTicketAccess(ticket, false);
        return attachmentRepository.findByTicketId(ticketId);
    }

    /**
     * 📌 Dosya silme
     */
    @Transactional
    public void deleteAttachment(Long ticketId, Long attachmentId) throws IOException {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket bulunamadı"));

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
                .orElseThrow(() -> new EntityNotFoundException("Ticket bulunamadı"));

        checkTicketAccess(ticket, false);

        Attachment attachment = getAttachment(ticketId, attachmentId);
        return Path.of("uploads").resolve(attachment.getFilePath()).normalize();
    }

    //metadata - fileName - fileType DB bilgisi
    @Transactional(readOnly = true)
    public Attachment getAttachmentForDownload(Long ticketId, Long attachmentId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new EntityNotFoundException("Ticket bulunamadı"));

        checkTicketAccess(ticket, false);

        return getAttachment(ticketId, attachmentId);
    }

    /**
     * 📌 Internal helper
     */
    private Attachment getAttachment(Long ticketId, Long attachmentId) {
        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new EntityNotFoundException("Dosya bulunamadı: " + attachmentId));

        if (!attachment.getTicketId().equals(ticketId)) {
            throw new IllegalArgumentException("Dosya bu bilete ait değil.");
        }

        return attachment;
    }
}