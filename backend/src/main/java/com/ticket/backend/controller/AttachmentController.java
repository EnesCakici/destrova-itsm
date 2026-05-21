package com.ticket.backend.controller;

import com.ticket.backend.entity.Attachment;
import com.ticket.backend.service.AttachmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

@RestController
@RequestMapping("/api/tickets/{ticketId}/attachments")
@RequiredArgsConstructor
public class AttachmentController {

    private final AttachmentService attachmentService;

    // 📌 Upload
    @PostMapping
    @PreAuthorize("hasAnyRole('CUSTOMER','AGENT','MANAGER','ADMIN')")
    public ResponseEntity<Attachment> uploadAttachment(
            @PathVariable Long ticketId,
            @RequestParam("file") MultipartFile file) throws IOException {

        Attachment attachment = attachmentService.uploadFile(ticketId, file);
        return ResponseEntity.status(201).body(attachment);
    }

    // 📌 Liste
    @GetMapping
    @PreAuthorize("hasAnyRole('CUSTOMER','AGENT','MANAGER','ADMIN')")
    public ResponseEntity<List<Attachment>> getAttachments(@PathVariable Long ticketId) {
        return ResponseEntity.ok(attachmentService.getAttachmentsByTicketId(ticketId));
    }

    // 📌 Download
    @GetMapping("/{attachmentId}")
    @PreAuthorize("hasAnyRole('CUSTOMER','AGENT','MANAGER','ADMIN')")
    public ResponseEntity<Resource> downloadAttachment(
            @PathVariable Long ticketId,
            @PathVariable Long attachmentId) throws IOException {

        Attachment attachment =
                attachmentService.getAttachmentForDownload(ticketId, attachmentId);

        Path filePath =
                attachmentService.getAttachmentPath(ticketId, attachmentId);

        Resource resource = new UrlResource(filePath.toUri());

        if (!resource.exists() || !resource.isReadable()) {
            throw new RuntimeException("Dosya bulunamadı veya okunamıyor.");
        }

        String safeFileName = sanitizeForHeader(attachment.getFileName());

        String contentType = attachment.getFileType();
        if (contentType == null) {
            contentType = "application/octet-stream";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + safeFileName + "\"")
                .header("X-Content-Type-Options", "nosniff")
                .body(resource);
    }

    // 📌 Delete
    @DeleteMapping("/{attachmentId}")
    @PreAuthorize("hasAnyRole('CUSTOMER','AGENT','MANAGER','ADMIN')")
    public ResponseEntity<Void> deleteAttachment(
            @PathVariable Long ticketId,
            @PathVariable Long attachmentId) throws IOException {

        attachmentService.deleteAttachment(ticketId, attachmentId);
        return ResponseEntity.noContent().build();
    }

    // 🔐 Header sanitize
    private String sanitizeForHeader(String filename) {
        if (filename == null || filename.isBlank()) {
            return "dosya";
        }
        return filename.replaceAll("[\\r\\n\"]", "_");
    }
}