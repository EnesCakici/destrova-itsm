package com.ticket.backend.controller;

import com.ticket.backend.dto.action.ActionAcceptedResponse;
import com.ticket.backend.dto.action.AssignActionRequest;
import com.ticket.backend.dto.action.ChangePriorityActionRequest;
import com.ticket.backend.dto.action.CloseActionRequest;
import com.ticket.backend.dto.action.RejectActionRequest;
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

@RestController
@RequestMapping("/api/tickets/{id}/actions")
@RequiredArgsConstructor
public class TicketActionController {

    private final TicketActionService ticketActionService;

    @PostMapping("/assign")
    @PreAuthorize("hasAnyRole('AGENT', 'MANAGER', 'ADMIN')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ActionAcceptedResponse assign(
            @PathVariable Long id,
            @RequestBody AssignActionRequest request,
            Authentication authentication) {
        return ticketActionService.assign(id, request, authentication);
    }

    @PostMapping("/unassign")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ActionAcceptedResponse unassign(@PathVariable Long id, Authentication authentication) {
        return ticketActionService.unassign(id, authentication);
    }

    @PostMapping("/wait-for-customer")
    @PreAuthorize("hasAnyRole('AGENT', 'MANAGER', 'ADMIN')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ActionAcceptedResponse waitForCustomer(@PathVariable Long id, Authentication authentication) {
        return ticketActionService.waitForCustomer(id, authentication);
    }

    @PostMapping("/resume")
    @PreAuthorize("hasAnyRole('AGENT', 'MANAGER', 'ADMIN', 'CUSTOMER')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ActionAcceptedResponse resume(@PathVariable Long id, Authentication authentication) {
        return ticketActionService.resume(id, authentication);
    }

    @PostMapping("/resolve")
    @PreAuthorize("hasAnyRole('AGENT', 'MANAGER', 'ADMIN')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ActionAcceptedResponse resolve(@PathVariable Long id, Authentication authentication) {
        return ticketActionService.resolve(id, authentication);
    }

    @PostMapping("/close")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ActionAcceptedResponse close(
            @PathVariable Long id,
            @RequestBody CloseActionRequest request,
            Authentication authentication) {
        return ticketActionService.close(id, request, authentication);
    }

    @PostMapping("/change-priority")
    @PreAuthorize("hasAnyRole('AGENT', 'MANAGER', 'ADMIN')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ActionAcceptedResponse changePriority(
            @PathVariable Long id,
            @RequestBody ChangePriorityActionRequest request,
            Authentication authentication) {
        return ticketActionService.changePriority(id, request, authentication);
    }

    @PostMapping("/approve")
    @PreAuthorize("hasRole('CUSTOMER')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ActionAcceptedResponse approve(@PathVariable Long id, Authentication authentication) {
        return ticketActionService.approve(id, authentication);
    }

    @PostMapping("/reject")
    @PreAuthorize("hasRole('CUSTOMER')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ActionAcceptedResponse reject(
            @PathVariable Long id,
            @RequestBody RejectActionRequest request,
            Authentication authentication) {
        return ticketActionService.reject(id, request, authentication);
    }

    @PostMapping("/assign-to-me")
    @PreAuthorize("hasRole('AGENT')")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ActionAcceptedResponse assignToMe(@PathVariable Long id, Authentication authentication) {
        return ticketActionService.assignToMe(id, authentication);
    }
}
