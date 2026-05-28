package com.ticket.backend.dto.action;

import com.ticket.backend.enums.ClosureReason;
import lombok.Data;

@Data
public class CloseActionRequest {

    private ClosureReason closureReason;
}
