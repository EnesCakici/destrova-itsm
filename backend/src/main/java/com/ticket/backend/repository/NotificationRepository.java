package com.ticket.backend.repository;

import com.ticket.backend.entity.Notification;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.ticket.backend.enums.NotificationType;
import java.time.Instant;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    long countByUserIdAndReadFalse(Long userId);

    List<Notification> findByUserIdAndReadFalse(Long userId);

@Query("SELECT COUNT(n) FROM Notification n WHERE n.relatedTicketId = :ticketId " +
    "AND n.type = :type AND n.createdAt > :since")
long countRecentByTicketAndType(@Param("ticketId") Long ticketId, 
                              @Param("type") NotificationType type, 
                              @Param("since") Instant since);

}



                                 