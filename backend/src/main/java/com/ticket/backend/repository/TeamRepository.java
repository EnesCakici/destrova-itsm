package com.ticket.backend.repository;

import com.ticket.backend.entity.Team;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {

    @Query("SELECT DISTINCT t FROM Team t JOIN t.members m WHERE m.id = :userId")
    List<Team> findByMembersId(@Param("userId") Long userId);
}
