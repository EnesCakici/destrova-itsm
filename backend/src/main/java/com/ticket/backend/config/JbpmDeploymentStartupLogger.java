package com.ticket.backend.config;

import com.ticket.backend.service.JbpmService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
public class JbpmDeploymentStartupLogger {

    private final JbpmService jbpmService;

    @EventListener(ApplicationReadyEvent.class)
    public void logDeploymentStatus() {
        boolean ready = jbpmService.isDeploymentReady();
        if (ready) {
            log.info("jBPM deployment container '{}' is STARTED and ready", JbpmService.CONTAINER_ID);
        } else {
            log.warn("jBPM deployment container '{}' is NOT ready at startup — ticket workflow may fail until redeploy",
                    JbpmService.CONTAINER_ID);
        }
    }
}
