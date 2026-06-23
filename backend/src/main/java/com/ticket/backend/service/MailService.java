package com.ticket.backend.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private static final String FROM_ADDRESS = "noreply@destrova.com";

    private final JavaMailSender mailSender;
    private final EmailTemplateService emailTemplateService;

    /**
     * Branded HTML email with plain-text fallback (same body string callers already use).
     */
    @Async
    public void sendBrandedEmail(String to, String subject, String body, String actionUrl) {
        try {
            String htmlBody = emailTemplateService.render(subject, body, actionUrl);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper =
                    new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(FROM_ADDRESS);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, htmlBody);
            mailSender.send(message);
        } catch (MessagingException e) {
            log.warn("Failed to send branded email to={}: {}", to, e.getMessage());
        } catch (Exception e) {
            log.warn("Failed to send branded email to={}: {}", to, e.getMessage());
        }
    }

    /** @deprecated use {@link #sendBrandedEmail(String, String, String, String)} */
    @Deprecated
    @Async
    public void sendSimpleEmail(String to, String subject, String body) {
        sendBrandedEmail(to, subject, body, null);
    }
}
