package com.ticket.backend.service;

import java.net.URI;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.ticket.backend.entity.Ticket;
import com.ticket.backend.exception.JbpmUnavailableException;
import com.ticket.backend.exception.TicketActionConflictException;
import com.ticket.backend.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Service
@Slf4j
@RequiredArgsConstructor
public class JbpmService {

    public static final String CONTAINER_ID = "destrova-ticket-process_1.0.0-SNAPSHOT";
    private static final String PROCESS_ID = "destrova-ticket-process.TicketLifecycleProcess";
    private static final String USERNAME = "kieserver";
    private static final String PASSWORD = "kieserver1!";
    private static final Pattern INSTANCE_ID_IN_PATH = Pattern.compile("/instances/(\\d+)");
    private static final int LOOKUP_PAGE_SIZE = 50;
    private static final int LOOKUP_MAX_PAGES = 20;

    private final RestTemplate restTemplate;
    private final TicketRepository ticketRepository;
    private final PlatformTransactionManager transactionManager;

    @Value("${destrova.jbpm.base-url:http://localhost:8180/kie-server/services/rest/server}")
    private String jbpmBaseUrl;

    /** True when the KIE deployment container exists and is STARTED. */
    public boolean isDeploymentReady() {
        try {
            HttpHeaders headers = createAuthHeaders();
            headers.setAccept(List.of(MediaType.APPLICATION_XML, MediaType.APPLICATION_JSON));
            HttpEntity<Void> request = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(
                    jbpmBaseUrl + "/containers/" + CONTAINER_ID,
                    HttpMethod.GET,
                    request,
                    String.class);
            String body = response.getBody();
            return body != null && body.contains("status=\"STARTED\"");
        } catch (Exception e) {
            log.debug("jBPM deployment readiness check failed: {}", e.getMessage());
            return false;
        }
    }

    @Async
    public void startTicketProcess(Long ticketId, String priority, LocalDateTime slaDeadline) {
        startTicketProcessSync(ticketId, priority, slaDeadline);
    }

