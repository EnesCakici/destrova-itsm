package com.ticket.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "products")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 400)
    private String description;

    /** Identity | Security | Productivity & Communication | Other */
    @Column(length = 80)
    private String category;

    /** Örnek: "v2.5.0" — pasif ürünlerde null olabilir */
    @Column(name = "latest_version", length = 40)
    private String latestVersion;

    /** false = pasif / yayından kalkmış ürün */
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    /** Veritabanı varsayılanı ile set edilir (insert/update’te gönderilmez). */
    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;
}
