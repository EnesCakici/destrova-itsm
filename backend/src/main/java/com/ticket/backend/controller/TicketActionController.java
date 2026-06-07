package com.ticket.backend.controller;

import com.ticket.backend.dto.action.ActionAcceptedResponse;
import com.ticket.backend.dto.action.AssignActionRequest;
import com.ticket.backend.dto.action.ChangePriorityActionRequest;
import com.ticket.backend.dto.action.CloseActionRequest;
import com.ticket.backend.dto.action.RejectActionRequest;
import com.ticket.backend.dto.action.ResolveActionRequest;
import com.ticket.backend.service.TicketActionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/tickets/{id}/actions")
@Tag(name = "Ticket Actions", description = "Async workflow actions for tickets")
@RequiredArgsConstructor
public class TicketActionController {

    private final TicketActionService ticketActionService;

    @PostMapping("/assign")
    @Operation(summary = "Assign action", description = "Triggers async assign workflow action")
    @PreAuthorize("hasAnyRole('AGENT', 'MANAGER', 'ADMIN')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ActionAcceptedResponse assign(
            @PathVariable Long id,
            @RequestBody AssignActionRequest request,
            Authentication authentication) {
        return ticketActionService.assign(id, request, authentication);
    }

    @PostMapping("/unassign")
    @Operation(summary = "Unassign action", description = "Removes the current assignee from the ticket")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ActionAcceptedResponse unassign(@PathVariable Long id, Authentication authentication) {
        return ticketActionService.unassign(id, authentication);
    }

    @PostMapping("/wait-for-customer")
    @Operation(summary = "Wait for customer", description = "Pauses the ticket while waiting for customer input")
    @PreAuthorize("hasAnyRole('AGENT', 'MANAGER', 'ADMIN')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ActionAcceptedResponse waitForCustomer(@PathVariable Long id, Authentication authentication) {
        return ticketActionService.waitForCustomer(id, authentication);
    }

    @PostMapping("/resume")
    @Operation(summary = "Resume ticket", description = "Resumes a ticket from waiting-for-customer state")
    @PreAuthorize("hasAnyRole('AGENT', 'MANAGER', 'ADMIN', 'CUSTOMER')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ActionAcceptedResponse resume(@PathVariable Long id, Authentication authentication) {
        return ticketActionService.resume(id, authentication);
    }

    @PostMapping("/resolve")
    @Operation(summary = "Resolve ticket", description = "Marks the ticket as resolved")
    @PreAuthorize("hasAnyRole('AGENT', 'MANAGER', 'ADMIN')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ActionAcceptedResponse resolve(
            @PathVariable Long id,
            @RequestBody(required = false) ResolveActionRequest request,
            Authentication authentication) {
        return ticketActionService.resolve(id, request, authentication);
    }

    @PostMapping("/close")
    @Operation(summary = "Close ticket", description = "Closes the ticket with a closure reason")
    @PreAuthorize("hasAnyRole('AGENT', 'MANAGER', 'ADMIN')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ActionAcceptedResponse close(
            @PathVariable Long id,
            @RequestBody CloseActionRequest request,
            Authentication authentication) {
        return ticketActionService.close(id, request, authentication);
    }

    @PostMapping("/change-priority")
    @Operation(summary = "Change priority", description = "Updates the ticket priority")
    @PreAuthorize("hasAnyRole('AGENT', 'MANAGER', 'ADMIN')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ActionAcceptedResponse changePriority(
            @PathVariable Long id,
            @RequestBody ChangePriorityActionRequest request,
            Authentication authentication) {
        return ticketActionService.changePriority(id, request, authentication);
    }

    @PostMapping("/approve")
    @Operation(summary = "Approve action", description = "Customer approves the ticket resolution")
    @PreAuthorize("hasRole('CUSTOMER')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ActionAcceptedResponse approve(@PathVariable Long id, Authentication authentication) {
        return ticketActionService.approve(id, authentication);
    }

    @PostMapping("/reject")
    @Operation(summary = "Reject action", description = "Customer rejects the ticket resolution")
    @PreAuthorize("hasRole('CUSTOMER')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ActionAcceptedResponse reject(
            @PathVariable Long id,
            @RequestBody RejectActionRequest request,
            Authentication authentication) {
        return ticketActionService.reject(id, request, authentication);
    }

    @PostMapping("/assign-to-me")
    @Operation(summary = "Assign to me", description = "Agent assigns the ticket to themselves")
    @PreAuthorize("hasRole('AGENT')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ActionAcceptedResponse assignToMe(@PathVariable Long id, Authentication authentication) {
        return ticketActionService.assignToMe(id, authentication);
    }
}
