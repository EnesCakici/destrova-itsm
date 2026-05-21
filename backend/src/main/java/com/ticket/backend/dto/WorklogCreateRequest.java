package com.ticket.backend.dto;

import lombok.Data;

@Data
public class WorklogCreateRequest {
    //private Long agentId;
    private Integer durationMinutes;
    private String description;
}
