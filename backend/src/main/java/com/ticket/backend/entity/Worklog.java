package com.ticket.backend.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "worklogs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Worklog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonBackReference("ticket-worklogs")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    // Eforu giren agent kullanici id'si.
    @Column(name = "agent_id", nullable = false)
    private Long agentId;

    // Harcanan sure (dakika cinsinden).
    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;

    // Yapilan isin aciklamasi.
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @CreationTimestamp
    @Column(name = "work_date", nullable = false, updatable = false)
    private LocalDateTime workDate;
}
