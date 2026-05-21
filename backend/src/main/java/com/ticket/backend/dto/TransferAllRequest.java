package com.ticket.backend.dto;

import lombok.Data;

@Data
public class TransferAllRequest {
    private Long fromAgentId;
    private Long toAgentId;
}
