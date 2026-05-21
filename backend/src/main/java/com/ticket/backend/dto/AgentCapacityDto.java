package com.ticket.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@AllArgsConstructor
public class AgentCapacityDto {
    private Long agentId;
    private String agentName;
    private Integer activeTicketCount;
    private Integer maxTicketLimit;
}
