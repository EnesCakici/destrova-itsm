package com.ticket.backend.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.ticket.backend.enums.ClosureReason;
import com.ticket.backend.enums.Priority;
import com.ticket.backend.enums.Status;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "tickets")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priority priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Ticketi olusturan musteri kullanici id'si.
    @Column(name = "creator_id", nullable = false)
    private Long creatorId;

    @Column(name = "creator_sub")
    private String creatorSub;  // Yeni eklendi

    // Ticketa atanmis agent id'si (atanmadiysa null olabilir).
    @Column(name = "assignee_id")
    private Long assigneeId;

    @Transient
    @JsonProperty("creatorName")
    private String creatorName;

    @Transient
    @JsonProperty("assigneeName")
    private String assigneeName;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    // Ticket kapatildiginda secilen kapanis nedeni.
    @Enumerated(EnumType.STRING)
    @Column(name = "closure_reason")
    private ClosureReason closureReason;

    // SLA'ya gore hedef bitis zamani.
    @Column(name = "sla_due_date")
    private LocalDateTime slaDueDate;

    /**
     * When the customer declines a "resolved" offer; cleared when the agent marks resolved again.
     * Shown to agents as an attention signal. Optional input on customer reject (RESOLVED -> IN_PROGRESS).
     */
    @Column(name = "customer_rejection_note", columnDefinition = "TEXT")
    private String customerRejectionNote;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id")
    private Product product;

    // Ticketa bagli yorumlar.
    @JsonManagedReference("ticket-comments")
    @OneToMany(mappedBy = "ticket", fetch = FetchType.EAGER)
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Comment> comments = new ArrayList<>();

    // Ticketa bagli worklog kayitlari.
    @JsonManagedReference("ticket-worklogs")
    @OneToMany(mappedBy = "ticket", fetch = FetchType.EAGER)
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Worklog> worklogs = new ArrayList<>();

    /**
     * Computed for API only — not a DB column. SAFE / AT_RISK / BREACHED / PAUSED / STOPPED / UNKNOWN
     */
    @JsonProperty("slaState")
    public String getSlaState() {
        if (status == null) {
            return "UNKNOWN";
        }
        if (status == Status.RESOLVED || status == Status.CLOSED) {
            return "STOPPED";
        }
        if (status == Status.WAITING_FOR_CUSTOMER) {
            return "PAUSED";
        }
        if (slaDueDate == null) {
            return "UNKNOWN";
        }
        LocalDateTime n = LocalDateTime.now();
        if (n.isAfter(slaDueDate)) {
            return "BREACHED";
        }
        if (createdAt != null) {
            long totalMin = ChronoUnit.MINUTES.between(createdAt, slaDueDate);
            if (totalMin > 0) {
                long elapsedMin = ChronoUnit.MINUTES.between(createdAt, n);
                if (elapsedMin >= (long) (0.8 * totalMin)) {
                    return "AT_RISK";
                }
            }
        }
        return "SAFE";
    }
}
