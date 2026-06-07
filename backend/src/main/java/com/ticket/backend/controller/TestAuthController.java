package com.ticket.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;
import java.util.HashMap;
import org.springframework.security.access.prepost.PreAuthorize;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/test")
@Tag(name = "Test Auth", description = "Role-based authorization test endpoints")
public class TestAuthController {

    // Herkes erişebilir (token'lı herkes)
    @GetMapping("/public")
    @Operation(summary = "Public test", description = "Accessible by any authenticated user")
    public Map<String, String> publicEndpoint() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Bu endpoint'e token'lı herkes erişebilir");
        return response;
    }

    // Sadece CUSTOMER
    @GetMapping("/customer")
    @Operation(summary = "Customer test", description = "Accessible only by CUSTOMER role")
    @PreAuthorize("hasRole('CUSTOMER')")
    public Map<String, String> customerEndpoint() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Bu endpoint'e sadece CUSTOMER erişebilir");
        return response;
    }

    // Sadece AGENT ve MANAGER
    @GetMapping("/agent")
    @Operation(summary = "Agent test", description = "Accessible by AGENT and MANAGER roles")
    @PreAuthorize("hasAnyRole('AGENT', 'MANAGER')")
    public Map<String, String> agentEndpoint() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Bu endpoint'e AGENT ve MANAGER erişebilir");
        return response;
    }

    // Sadece MANAGER
    @GetMapping("/manager")
    @Operation(summary = "Manager test", description = "Accessible only by MANAGER role")
    @PreAuthorize("hasRole('MANAGER')")
    public Map<String, String> managerEndpoint() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Bu endpoint'e sadece MANAGER erişebilir");
        return response;
    }

    // Sadece ADMIN
    @GetMapping("/admin")
    @Operation(summary = "Admin test", description = "Accessible only by ADMIN role")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, String> adminEndpoint() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Bu endpoint'e sadece ADMIN erişebilir");
        return response;
    }
}