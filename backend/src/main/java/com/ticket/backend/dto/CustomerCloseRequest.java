package com.ticket.backend.dto;

import com.ticket.backend.enums.ClosureReason;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CustomerCloseRequest {
    private ClosureReason closureReason;
}
