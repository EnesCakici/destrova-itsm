package com.ticket.logconsumer.config;

import java.util.HashMap;
import java.util.Map;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.support.serializer.JsonDeserializer;

import com.ticket.logconsumer.dto.LogEventDto;

@Configuration
public class KafkaConsumerConfig {

	public static final String LOG_LISTENER_FACTORY = "logEventKafkaListenerContainerFactory";

	@Value("${spring.kafka.bootstrap-servers}")
	private String bootstrapServers;

	@Value("${spring.kafka.consumer.group-id}")
	private String groupId;

	@Value("${spring.kafka.consumer.auto-offset-reset}")
	private String autoOffsetReset;

	@Bean(name = "logEventConsumerFactory")
	public ConsumerFactory<String, LogEventDto> logEventConsumerFactory() {
		JsonDeserializer<LogEventDto> valueDeserializer = new JsonDeserializer<>(LogEventDto.class);
		valueDeserializer.addTrustedPackages("*");
		valueDeserializer.ignoreTypeHeaders();

		Map<String, Object> props = new HashMap<>();
		props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
		props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
		props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, autoOffsetReset);

		return new DefaultKafkaConsumerFactory<>(props, new StringDeserializer(), valueDeserializer);
	}

	@Bean(name = LOG_LISTENER_FACTORY)
	public ConcurrentKafkaListenerContainerFactory<String, LogEventDto> logEventKafkaListenerContainerFactory(
			@Qualifier("logEventConsumerFactory") ConsumerFactory<String, LogEventDto> logEventConsumerFactory) {
		ConcurrentKafkaListenerContainerFactory<String, LogEventDto> factory =
				new ConcurrentKafkaListenerContainerFactory<>();
		factory.setConsumerFactory(logEventConsumerFactory);
		return factory;
	}
}
