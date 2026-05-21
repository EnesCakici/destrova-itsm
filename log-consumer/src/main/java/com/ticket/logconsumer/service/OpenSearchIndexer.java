package com.ticket.logconsumer.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import com.ticket.logconsumer.dto.LogEventDto;

@Service
public class OpenSearchIndexer {

	private static final Logger log = LoggerFactory.getLogger(OpenSearchIndexer.class);

	private final RestTemplate restTemplate;

	@Value("${opensearch.host}")
	private String host;

	@Value("${opensearch.index}")
	private String index;

	public OpenSearchIndexer(RestTemplate restTemplate) {
		this.restTemplate = restTemplate;
	}

	public void index(LogEventDto logEvent) {
		String base = trimTrailingSlash(host);
		String url = base + "/" + index + "/_doc";
		try {
			HttpHeaders headers = new HttpHeaders();
			headers.setContentType(MediaType.APPLICATION_JSON);
			HttpEntity<LogEventDto> entity = new HttpEntity<>(logEvent, headers);
			ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
			if (!response.getStatusCode().is2xxSuccessful()) {
				log.warn("OpenSearch index returned HTTP {} for ticketId={}",
						response.getStatusCode().value(),
						logEvent.getTicketId());
			}
		}
		catch (RestClientException e) {
			log.warn("OpenSearch index failed for ticketId={}: {}",
					logEvent.getTicketId(), e.getMessage());
		}
	}

	private static String trimTrailingSlash(String u) {
		if (u == null || u.isEmpty()) {
			return "";
		}
		return u.endsWith("/") ? u.substring(0, u.length() - 1) : u;
	}
}
