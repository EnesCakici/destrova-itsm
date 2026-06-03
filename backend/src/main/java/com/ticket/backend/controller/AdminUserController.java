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

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserRepository userRepository;
    private final KeycloakAdminService keycloakAdminService;

    @GetMapping
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
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
        if (body.containsKey("status") && body.get("status") != null)
            user.setStatus(body.get("status").toString().trim());
        if (body.containsKey("department") && body.get("department") != null)
            user.setDepartment(body.get("department").toString().trim());
        if (body.containsKey("maxTicketLimit") && body.get("maxTicketLimit") != null)
            user.setMaxTicketLimit(
                    ((Number) body.get("maxTicketLimit")).intValue());

        return ResponseEntity.ok(userRepository.save(user));
    }

    @DeleteMapping("/{id}")
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
