package com.ticket.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Validates {@code X-Webhook-Secret} for jBPM webhook callbacks.
 * Spring Security keeps {@code /api/webhook/**} on permitAll; this filter returns 401 when the secret mismatches.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class WebhookSecretFilter extends OncePerRequestFilter {

    public static final String WEBHOOK_SECRET_HEADER = "X-Webhook-Secret";
    private static final String JBPM_WEBHOOK_PATH_PREFIX = "/api/webhook/jbpm/";

    private final String expectedSecret;

    public WebhookSecretFilter(@Value("${destrova.webhook.secret}") String expectedSecret) {
        this.expectedSecret = expectedSecret;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        if (path == null || path.isEmpty()) {
            path = request.getRequestURI();
        }
        return path == null || !path.startsWith(JBPM_WEBHOOK_PATH_PREFIX);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String provided = request.getHeader(WEBHOOK_SECRET_HEADER);
        if (!secretMatches(provided)) {
            response.sendError(HttpStatus.UNAUTHORIZED.value());
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean secretMatches(String provided) {
        if (expectedSecret == null || provided == null) {
            return false;
        }
        return MessageDigest.isEqual(
                expectedSecret.getBytes(StandardCharsets.UTF_8),
                provided.getBytes(StandardCharsets.UTF_8));
    }
}
