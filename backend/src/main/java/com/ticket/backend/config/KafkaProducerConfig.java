package com.ticket.backend.config;

import java.util.HashMap;
import java.util.Map;

import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JacksonJsonSerializer;

import tools.jackson.databind.cfg.DateTimeFeature;
import tools.jackson.databind.json.JsonMapper;

import com.ticket.backend.dto.LogEventDto;

@Configuration
public class KafkaProducerConfig {

	public static final String DESTROVA_LOGS_TOPIC = "destrova-logs";

	@Value("${spring.kafka.bootstrap-servers}")
	private String bootstrapServers;

	@Bean(name = "logEventProducerFactory")
	public ProducerFactory<String, LogEventDto> logEventProducerFactory() {
		Map<String, Object> config = new HashMap<>();
		config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
		config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
		JsonMapper mapper = JsonMapper.builder()
				.findAndAddModules()
				.disable(DateTimeFeature.WRITE_DATES_AS_TIMESTAMPS)
				.build();
		JacksonJsonSerializer<LogEventDto> valueSerializer = new JacksonJsonSerializer<>(mapper);
		valueSerializer.setAddTypeInfo(false);
		return new DefaultKafkaProducerFactory<>(config, new StringSerializer(), valueSerializer);
	}

	@Bean(name = "logEventKafkaTemplate")
	public KafkaTemplate<String, LogEventDto> logEventKafkaTemplate(
			@Qualifier("logEventProducerFactory") ProducerFactory<String, LogEventDto> logEventProducerFactory) {
		return new KafkaTemplate<>(logEventProducerFactory);
	}
}
