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
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.ResponseEntity;
import com.ticket.backend.exception.JbpmUnavailableException;
import com.ticket.backend.exception.TicketActionConflictException;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
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
            body.put("slaDeadline", slaDeadline != null ? slaDeadline.toString() : "");
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
    public void signalPriorityUpdated(Long ticketId, String newPriority, String slaRemainingDuration) {
        log.warn(">>> DEDEKTİF: JbpmService tetiklendi! TicketID: {}, Beklenen Yeni Priority: {}", ticketId, newPriority);
        try {
            org.springframework.http.HttpHeaders headers = createAuthHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            headers.set("Accept", "application/json");

            // 1. ADIM: Correlation Key (Yaka Kartı) ile jBPM'deki nümerik Process Instance ID'yi buluyoruz (KIE Queries API üzerinden)
            String getInstanceUrl = BASE_URL + "/queries/processes/instance/correlation/" + ticketId;
            org.springframework.http.HttpEntity<Void> getRequest = new org.springframework.http.HttpEntity<>(headers);
            ResponseEntity<Map<String, Object>> instanceResponse = restTemplate.exchange(
                    getInstanceUrl,
                    HttpMethod.GET,
                    getRequest,
                    new ParameterizedTypeReference<Map<String, Object>>() {});
            
            if (instanceResponse.getBody() == null) {
                log.warn("Process instance body is null for correlation key: {}", ticketId);
                return;
            }
            
            // jBPM JSON yanıtından ID'yi güvenlice çek ("id" veya "process-instance-id" olabilir)
            Object idObj = instanceResponse.getBody().get("id");
            if (idObj == null) {
                idObj = instanceResponse.getBody().get("process-instance-id");
            }
            
            if (idObj == null) {
                log.warn("Process instance ID not found in response for correlation key {}. Response: {}", ticketId, instanceResponse.getBody());
                return;
            }
            
            Long processInstanceId = ((Number) idObj).longValue();

            // 2. ADIM: Bulunan net Process Instance ID ile değişkenleri resmi endpoint üzerinden zorla güncelliyoruz
            String varsUrl = BASE_URL + "/containers/" + CONTAINER_ID + "/processes/instances/" + processInstanceId + "/variables";
            java.util.Map<String, Object> varsPayload = new java.util.HashMap<>();
            varsPayload.put("priority", newPriority);
            varsPayload.put("slaRemainingDuration", slaRemainingDuration);
            
            org.springframework.http.HttpEntity<java.util.Map<String, Object>> varsRequest = new org.springframework.http.HttpEntity<>(varsPayload, headers);
            restTemplate.exchange(varsUrl, org.springframework.http.HttpMethod.POST, varsRequest, Void.class);
            log.info("Official variable update successful via Instance ID {} (priority={}, remaining={}) for ticketId={}", 
                     processInstanceId, newPriority, slaRemainingDuration, ticketId);

            // 3. ADIM: Değişkenler veritabanına işlendikten sonra saati yeniden kurması için jBPM döngü sinyalini ateşliyoruz
            String signalUrl = BASE_URL + "/containers/" + CONTAINER_ID + "/processes/instances/" + processInstanceId + "/signal/PRIORITY_UPDATED";
            org.springframework.http.HttpEntity<Void> signalRequest = new org.springframework.http.HttpEntity<>(headers);
            restTemplate.exchange(signalUrl, org.springframework.http.HttpMethod.POST, signalRequest, Void.class);
            log.info("Signal 'PRIORITY_UPDATED' sent successfully to Instance ID {} to trigger loop for ticketId={}", processInstanceId, ticketId);

        } catch (Exception e) {
            log.error("Failed to execute official jBPM variable update and signal flow for ticketId={}: {}", ticketId, e.getMessage());
        }
    }

    @Async
    public void signalPriorityUpdatedBreach(Long ticketId) {
        signalProcess(ticketId, "PRIORITY_UPDATED_BREACH");
    }

    @Async
    public void signalProcess(Long ticketId, String signalName) {
        signalProcess(ticketId, signalName, new HashMap<>());
    }

    @Async
    public void signalProcess(Long ticketId, String signalName, Map<String, Object> variables) {
        try {
            signalProcessSync(ticketId, signalName, variables);
        } catch (Exception e) {
            log.warn("Failed to signal jBPM process for ticketId={} via correlationKey. Signal: {}. Error: {}", ticketId, signalName, e.getMessage());
        }
    }

    /**
     * Synchronous signal for Faz 1 action API — failures propagate to the caller.
     */
    public void signalProcessSync(Long ticketId, String signalName, Map<String, Object> variables) {
        Map<String, Object> body = variables != null ? variables : Map.of();
        try {
            HttpHeaders headers = createAuthHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            if (!body.isEmpty()) {
                Long processInstanceId = resolveProcessInstanceId(ticketId, headers);
                String varsUrl = BASE_URL + "/containers/" + CONTAINER_ID
                        + "/processes/instances/" + processInstanceId + "/variables";
                HttpEntity<Map<String, Object>> varsRequest = new HttpEntity<>(body, headers);
                restTemplate.exchange(varsUrl, HttpMethod.POST, varsRequest, Void.class);
                log.info("Process variables updated via instance ID {} (correlationKey {}) before signal '{}'",
                        processInstanceId, ticketId, signalName);
            }

            String signalUrl = BASE_URL + "/containers/" + CONTAINER_ID
                    + "/processes/instances/correlation/" + ticketId + "/signal/" + signalName;
            HttpEntity<Map<String, Object>> signalRequest = new HttpEntity<>(body, headers);
            restTemplate.exchange(signalUrl, HttpMethod.POST, signalRequest, Void.class);
            log.info("Signal '{}' sent successfully via correlationKey {}", signalName, ticketId);
        } catch (HttpStatusCodeException e) {
            int status = e.getStatusCode().value();
            String detail = e.getResponseBodyAsString();
            log.warn("jBPM signal rejected ticketId={} signal={} http={} body={}", ticketId, signalName, status, detail);
            if (status == 404 || status == 400 || status == 409 || status == 500) {
                throw new TicketActionConflictException(
                        "jBPM rejected signal '" + signalName + "' for ticket " + ticketId, e);
            }
            throw new JbpmUnavailableException("jBPM returned HTTP " + status, e);
        } catch (RestClientException e) {
            log.warn("jBPM unreachable ticketId={} signal={}: {}", ticketId, signalName, e.getMessage());
            throw new JbpmUnavailableException("jBPM is unreachable", e);
        }
    }

    private Long resolveProcessInstanceId(Long correlationKey, HttpHeaders headers) {
        headers.set("Accept", MediaType.APPLICATION_JSON_VALUE);
        String getInstanceUrl = BASE_URL + "/queries/processes/instance/correlation/" + correlationKey;
        HttpEntity<Void> getRequest = new HttpEntity<>(headers);
        ResponseEntity<Map<String, Object>> instanceResponse = restTemplate.exchange(
                getInstanceUrl,
                HttpMethod.GET,
                getRequest,
                new ParameterizedTypeReference<Map<String, Object>>() {});

        Map<String, Object> responseBody = instanceResponse.getBody();
        if (responseBody == null) {
            throw new TicketActionConflictException(
                    "jBPM process instance not found for ticket " + correlationKey);
        }

        Object idObj = responseBody.get("id");
        if (idObj == null) {
            idObj = responseBody.get("process-instance-id");
        }
        if (idObj == null) {
            throw new TicketActionConflictException(
                    "jBPM process instance ID missing for ticket " + correlationKey);
        }

        return ((Number) idObj).longValue();
    }

    private HttpHeaders createAuthHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBasicAuth(USERNAME, PASSWORD);
        return headers;
    }
}