package com.ticket.logconsumer.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import com.ticket.logconsumer.config.KafkaConsumerConfig;
import com.ticket.logconsumer.dto.LogEventDto;

@Service
public class LogConsumerService {

	private static final Logger log = LoggerFactory.getLogger(LogConsumerService.class);

	private final OpenSearchIndexer openSearchIndexer;

	public LogConsumerService(OpenSearchIndexer openSearchIndexer) {
		this.openSearchIndexer = openSearchIndexer;
	}

	@KafkaListener(topics = "destrova-logs", containerFactory = KafkaConsumerConfig.LOG_LISTENER_FACTORY)
	public void onLog(LogEventDto payload) {
		try {
			openSearchIndexer.index(payload);
		}
		catch (Exception e) {
			log.warn("Failed to process log event (ticketId={}): {}",
					payload != null ? payload.getTicketId() : null, e.getMessage());
		}
	}
}
