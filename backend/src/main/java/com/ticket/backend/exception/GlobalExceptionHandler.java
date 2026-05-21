package com.ticket.backend.exception;

import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.security.access.AccessDeniedException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

//Tüm controller’larda oluşan hataları yakalar
@RestControllerAdvice
//Hataları merkezi olarak yakalayan sınıf
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // Kayit bulunamadiginda 404 doner.
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleEntityNotFound(EntityNotFoundException ex) {
        return buildErrorResponse(ex.getMessage(), HttpStatus.NOT_FOUND);
    }

    // Validation hatalarini tek mesaj haline getirip 400 doner. 
    // Kullanıcı geçersiz veri gönderince - zorunlu alan boş,format yanlış
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationErrors(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        if (message.isBlank()) {
            message = "Validation failed.";
        }
        return buildErrorResponse(message, HttpStatus.BAD_REQUEST);
    }

    // Gecersiz arguman / is kurali (client hatasi) 400
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return buildErrorResponse(
                ex.getMessage() != null ? ex.getMessage() : "Invalid request.",
                HttpStatus.BAD_REQUEST);
    }

    // Is kurali kaynakli hatalari 400 olarak doner - agent limiti dolu, kaynak ve hedef agent aynı, kapanış nedeni eksik 
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(IllegalStateException ex) {
        return buildErrorResponse(ex.getMessage(), HttpStatus.BAD_REQUEST);
    }

    // 🆕 YETKİSİZ ERİŞİM HATALARINI 403 OLARAK DÖNER
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        return buildErrorResponse(
            ex.getMessage() != null ? ex.getMessage() : "Bu işlem için yetkiniz bulunmamaktadır.",
            HttpStatus.FORBIDDEN
        );
    }

    // Beklenmeyen hatalar icin genel 500 cevabi.
    //Diğer hiçbir handler yakalamadıysa yakalar
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneralException(Exception ex) {
        log.error("Unhandled exception (returning 500 to client)", ex);
        return buildErrorResponse("Unexpected error occurred.", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Tum hata cevaplarini ayni JSON formatinda uretir.
    private ResponseEntity<Map<String, Object>> buildErrorResponse(String message, HttpStatus status) {
        //Boş bir map oluştur
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", message);
        response.put("status", status.value());
        response.put("timestamp", LocalDateTime.now());
        return ResponseEntity.status(status).body(response);
    }
}
