package com.ticket.backend.dto.action;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActionAcceptedResponse {

    private String commandId;
    private Long ticketId;
    private String action;
    @Builder.Default
    private String status = "ACCEPTED";
    private ActionPollConfig poll;
    private Map<String, Object> expectedProjection;
}
