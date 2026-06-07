package com.ticket.backend.controller;

import com.ticket.backend.dto.AgentCapacityDto;
import com.ticket.backend.dto.AgentWorklogSummaryDto;
import com.ticket.backend.service.TicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/agent")
@Tag(name = "Agent Analytics", description = "Agent workload and capacity analytics")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('AGENT', 'ADMIN')")
public class AgentAnalyticsController {

    private final TicketService ticketService;

    @GetMapping("/worklog-summary")
    @Operation(summary = "Worklog summary", description = "Returns agent worklog summary for a given period")
    public AgentWorklogSummaryDto getWorklogSummary(
            @RequestParam(defaultValue = "today") String period,
            @RequestParam(required = false) Long productId,
            Authentication authentication
    ) {
        return ticketService.getAgentWorklogSummary(period, productId, authentication);
    }

    /** Peer agent list with workload — used for single-ticket transfer picker. */
    @GetMapping("/capacities")
    @Operation(summary = "Peer capacities", description = "Returns peer agents with workload for transfer picker")
    public List<AgentCapacityDto> getPeerCapacities() {
        return ticketService.getAgentCapacities();
    }
}