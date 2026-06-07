package com.ticket.backend.controller;

import com.ticket.backend.entity.Team;
import com.ticket.backend.service.TeamService;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/teams")
@Tag(name = "Teams", description = "Team management endpoints")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    @GetMapping
    @Operation(summary = "List teams", description = "Returns all teams")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public List<Team> getAllTeams() {
        return teamService.getAllTeams();
    }

    @PostMapping
    @Operation(summary = "Create team", description = "Creates a new team")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public Team createTeam(@RequestBody Team team) {
        return teamService.createTeam(team);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get team by ID", description = "Returns a single team by identifier")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public Team getTeamById(@PathVariable Long id) {
        return teamService.getTeamById(id);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update team", description = "Updates team name and description")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public Team updateTeam(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String name = body.get("name") != null ? String.valueOf(body.get("name")).trim() : null;
        String description = body.get("description") != null ? String.valueOf(body.get("description")).trim() : null;
        return teamService.updateTeam(id, name, description);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete team", description = "Deletes a team")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTeam(@PathVariable Long id) {
        teamService.deleteTeam(id);
    }

    @PostMapping("/{id}/members")
    @Operation(summary = "Add member", description = "Adds a user to the team")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public Team addMember(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long userId = ((Number) body.get("userId")).longValue();
        return teamService.addMember(id, userId);
    }

    @DeleteMapping("/{id}/members/{userId}")
    @Operation(summary = "Remove member", description = "Removes a user from the team")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public Team removeMember(@PathVariable Long id, @PathVariable Long userId) {
        return teamService.removeMember(id, userId);
    }

    @PostMapping("/{id}/products")
    @Operation(summary = "Add product", description = "Associates a product with the team")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public Team addProduct(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long productId = ((Number) body.get("productId")).longValue();
        return teamService.addProduct(id, productId);
    }

    @DeleteMapping("/{id}/products/{productId}")
    @Operation(summary = "Remove product", description = "Removes a product association from the team")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public Team removeProduct(@PathVariable Long id, @PathVariable Long productId) {
        return teamService.removeProduct(id, productId);
    }
}
