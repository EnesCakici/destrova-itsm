package com.ticket.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AgentWorklogDistributionDto {
    private String key;   // reply, internal, worklog
    private String label; // Reply, Internal, Worklog
    private Integer count;
    private Integer minutes;
    private Integer pct;
}