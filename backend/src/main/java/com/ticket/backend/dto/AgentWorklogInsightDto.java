package com.ticket.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AgentWorklogInsightDto {
    private String label;
    private String value;
}