    /**
     * Starts (or links) the jBPM process for a ticket and persists {@code process_instance_id}.
     * Synchronous so {@code runAfterCommit} can finish before the create response returns.
     */
    public void startTicketProcessSync(Long ticketId, String priority, LocalDateTime slaDeadline) {
        try {
            if (ticketRepository.findById(ticketId).map(Ticket::getProcessInstanceId).orElse(null) != null) {
                log.debug("ticketId={} already has process_instance_id; skipping jBPM start", ticketId);
                return;
            }

            Optional<Long> existing = lookupProcessInstanceId(ticketId);
            if (existing.isPresent()) {
                persistProcessInstanceId(ticketId, existing.get());
                log.info("Linked existing jBPM processInstanceId={} to ticketId={}", existing.get(), ticketId);
                return;
            }

            String url = jbpmBaseUrl + "/containers/" + CONTAINER_ID + "/processes/" + PROCESS_ID
                    + "/instances/correlation/" + ticketId;

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
            headers.setAccept(List.of(MediaType.APPLICATION_JSON, MediaType.TEXT_PLAIN));
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, request, String.class);
            Optional<Long> fromResponse = parseProcessInstanceIdFromStartResponse(response);
            if (fromResponse.isPresent()) {
                persistProcessInstanceId(ticketId, fromResponse.get());
                log.info("Started jBPM process for ticketId={} processInstanceId={}", ticketId, fromResponse.get());
                return;
            }

            recoverProcessInstanceIdAfterStart(ticketId, "successful start with unparsed response")
                    .ifPresentOrElse(
                            id -> log.info("Recovered processInstanceId={} for ticketId={} after start", id, ticketId),
                            () -> log.warn("jBPM process started for ticketId={} but processInstanceId could not be parsed or resolved",
                                    ticketId));
        } catch (HttpStatusCodeException e) {
            int status = e.getStatusCode().value();
            String detail = e.getResponseBodyAsString();
            if (status == 409 || status == 500) {
                log.info("jBPM start for ticketId={} returned HTTP {} — attempting instance recovery. body={}",
                        ticketId, status, detail);
                Optional<Long> recovered = recoverProcessInstanceIdAfterStart(ticketId, "HTTP " + status);
                if (recovered.isPresent()) {
                    return;
                }
                if (isDeploymentUnavailable(detail)) {
                    throw new JbpmUnavailableException(
                            "jBPM deployment container '" + CONTAINER_ID + "' is not available. "
                                    + "Run docker compose up jbpm-init or redeploy the process. Detail: " + detail);
                }
                log.warn("jBPM correlation may be orphaned for ticketId={}: HTTP {} but no active process instance found. "
                                + "Restart the jBPM container if new tickets cannot be assigned. body={}",
                        ticketId, status, detail);
                return;
            }
            if (status == 404 && isDeploymentUnavailable(detail)) {
                throw new JbpmUnavailableException(
                        "jBPM deployment container '" + CONTAINER_ID + "' was not found. Detail: " + detail);
            }
            log.warn("Failed to start jBPM process for ticketId={}: HTTP {} body={}", ticketId, status, detail);
        } catch (JbpmUnavailableException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Failed to start jBPM process for ticketId={}: {}", ticketId, e.getMessage());
        }
    }

    @Async
    public void signalPriorityUpdated(Long ticketId, String newPriority, String slaRemainingDuration) {
        try {
            HttpHeaders headers = createAuthHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Accept", "application/json");

            Long processInstanceId = requireProcessInstanceId(ticketId);

            String varsUrl = jbpmBaseUrl + "/containers/" + CONTAINER_ID + "/processes/instances/" + processInstanceId + "/variables";
            Map<String, Object> varsPayload = new HashMap<>();
            varsPayload.put("priority", newPriority);
            varsPayload.put("slaRemainingDuration", slaRemainingDuration);

            HttpEntity<Map<String, Object>> varsRequest = new HttpEntity<>(varsPayload, headers);
            restTemplate.exchange(varsUrl, HttpMethod.POST, varsRequest, Void.class);
            log.info("Official variable update successful via processInstanceId {} (priority={}, remaining={}) for ticketId={}",
                    processInstanceId, newPriority, slaRemainingDuration, ticketId);

            String signalUrl = jbpmBaseUrl + "/containers/" + CONTAINER_ID + "/processes/instances/" + processInstanceId
                    + "/signal/PRIORITY_UPDATED";
            HttpEntity<Void> signalRequest = new HttpEntity<>(headers);
            restTemplate.exchange(signalUrl, HttpMethod.POST, signalRequest, Void.class);
            log.info("Signal 'PRIORITY_UPDATED' sent to processInstanceId {} for ticketId={}", processInstanceId, ticketId);
        } catch (Exception e) {
            log.error("Failed priority update flow for ticketId={}: {}", ticketId, e.getMessage());
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
            log.warn("Failed to signal jBPM process for ticketId={}. Signal: {}. Error: {}", ticketId, signalName, e.getMessage());
        }
    }

    public void signalProcessSync(Long ticketId, String signalName, Map<String, Object> variables) {
        Map<String, Object> body = variables != null ? variables : Map.of();
        try {
            HttpHeaders headers = createAuthHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Long processInstanceId = requireProcessInstanceId(ticketId);

            if (!body.isEmpty()) {
                String varsUrl = jbpmBaseUrl + "/containers/" + CONTAINER_ID
                        + "/processes/instances/" + processInstanceId + "/variables";
                HttpEntity<Map<String, Object>> varsRequest = new HttpEntity<>(body, headers);
                restTemplate.exchange(varsUrl, HttpMethod.POST, varsRequest, Void.class);
                log.info("Process variables updated via processInstanceId {} (ticketId {}) before signal '{}'",
                        processInstanceId, ticketId, signalName);
            }

            String signalUrl = jbpmBaseUrl + "/containers/" + CONTAINER_ID
                    + "/processes/instances/" + processInstanceId + "/signal/" + signalName;
            HttpEntity<Map<String, Object>> signalRequest = new HttpEntity<>(body, headers);
            restTemplate.exchange(signalUrl, HttpMethod.POST, signalRequest, Void.class);
            log.info("Signal '{}' sent to processInstanceId {} (ticketId {})", signalName, processInstanceId, ticketId);
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

    private Long requireProcessInstanceId(Long ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId).orElse(null);
        if (ticket != null && ticket.getProcessInstanceId() != null) {
            return ticket.getProcessInstanceId();
        }

        Optional<Long> resolved = lookupProcessInstanceId(ticketId);
        if (resolved.isEmpty()) {
            log.error("jBPM process instance id bulunamadi for ticketId={}: process_instance_id is null and lookup failed",
                    ticketId);
            throw new TicketActionConflictException(
                    "jBPM workflow is not linked to ticket " + ticketId
                            + ". Process instance id could not be resolved. "
                            + "The workflow may not have started; try recreating the ticket after restarting jBPM.");
        }

        persistProcessInstanceId(ticketId, resolved.get());
        return resolved.get();
    }

    private Optional<Long> recoverProcessInstanceIdAfterStart(Long ticketId, String reason) {
        Optional<Long> resolved = lookupProcessInstanceId(ticketId);
        resolved.ifPresent(id -> {
            persistProcessInstanceId(ticketId, id);
            log.info("Recovered processInstanceId={} for ticketId={} after {} ", id, ticketId, reason);
        });
        return resolved;
    }

    private void persistProcessInstanceId(Long ticketId, Long processInstanceId) {
        if (processInstanceId == null) {
            return;
        }
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        tx.executeWithoutResult(status -> ticketRepository.findById(ticketId).ifPresentOrElse(
                ticket -> {
                    if (ticket.getProcessInstanceId() == null) {
                        ticket.setProcessInstanceId(processInstanceId);
                        ticketRepository.save(ticket);
                        log.info("Persisted processInstanceId={} for ticketId={}", processInstanceId, ticketId);
                    }
                },
                () -> log.warn("Could not persist processInstanceId={} for ticketId={}: ticket not found in DB",
                        processInstanceId, ticketId)));
    }

    private Optional<Long> lookupProcessInstanceId(Long ticketId) {
        HttpHeaders headers = createAuthHeaders();
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        String ticketIdKey = String.valueOf(ticketId);

        Optional<Long> byVariable = fetchFirstProcessInstanceIdFromList(
                jbpmBaseUrl + "/queries/processes/instances/variables/ticketId?varValue=" + ticketId
                        + "&status=1&page=0&pageSize=1", headers);
        if (byVariable.isPresent()) {
            return byVariable;
        }

        Optional<Long> byQueriesCorrelation = fetchFirstProcessInstanceIdFromList(
                jbpmBaseUrl + "/queries/processes/instances/correlation/" + ticketIdKey
                        + "?status=1&page=0&pageSize=1", headers);
        if (byQueriesCorrelation.isPresent()) {
            return byQueriesCorrelation;
        }

        return scanContainerInstancesByCorrelationKey(ticketIdKey, headers);
    }

    private Optional<Long> scanContainerInstancesByCorrelationKey(String correlationKey, HttpHeaders headers) {
        for (int page = 0; page < LOOKUP_MAX_PAGES; page++) {
            String url = jbpmBaseUrl + "/containers/" + CONTAINER_ID + "/processes/instances?status=1&page=" + page
                    + "&pageSize=" + LOOKUP_PAGE_SIZE;
            Optional<List<Map<String, Object>>> instances = fetchProcessInstanceList(url, headers);
            if (instances.isEmpty() || instances.get().isEmpty()) {
                break;
            }
            for (Map<String, Object> instance : instances.get()) {
                Object correlation = instance.get("correlation-key");
                if (correlation != null && Objects.equals(correlationKey, String.valueOf(correlation))) {
                    return extractProcessInstanceId(instance);
                }
            }
            if (instances.get().size() < LOOKUP_PAGE_SIZE) {
                break;
            }
        }
        log.warn("Could not resolve processInstanceId by correlationKey={}", correlationKey);
        return Optional.empty();
    }

    private Optional<List<Map<String, Object>>> fetchProcessInstanceList(String url, HttpHeaders headers) {
        try {
            HttpEntity<Void> request = new HttpEntity<>(headers);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    request,
                    new ParameterizedTypeReference<Map<String, Object>>() {});
            return Optional.ofNullable(extractProcessInstanceList(response.getBody()));
        } catch (HttpStatusCodeException e) {
            if (e.getStatusCode().value() == 404) {
                return Optional.empty();
            }
            log.warn("jBPM list lookup failed for url={}: HTTP {} body={}",
                    url, e.getStatusCode().value(), e.getResponseBodyAsString());
            return Optional.empty();
        } catch (RestClientException e) {
            log.warn("jBPM list lookup unreachable for url={}: {}", url, e.getMessage());
            return Optional.empty();
        }
    }

    private Optional<Long> fetchFirstProcessInstanceIdFromList(String url, HttpHeaders headers) {
        try {
            HttpEntity<Void> request = new HttpEntity<>(headers);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    request,
                    new ParameterizedTypeReference<Map<String, Object>>() {});
            List<Map<String, Object>> instances = extractProcessInstanceList(response.getBody());
            if (instances.isEmpty()) {
                return Optional.empty();
            }
            return extractProcessInstanceId(instances.get(0));
        } catch (HttpStatusCodeException e) {
            if (e.getStatusCode().value() == 404) {
                log.debug("jBPM lookup returned 404 for url={}", url);
                return Optional.empty();
            }
            log.warn("jBPM lookup failed for url={}: HTTP {} body={}",
                    url, e.getStatusCode().value(), e.getResponseBodyAsString());
            return Optional.empty();
        } catch (RestClientException e) {
            log.warn("jBPM lookup unreachable for url={}: {}", url, e.getMessage());
            return Optional.empty();
        }
    }

    private List<Map<String, Object>> extractProcessInstanceList(Map<String, Object> body) {
        if (body == null) {
            return List.of();
        }
        Object instances = body.get("process-instance");
        if (instances instanceof List<?> list) {
            return list.stream()
                    .filter(Map.class::isInstance)
                    .map(item -> {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> map = (Map<String, Object>) item;
                        return map;
                    })
                    .toList();
        }
        if (instances instanceof Map<?, ?> map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> instanceMap = (Map<String, Object>) map;
            return List.of(instanceMap);
        }
        return List.of();
    }

    private Optional<Long> extractProcessInstanceId(Map<String, Object> body) {
        if (body == null) {
            return Optional.empty();
        }
        Object idObj = body.get("process-instance-id");
        if (idObj == null) {
            idObj = body.get("id");
        }
        if (idObj instanceof Number number) {
            return Optional.of(number.longValue());
        }
        return Optional.empty();
    }

    private Optional<Long> parseProcessInstanceIdFromStartResponse(ResponseEntity<String> response) {
        if (response == null) {
            return Optional.empty();
        }
        String body = response.getBody();
        if (body != null && !body.isBlank()) {
            String trimmed = body.trim();
            if (trimmed.matches("\\d+")) {
                return Optional.of(Long.parseLong(trimmed));
            }
        }
        URI location = response.getHeaders().getLocation();
        if (location != null) {
            Matcher matcher = INSTANCE_ID_IN_PATH.matcher(location.getPath());
            if (matcher.find()) {
                return Optional.of(Long.parseLong(matcher.group(1)));
            }
        }
        List<String> locationHeaders = response.getHeaders().get(HttpHeaders.LOCATION);
        if (locationHeaders != null) {
            for (String locationHeader : locationHeaders) {
                Matcher matcher = INSTANCE_ID_IN_PATH.matcher(locationHeader);
                if (matcher.find()) {
                    return Optional.of(Long.parseLong(matcher.group(1)));
                }
            }
        }
        return Optional.empty();
    }

    private HttpHeaders createAuthHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBasicAuth(USERNAME, PASSWORD);
        return headers;
    }

    private static boolean isDeploymentUnavailable(String body) {
        if (body == null || body.isBlank()) {
            return false;
        }
        String lower = body.toLowerCase();
        return lower.contains("not instantiated")
                || lower.contains("not found")
                || lower.contains("cannot find container");
    }
}
