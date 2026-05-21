package com.ticket.backend.repository;

import com.ticket.backend.entity.Ticket;
import com.ticket.backend.enums.ClosureReason;
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

    /** Havuz: atanmamış ve henüz kapatılmamış biletler (Active / Unassigned sekmesi). */
    List<Ticket> findByAssigneeIdIsNullAndStatusNot(Status status);

    List<Ticket> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    List<Ticket> findByCreatorId(Long creatorId);

    List<Ticket> findByStatusIn(Collection<Status> statuses);

    // ── Reports & filtreli liste sorgu ──────────────────────────────────────

    /** Tarih araligindaki tum ticketlari getirir — reports servisi icin. */
    List<Ticket> findByCreatedAtBetweenOrderByCreatedAtAsc(LocalDateTime start, LocalDateTime end);

    /**
     * Manager All Tickets icin esnek filtreli liste.
     * null parametre = filtre uygulanmaz.
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

    /** Dashboard icin yorum/worklog yuklenmez (projection). */
    interface DashboardTicketProjection {
        Long getId();
        Status getStatus();
        Priority getPriority();
        LocalDateTime getCreatedAt();
        LocalDateTime getClosedAt();
        LocalDateTime getSlaDueDate();
        ClosureReason getClosureReason();
        Long getAssigneeId();
    }

    @Query("""
            select
              t.id            as id,
              t.status        as status,
              t.priority      as priority,
              t.createdAt     as createdAt,
              t.closedAt      as closedAt,
              t.slaDueDate    as slaDueDate,
              t.closureReason as closureReason,
              t.assigneeId    as assigneeId
            from Ticket t
            where t.createdAt between :start and :end
            """)
    List<DashboardTicketProjection> findDashboardTicketsByCreatedAtBetween(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);
}
