package com.ticket.backend.health;

import com.ticket.backend.service.JbpmService;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.stereotype.Component;

@Component("jbpmContainer")
public class JbpmContainerHealthIndicator implements HealthIndicator {

    private final JbpmService jbpmService;

    public JbpmContainerHealthIndicator(JbpmService jbpmService) {
        this.jbpmService = jbpmService;
    }

    @Override
    public Health health() {
        if (jbpmService.isDeploymentReady()) {
            return Health.up()
                    .withDetail("containerId", JbpmService.CONTAINER_ID)
                    .withDetail("status", "STARTED")
                    .build();
        }
        return Health.down()
                .withDetail("containerId", JbpmService.CONTAINER_ID)
                .withDetail("status", "NOT_STARTED")
                .withDetail("hint", "Check jbpm-reconciler logs or run: docker compose up jbpm-kjar-build jbpm-init")
                .build();
    }
}
