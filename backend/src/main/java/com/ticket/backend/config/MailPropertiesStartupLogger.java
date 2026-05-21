package com.ticket.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Yerelde spring.mail.* değerlerinin yüklendiğini doğrulamak için başlangıç DEBUG çıktısı.
 */
@Component
public class MailPropertiesStartupLogger implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MailPropertiesStartupLogger.class);

    private final Environment environment;

    public MailPropertiesStartupLogger(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!log.isDebugEnabled()) {
            return;
        }
        log.debug(
                "spring.mail configuration loaded: host={}, port={}, smtp.auth={}, smtp.starttls.enable={}",
                environment.getProperty("spring.mail.host"),
                environment.getProperty("spring.mail.port"),
                environment.getProperty("spring.mail.properties.mail.smtp.auth"),
                environment.getProperty("spring.mail.properties.mail.smtp.starttls.enable"));
    }
}
