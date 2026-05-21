package com.ticket.backend.repository;

import com.ticket.backend.entity.User;
import com.ticket.backend.enums.UserRole;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // Temel CRUD islemleri JpaRepository uzerinden otomatik gelir.

    Optional<User> findByKeycloakSub(String keycloakSub);

    Optional<User> findByEmail(String email);

    List<User> findByRole(UserRole role);
}
