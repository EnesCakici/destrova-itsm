package com.ticket.backend.dto.webhook;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AssignedPayload {

    private Long previousAssigneeId;
    private Long newAssigneeId;
    private Long assignedByUserId;
    private String previousStatus;
    private String newStatus;
    private Boolean unassign;
}
