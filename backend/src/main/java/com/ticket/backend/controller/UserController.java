package com.ticket.backend.controller;

import com.ticket.backend.dto.AppUserDto;
import com.ticket.backend.service.AppUserService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/users")
@Tag(name = "Users", description = "Authenticated user profile endpoints")
@RequiredArgsConstructor
public class UserController {

    private static final Logger log = LoggerFactory.getLogger(UserController.class);

    private final AppUserService appUserService;

    @GetMapping("/me")
    @Operation(summary = "Current user", description = "Returns the authenticated user's profile")
    @PreAuthorize("isAuthenticated()")
    public AppUserDto me(@AuthenticationPrincipal Jwt jwt) {
        if (jwt == null) {
            log.error("/api/users/me: JWT principal null");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Oturum bulunamadi");
        }
        try {
            return appUserService.getCurrentUserDto(jwt);
        } catch (Exception e) {
            log.error("Kullanıcı kaydedilemedi: ", e);
            throw e;
        }
    }
}
