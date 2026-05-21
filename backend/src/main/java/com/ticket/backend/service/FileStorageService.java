package com.ticket.backend.service;

import org.springframework.stereotype.Service;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.List;
import java.util.UUID;
import java.io.IOException;
import org.apache.tika.Tika;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileStorageService {

    private final Path uploadRoot = Paths.get("uploads").toAbsolutePath().normalize();
    private final Tika tika = new Tika();

    // İzin verilen MIME tipleri
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "application/pdf",
            "text/plain",
            "application/zip",
            "application/x-zip-compressed"
    );

    // Yasaklı kelimeler (içerik filtresi)
    private static final List<String> FORBIDDEN_WORDS = List.of(
            "malware", "virus", "trojan", "exploit", "hack",
            "password", "passwd", "shadow", "keylogger",
            "<script", "<?php", "eval(", "system(", "exec(",
            "rm -rf", "format c:", "shutdown"
    );

    // Dosya kaydı sonucu (path + mime type)
    public record StoredFile(String path, String mimeType) {}

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024;

    public FileStorageService() throws IOException {
        Files.createDirectories(uploadRoot);
    }

    /**
     * Ana metod: Dosyayı valide eder ve güvenli şekilde kaydeder
     * @return Kaydedilen dosyanın adı (UUID + extension)
     */
    public StoredFile storeFile(MultipartFile file, Long ticketId) throws IOException {
        // 1. Boş dosya kontrolü
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Dosya boş olamaz.");
        }

        // 2. Boyut kontrolü
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Dosya boyutu çok büyük (max 10MB).");
        }

        // 3. Orijinal dosya adı
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new IllegalArgumentException("Geçersiz dosya adı.");
        }

        // 4. Path Traversal koruması
        Path normalized = Paths.get(originalFilename).normalize();
        if (normalized.toString().contains("..")) {
            throw new IllegalArgumentException("Geçersiz dosya yolu.");
        }

        // 5. Gerçek MIME type tespiti (Tika ile) 
        // Tika ile dosya tipini tespit et
        String detectedType = tika.detect(file.getInputStream());
        if (!ALLOWED_MIME_TYPES.contains(detectedType)) {
            throw new IllegalArgumentException("Desteklenmeyen dosya türü: " + detectedType);
        }

        // 6. Extension çıkar ve MIME ile uyumunu kontrol et
        String extension = getFileExtension(originalFilename);
        if (extension.isBlank()) {
            throw new IllegalArgumentException("Dosya uzantısı zorunludur.");
        }
        if (!isExtensionMatchingMime(extension, detectedType)) {
            throw new IllegalArgumentException("Dosya uzantısı ile içeriği uyuşmuyor.");
        }

        // 7. İçerik filtresi (sadece text dosyaları için)
        if (detectedType != null && detectedType.startsWith("text/")) {
            validateFileContent(file);
        }

        // 8. Güvenli dosya adı oluştur (ticketId'li klasör yapısı)
        Path ticketDir = uploadRoot.resolve("tickets").resolve(ticketId.toString());
        Files.createDirectories(ticketDir);
        
        String safeFileName = UUID.randomUUID().toString() + extension;
        Path targetLocation = ticketDir.resolve(safeFileName).normalize();

        // 9. Upload root dışına çıkışı engelle
        if (!targetLocation.startsWith(uploadRoot)) {
            throw new IllegalArgumentException("Geçersiz dosya yolu.");
        }

        // 10. Dosyayı kaydet
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

        // DB'ye kaydedilecek path (göreceli yol)
        return new StoredFile(
            "tickets/" + ticketId + "/" + safeFileName,
            detectedType
        );
    }

    /**
     * Dosya içeriğinde yasaklı kelime kontrolü
     */
    private void validateFileContent(MultipartFile file) throws IOException {
        String content = new String(file.getBytes(), StandardCharsets.UTF_8);
        String lowerContent = content.toLowerCase();

        for (String word : FORBIDDEN_WORDS) {
            if (lowerContent.contains(word.toLowerCase())) {
                throw new IllegalArgumentException("Dosya içeriğinde yasaklı ifade tespit edildi.");
            }
        }
    }

    /**
     * Dosyayı fiziksel olarak sil
     */
    public void deleteFile(String filePath) throws IOException {
        Path fullPath = uploadRoot.resolve(filePath).normalize();
        
        // Güvenlik: Sadece uploads/ altındaki dosyalar silinebilir
        if (!fullPath.startsWith(uploadRoot)) {
            throw new IllegalArgumentException("Geçersiz dosya yolu.");
        }
        
        Files.deleteIfExists(fullPath);
    }

    /**
     * Dosya uzantısını çıkar
     */
    private String getFileExtension(String fileName) {
        int lastDot = fileName.lastIndexOf(".");
        return (lastDot == -1) ? "" : fileName.substring(lastDot).toLowerCase();
    }

    /**
     * MIME ile extension eşleşiyor mu kontrol et
     */
    private boolean isExtensionMatchingMime(String ext, String mime) {
        return switch (mime) {
            case "image/jpeg" -> ext.equals(".jpg") || ext.equals(".jpeg");
            case "image/png" -> ext.equals(".png");
            case "application/pdf" -> ext.equals(".pdf");
            case "text/plain" -> ext.equals(".txt") || ext.equals(".log");
            case "application/zip", "application/x-zip-compressed" -> ext.equals(".zip");
            default -> false;
        };
    }
}
