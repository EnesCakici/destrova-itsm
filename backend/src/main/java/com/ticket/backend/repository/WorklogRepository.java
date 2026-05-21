package com.ticket.backend.repository;

import com.ticket.backend.entity.Worklog;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorklogRepository extends JpaRepository<Worklog, Long> {

    List<Worklog> findByAgentIdAndWorkDateBetween(
            Long agentId,
            LocalDateTime start,
            LocalDateTime end
    );
}