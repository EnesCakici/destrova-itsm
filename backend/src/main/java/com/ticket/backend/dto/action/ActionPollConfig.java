package com.ticket.backend.dto.action;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActionPollConfig {

    private int recommendedIntervalMs;
    private int maxAttempts;
    private int timeoutMs;
}
