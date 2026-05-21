package com.ticket.backend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TicketRejectRequest {
    private String reason;
}