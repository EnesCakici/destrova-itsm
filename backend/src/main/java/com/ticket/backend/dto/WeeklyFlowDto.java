package com.ticket.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@AllArgsConstructor
public class WeeklyFlowDto {
    private String label;
    private Long opened;
    private Long closed;
}
