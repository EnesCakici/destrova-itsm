package com.ticket.backend.dto;

import com.ticket.backend.enums.Status;
import lombok.Data;

@Data
public class AssignTicketRequest {
    private Long assigneeId;
    private Status status;
}
