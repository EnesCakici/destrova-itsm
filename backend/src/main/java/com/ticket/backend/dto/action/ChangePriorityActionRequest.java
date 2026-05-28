package com.ticket.backend.dto.action;

import com.ticket.backend.enums.Priority;
import lombok.Data;

@Data
public class ChangePriorityActionRequest {

    private Priority priority;
}
