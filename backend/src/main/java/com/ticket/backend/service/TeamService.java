package com.ticket.backend.service;

import com.ticket.backend.entity.Product;
import com.ticket.backend.entity.Team;
import com.ticket.backend.entity.User;
import com.ticket.backend.repository.ProductRepository;
import com.ticket.backend.repository.TeamRepository;
import com.ticket.backend.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class TeamService {

    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public List<Team> getAllTeams() {
        return teamRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Team getTeamById(Long id) {
        return teamRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Team not found: " + id));
    }

    public Team createTeam(Team team) {
        return teamRepository.save(team);
    }

    public Team updateTeam(Long teamId, String name, String description) {
        Team team = getTeamById(teamId);
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Team name is required");
        }
        team.setName(name.trim());
        team.setDescription(description != null && !description.isBlank() ? description.trim() : null);
        return teamRepository.save(team);
    }

    public void deleteTeam(Long teamId) {
        if (!teamRepository.existsById(teamId)) {
            throw new EntityNotFoundException("Team not found: " + teamId);
        }
        teamRepository.deleteById(teamId);
    }

    public Team addMember(Long teamId, Long userId) {
        Team team = getTeamById(teamId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
        boolean alreadyMember = team.getMembers().stream()
                .anyMatch(m -> m.getId().equals(userId));
        if (!alreadyMember) {
            team.getMembers().add(user);
        }
        return teamRepository.save(team);
    }

    public Team removeMember(Long teamId, Long userId) {
        Team team = getTeamById(teamId);
        team.getMembers().removeIf(u -> u.getId().equals(userId));
        return teamRepository.save(team);
    }

    public Team addProduct(Long teamId, Long productId) {
        Team team = getTeamById(teamId);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new EntityNotFoundException("Product not found: " + productId));
        boolean alreadyLinked = team.getProducts().stream()
                .anyMatch(p -> p.getId().equals(productId));
        if (!alreadyLinked) {
            team.getProducts().add(product);
        }
        return teamRepository.save(team);
    }

    public Team removeProduct(Long teamId, Long productId) {
        Team team = getTeamById(teamId);
        team.getProducts().removeIf(p -> p.getId().equals(productId));
        return teamRepository.save(team);
    }

    @Transactional(readOnly = true)
    public Set<Long> getProductIdsForAgent(Long userId) {
        return teamRepository.findByMembersId(userId).stream()
                .flatMap(team -> team.getProducts().stream())
                .map(Product::getId)
                .collect(HashSet::new, Set::add, Set::addAll);
    }
}
