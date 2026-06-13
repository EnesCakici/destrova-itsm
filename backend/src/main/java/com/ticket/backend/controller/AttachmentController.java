package com.ticket.backend.controller;

import com.ticket.backend.entity.Attachment;
import com.ticket.backend.service.AttachmentService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/tickets/{ticketId}/attachments")
@Tag(name = "Attachments", description = "Ticket file attachment endpoints")
@RequiredArgsConstructor
public class AttachmentController {

    private final AttachmentService attachmentService;

    // 📌 Upload
    @PostMapping
    @Operation(summary = "Upload attachment", description = "Uploads a file attachment to a ticket")
    @PreAuthorize("hasAnyRole('CUSTOMER','AGENT','MANAGER','ADMIN')")
    public ResponseEntity<Attachment> uploadAttachment(
            @PathVariable Long ticketId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "internal", defaultValue = "false") boolean internal) throws IOException {

        // 1. Uzantı kontrolü
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Could not read the file name.");
        }
        String ext = originalFilename.toLowerCase();
        List<String> allowedExtensions = List.of(".jpg", ".jpeg", ".png", ".pdf", ".txt", ".log", ".zip");
        boolean validExt = allowedExtensions.stream().anyMatch(ext::endsWith);
        if (!validExt) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This file type is not allowed. Allowed: jpg, jpeg, png, pdf, txt, log, zip");
        }

        // 2. Boyut kontrolü (10 MB)
        if (file.getSize() > 10L * 1024 * 1024) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "File size cannot exceed 10 MB.");
        }

        Attachment attachment = attachmentService.uploadFile(ticketId, file, internal);
        return ResponseEntity.status(201).body(attachment);
    }

    // 📌 Liste
    @GetMapping
    @Operation(summary = "List attachments", description = "Returns all attachments for a ticket")
    @PreAuthorize("hasAnyRole('CUSTOMER','AGENT','MANAGER','ADMIN')")
    public ResponseEntity<List<Attachment>> getAttachments(@PathVariable Long ticketId) {
        return ResponseEntity.ok(attachmentService.getAttachmentsByTicketId(ticketId));
    }

    // 📌 Download
    @GetMapping("/{attachmentId}")
    @Operation(summary = "Download attachment", description = "Downloads a ticket attachment file")
    @PreAuthorize("hasAnyRole('CUSTOMER','AGENT','MANAGER','ADMIN')")
    public ResponseEntity<Resource> downloadAttachment(
            @PathVariable Long ticketId,
            @PathVariable Long attachmentId) throws IOException {

        Attachment attachment =
                attachmentService.getAttachmentForDownload(ticketId, attachmentId);

        Path filePath =
                attachmentService.getAttachmentPath(ticketId, attachmentId);

        Resource resource = new FileSystemResource(filePath);

        if (!resource.exists() || !resource.isReadable()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Attachment file is missing on the server.");
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
    @Operation(summary = "Delete attachment", description = "Deletes an attachment from a ticket")
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
            return "file";
        }
        return filename.replaceAll("[\\r\\n\"]", "_");
    }
}