package com.ticket.backend.service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@Slf4j
@RequiredArgsConstructor
public class JbpmService {

    private static final String BASE_URL = "http://localhost:8180/kie-server/services/rest/server";
    private static final String CONTAINER_ID = "destrova-ticket-process_1.0.0-SNAPSHOT";
    private static final String PROCESS_ID = "destrova-ticket-process.TicketLifecycleProcess";
    private static final String USERNAME = "kieserver";
    private static final String PASSWORD = "kieserver1!";

    private final RestTemplate restTemplate;

    @Async
    public void startTicketProcess(Long ticketId, String priority, LocalDateTime slaDeadline) {
        try {
            // YAKA KARTI TAKIYORUZ: correlationKey = ticketId
            String url = BASE_URL + "/containers/" + CONTAINER_ID + "/processes/" + PROCESS_ID + "/instances/correlation/" + ticketId;

            Map<String, Object> body = new HashMap<>();
            body.put("ticketId", ticketId);
            body.put("priority", priority);
            body.put("currentStatus", "NEW");
            body.put("slaStartedAt", Instant.now().toString());
            body.put("slaDeadline", slaDeadline.toString());
            body.put("slaPaused", false);
            body.put("totalPausedDuration", 0);

            HttpHeaders headers = createAuthHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, request, String.class);
            if (response.getBody() != null) {
                log.info("Started jBPM process with correlationKey {} (Instance ID: {})", ticketId, response.getBody().trim());
            }
        } catch (Exception e) {
            log.warn("Failed to start jBPM process for ticketId={}: {}", ticketId, e.getMessage());
        }
    }

    @Async
    public void signalProcess(Long ticketId, String signalName) {
        signalProcess(ticketId, signalName, new HashMap<>());
    }

    @Async
    public void signalProcess(Long ticketId, String signalName, Map<String, Object> variables) {
        try {
            // ARAMAYA GEREK YOK: Sinyali doğrudan Yaka Kartı (Correlation Key) üzerinden gönder!
            String url = BASE_URL + "/containers/" + CONTAINER_ID + "/processes/instances/correlation/" + ticketId + "/signal/" + signalName;

            HttpHeaders headers = createAuthHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(variables, headers);

            restTemplate.exchange(url, HttpMethod.POST, request, Void.class);
            log.info("Signal '{}' sent successfully via correlationKey {}", signalName, ticketId);

        } catch (Exception e) {
            log.warn("Failed to signal jBPM process for ticketId={} via correlationKey. Signal: {}. Error: {}", ticketId, signalName, e.getMessage());
        }
    }

    private HttpHeaders createAuthHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBasicAuth(USERNAME, PASSWORD);
        return headers;
    }
}