package com.ticket.backend.controller;

import com.ticket.backend.dto.AgentCapacityDto;
import com.ticket.backend.dto.AgentLimitUpdateRequest;
import com.ticket.backend.dto.DashboardMetricsDto;
import com.ticket.backend.dto.ReportsDto;
import com.ticket.backend.dto.TransferAllRequest;
import com.ticket.backend.entity.Ticket;
import com.ticket.backend.enums.Priority;
import com.ticket.backend.enums.Status;
import com.ticket.backend.service.TicketService;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import java.nio.charset.StandardCharsets;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/manager")
@Tag(name = "Manager", description = "Manager dashboard, reports and capacity endpoints")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
public class ManagerController {

    private final TicketService ticketService;

    /** Dashboard KPI metrikleri — tarih araligina gore. */
    @GetMapping("/dashboard")
    @Operation(summary = "Dashboard metrics", description = "Returns KPI metrics for the selected date range")
    public DashboardMetricsDto getDashboard(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ticketService.getManagerDashboard(startDate, endDate);
    }

    /**
     * Raporlar ekrani icin tarih araligina gore tam performans raporu.
     * GET /api/manager/reports?startDate=2026-04-01&endDate=2026-04-30
     */
    @GetMapping("/reports")
    @Operation(summary = "Performance reports", description = "Returns full performance report for the date range")
    public ReportsDto getReports(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ticketService.getManagerReports(startDate, endDate);
    }

    /**
     * Esnek filtreli ticket listesi — manager All Tickets & agent bazli filtre icin.
     * Tum parametreler opsiyonel; verilmezse filtre uygulanmaz.
     * GET /api/manager/tickets?assigneeId=3&status=IN_PROGRESS&priority=HIGH
     */
    @GetMapping("/tickets")
    @Operation(summary = "Filtered tickets", description = "Returns tickets filtered by assignee, status and priority")
    public List<Ticket> getFilteredTickets(
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) Status status,
            @RequestParam(required = false) Priority priority) {
        return ticketService.getFilteredTickets(assigneeId, status, priority);
    }

    /** Agent kapasite tablosu. */
    @GetMapping("/capacity")
    @Operation(summary = "Agent capacities", description = "Returns agent workload and capacity table")
    public List<AgentCapacityDto> getCapacities() {
        return ticketService.getAgentCapacities();
    }

    /** Belirli bir agent icin ticket limitini gunceller. */
    @PutMapping("/agents/{agentId}/limit")
    @Operation(summary = "Update agent limit", description = "Updates the ticket limit for a specific agent")
    public AgentCapacityDto updateLimit(
            @PathVariable Long agentId,
            @RequestBody AgentLimitUpdateRequest request) {
        return ticketService.updateAgentLimit(agentId, request);
    }

    /** Bir agentin aktif ticketlarini toplu olarak baska agente devreder. */
    @PostMapping("/transfer-all")
    @Operation(summary = "Transfer all tickets", description = "Bulk transfers active tickets from one agent to another")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, Object> transferAll(@RequestBody TransferAllRequest request) {
        int transferred = ticketService.transferAllTickets(request);
        return Map.of("transferredCount", transferred);
    }

    @GetMapping("/reports/export")
    @Operation(summary = "Export reports CSV", description = "Exports performance report as a CSV file")
    public ResponseEntity<byte[]> exportReportsCsv(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        ReportsDto dto = ticketService.getManagerReports(startDate, endDate);
        
        StringBuilder sb = new StringBuilder();
        sb.append("Product,Tickets,Avg Resolution,SLA Met %\n");
        
        if (dto.getProducts() != null) {
            for (ReportsDto.ProductReportRow row : dto.getProducts()) {
                sb.append(escapeCsv(row.getName())).append(",");
                sb.append(row.getTickets()).append(",");
                sb.append(escapeCsv(row.getAvgResolution())).append(",");
                sb.append(row.getSlaMet()).append("\n");
            }
        }
        
        byte[] bytes = sb.toString().getBytes(StandardCharsets.UTF_8);
        String filename = "destrova_report_" + LocalDate.now() + ".csv";
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(bytes);
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
