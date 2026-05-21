package com.ticket.backend.service;

import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.ticket.backend.config.KafkaProducerConfig;
import com.ticket.backend.dto.LogEventDto;

@Service
public class KafkaLogProducer {

	private static final Logger log = LoggerFactory.getLogger(KafkaLogProducer.class);

	private final KafkaTemplate<String, LogEventDto> kafkaTemplate;

	public KafkaLogProducer(
			@Qualifier("logEventKafkaTemplate") KafkaTemplate<String, LogEventDto> kafkaTemplate) {
		this.kafkaTemplate = kafkaTemplate;
	}

	@Async
	public void sendLog(LogEventDto event) {
		try {
			String key = event.getTicketId() != null ? String.valueOf(event.getTicketId()) : null;
			kafkaTemplate.send(KafkaProducerConfig.DESTROVA_LOGS_TOPIC, key, event).get(30, TimeUnit.SECONDS);
		}
		catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			log.warn("Kafka log send interrupted: {}", e.getMessage());
		}
		catch (Exception e) {
			log.warn("Kafka log send failed: {}", e.getMessage());
		}
	}
}
