package com.ticket.backend.dto;

import lombok.Data;

@Data
public class AgentLimitUpdateRequest {
    private Integer maxTicketLimit;
}
