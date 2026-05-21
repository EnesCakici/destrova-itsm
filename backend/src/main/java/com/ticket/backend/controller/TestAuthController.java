package com.ticket.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;
import java.util.HashMap;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/test")
public class TestAuthController {

    // Herkes erişebilir (token'lı herkes)
    @GetMapping("/public")
    public Map<String, String> publicEndpoint() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Bu endpoint'e token'lı herkes erişebilir");
        return response;
    }

    // Sadece CUSTOMER
    @GetMapping("/customer")
    @PreAuthorize("hasRole('CUSTOMER')")
    public Map<String, String> customerEndpoint() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Bu endpoint'e sadece CUSTOMER erişebilir");
        return response;
    }

    // Sadece AGENT ve MANAGER
    @GetMapping("/agent")
    @PreAuthorize("hasAnyRole('AGENT', 'MANAGER')")
    public Map<String, String> agentEndpoint() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Bu endpoint'e AGENT ve MANAGER erişebilir");
        return response;
    }

    // Sadece MANAGER
    @GetMapping("/manager")
    @PreAuthorize("hasRole('MANAGER')")
    public Map<String, String> managerEndpoint() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Bu endpoint'e sadece MANAGER erişebilir");
        return response;
    }

    // Sadece ADMIN
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, String> adminEndpoint() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Bu endpoint'e sadece ADMIN erişebilir");
        return response;
    }
}