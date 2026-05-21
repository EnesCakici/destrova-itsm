package com.ticket.backend.controller;

import com.ticket.backend.dto.AgentWorklogSummaryDto;
import com.ticket.backend.service.TicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/agent")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('AGENT', 'ADMIN')")
public class AgentAnalyticsController {

    private final TicketService ticketService;

    @GetMapping("/worklog-summary")
    public AgentWorklogSummaryDto getWorklogSummary(
            @RequestParam(defaultValue = "today") String period,
            @RequestParam(required = false) Long productId,
            Authentication authentication
    ) {
        return ticketService.getAgentWorklogSummary(period, productId, authentication);
    }
}