package com.ticket.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransferTicketRequest {
    private Long toAgentId;       // zorunlu
    private String transferReason; // zorunlu: VACATION, OVERLOAD, EXPERTISE, KNOWLEDGE_GAP
    private String transferNote;   // opsiyonel — transfer özeti
    private String internalMessage; // opsiyonel — ek internal not (@mention destekli)
}
