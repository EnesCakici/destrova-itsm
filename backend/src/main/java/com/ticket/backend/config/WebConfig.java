package com.ticket.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableWebMvc
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // Frontend dev sunucusundan gelen API cagrilarina izin verir. CorsRegistry - Hangi istekleri kabul edeceğim?
        registry.addMapping("/**")
                //Bu adresten gelen isteklere izin ver
                .allowedOrigins("http://localhost:5173")
                //Hangi işlemlere
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                //Tüm header’lara
                .allowedHeaders("*")
                //login/cookie gibi şeylere izin
                .allowCredentials(true);
    }
}
