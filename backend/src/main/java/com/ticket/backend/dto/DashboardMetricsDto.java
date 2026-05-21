package com.ticket.backend.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@AllArgsConstructor
public class DashboardMetricsDto {
    private Integer openTickets;
    private Integer slaViolations;
    private Integer atRiskTickets;
    private Double averageResolutionHours;
    private Double slaCompliancePercent;
    private List<ChartSliceDto> statusDistribution;
    private List<ChartSliceDto> closureReasonDistribution;
    private List<WeeklyFlowDto> weeklyFlow;
}
