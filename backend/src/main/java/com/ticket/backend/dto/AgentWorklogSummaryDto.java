package com.ticket.backend.dto;

import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AgentWorklogSummaryDto {
    private Integer totalLoggedMinutes;
    private Integer ticketsWorked;
    private Integer avgMinutesPerTicket;
    private Double responseTimeMinutes;

    private List<AgentWorklogActivityDto> activities;
    private List<AgentWorklogDistributionDto> distribution;
    private List<AgentWorklogInsightDto> insights;
}