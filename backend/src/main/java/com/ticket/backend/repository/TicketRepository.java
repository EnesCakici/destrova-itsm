package com.ticket.backend.repository;

import com.ticket.backend.entity.Ticket;
import com.ticket.backend.enums.Priority;
import com.ticket.backend.enums.Status;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {

    long countByAssigneeIdAndStatusIn(Long assigneeId, Collection<Status> statuses);

    long countByStatusIn(Collection<Status> statuses);

    List<Ticket> findByAssigneeIdAndStatusIn(Long assigneeId, Collection<Status> statuses);

    List<Ticket> findByAssigneeId(Long assigneeId);

    boolean existsByIdAndAssigneeId(Long id, Long assigneeId);

    List<Ticket> findByPendingTransferToAgentId(Long pendingTransferToAgentId);

    /** Unassigned, not-yet-closed tickets (pool / Active tab). */
    List<Ticket> findByAssigneeIdIsNullAndStatusNot(Status status);

    /** Unassigned pool filtered by team product ids (includes tickets without product). */
    @Query("SELECT t FROM Ticket t WHERE t.assigneeId IS NULL "
            + "AND t.status <> :status "
            + "AND (t.product IS NULL OR t.product.id IN :productIds)")
    List<Ticket> findUnassignedByProductIds(
            @Param("status") Status status,
            @Param("productIds") Collection<Long> productIds);

    List<Ticket> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    List<Ticket> findByCreatorId(Long creatorId);

    List<Ticket> findByStatusIn(Collection<Status> statuses);

    /** Tickets in date range for reports service. */
    List<Ticket> findByCreatedAtBetweenOrderByCreatedAtAsc(LocalDateTime start, LocalDateTime end);

    /**
     * Flexible filter for manager All Tickets.
     * null parameter = no filter applied.
     */
    @Query("""
            select t from Ticket t
            where (:assigneeId is null or t.assigneeId = :assigneeId)
              and (:status     is null or t.status     = :status)
              and (:priority   is null or t.priority   = :priority)
            order by t.updatedAt desc
            """)
    List<Ticket> findByFilters(
            @Param("assigneeId") Long assigneeId,
            @Param("status") Status status,
            @Param("priority") Priority priority);
}
