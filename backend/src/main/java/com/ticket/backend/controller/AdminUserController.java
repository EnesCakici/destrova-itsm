package com.ticket.backend.controller;

import com.ticket.backend.entity.User;
import com.ticket.backend.enums.UserRole;
import com.ticket.backend.repository.UserRepository;
import com.ticket.backend.service.KeycloakAdminService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/admin/users")
@Tag(name = "Admin Users", description = "Admin user management endpoints")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserRepository userRepository;
    private final KeycloakAdminService keycloakAdminService;

    @GetMapping
    @Operation(summary = "List users", description = "Returns all users in the system")
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get user by ID", description = "Returns a single user by identifier")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Create user", description = "Provisions a new user in Keycloak and the database")
    @ResponseStatus(HttpStatus.CREATED)
    public User createUser(@RequestBody User user) {
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            throw new IllegalArgumentException("E-posta adresi zorunludur.");
        }
        if (user.getName() == null || user.getName().isBlank()) {
            throw new IllegalArgumentException("Ad Soyad zorunludur.");
        }
        UserRole role = user.getRole() != null ? user.getRole() : UserRole.CUSTOMER;
        user.setRole(role);

        String kcSub = keycloakAdminService.provisionUser(
                user.getName(), user.getEmail(), role);

        try {
            user.setKeycloakSub(kcSub);
            if (user.getStatus() == null || user.getStatus().isBlank()) user.setStatus("Active");
            if (user.getMaxTicketLimit() == null) user.setMaxTicketLimit(5);
            return userRepository.save(user);
        } catch (Exception e) {
            try {
                keycloakAdminService.deleteUser(kcSub);
            } catch (Exception rollbackError) {
                log.error("Keycloak rollback hatası (kullanıcı silinemedi): {}", rollbackError.getMessage());
            }
            throw new RuntimeException("Veritabanına kaydedilemedi, Keycloak kaydı geri alındı.", e);
        }
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update user", description = "Updates user fields and syncs status with Keycloak")
    public ResponseEntity<User> updateUser(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));

        if (body.containsKey("name") && body.get("name") != null)
            user.setName(body.get("name").toString().trim());
        if (body.containsKey("email") && body.get("email") != null)
            user.setEmail(body.get("email").toString().trim());
        if (body.containsKey("role") && body.get("role") != null) {
            try {
                user.setRole(UserRole.valueOf(
                        body.get("role").toString().toUpperCase()));
            } catch (IllegalArgumentException ignored) {}
        }
        if (body.containsKey("status") && body.get("status") != null) {
            String newStatus = body.get("status").toString().trim();
            String oldStatus = user.getStatus();

            if (!newStatus.equalsIgnoreCase(oldStatus)
                    && user.getKeycloakSub() != null
                    && !user.getKeycloakSub().isBlank()) {

                if ("Active".equalsIgnoreCase(newStatus)) {
                    keycloakAdminService.enableUser(user.getKeycloakSub());
                    newStatus = "Active";
                } else if ("Disabled".equalsIgnoreCase(newStatus)) {
                    keycloakAdminService.disableUser(user.getKeycloakSub());
                    newStatus = "Disabled";
                }
            }

            user.setStatus(newStatus);
        }
        if (body.containsKey("department") && body.get("department") != null)
            user.setDepartment(body.get("department").toString().trim());
        if (body.containsKey("maxTicketLimit") && body.get("maxTicketLimit") != null)
            user.setMaxTicketLimit(
                    ((Number) body.get("maxTicketLimit")).intValue());

        return ResponseEntity.ok(userRepository.save(user));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Disable user", description = "Disables the user in Keycloak and marks as disabled")
    public ResponseEntity<User> disableUser(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + id));

        if (user.getKeycloakSub() != null && !user.getKeycloakSub().isBlank()) {
            keycloakAdminService.disableUser(user.getKeycloakSub());
        }

        user.setStatus("Disabled");
        User savedUser = userRepository.save(user);

        return ResponseEntity.ok(savedUser);
    }
}
