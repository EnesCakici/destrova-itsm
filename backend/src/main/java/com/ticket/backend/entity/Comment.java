package com.ticket.backend.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.ticket.backend.enums.CommentAuthorType;
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
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "comments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonBackReference("ticket-comments")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    // Yorumu yazan kisinin ekranda gosterilen adi.
    @Column(name = "author_name", nullable = false, length = 120)
    private String authorName;

    // Yorumu yazan uygulama kullanıcısının id'si.
    // System commentlerde null kalır.
    @Column(name = "author_user_id")
    private Long authorUserId;

    // Yorumu yazan taraf: CUSTOMER veya AGENT.
    @Enumerated(EnumType.STRING)
    @Column(name = "author_type", nullable = false)
    private CommentAuthorType authorType;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    // true ise sadece ekip gorur (internal not).
    @Column(name = "is_internal")
    @Builder.Default
    private Boolean isInternal = Boolean.FALSE;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
