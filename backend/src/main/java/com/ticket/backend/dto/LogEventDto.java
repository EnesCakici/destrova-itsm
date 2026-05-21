package com.ticket.backend.dto;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LogEventDto {

	public static final String SERVICE_NAME_DESTROVA_BACKEND = "destrova-backend";

	private Instant timestamp;
	private String level;
	private String action;
	private Long ticketId;
	private Long userId;
	private String message;

	@Builder.Default
	private String serviceName = SERVICE_NAME_DESTROVA_BACKEND;
}
