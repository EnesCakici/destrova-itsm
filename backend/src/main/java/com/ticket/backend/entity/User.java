package com.ticket.backend.entity;

import com.ticket.backend.enums.UserRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "app_users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Ekranlarda gorunen kullanici/agent adi (Keycloak claim'leri bos olabilir; servis "Bilgi Yok" yazar).
    @Column(nullable = false, length = 120)
    private String name;

    // Agentin ayni anda tasiyabilecegi maksimum aktif ticket sayisi.
    @Column(name = "max_ticket_limit", nullable = false)
    @Builder.Default
    private Integer maxTicketLimit = 5;

    // Keycloak JWT "sub" (String, genelde UUID ~36 karakter); legacy satirlar icin null olabilir.
    @Column(name = "keycloak_sub", unique = true, length = 128, nullable = true)
    private String keycloakSub;

    /** Uygulama ici listeleme / capacity; authorization Keycloak token uzerinden kalir. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private UserRole role = UserRole.CUSTOMER;

    @Column(length = 180)
    private String email;

    @Column(length = 40)
    @Builder.Default
    private String status = "Active"; // Active, Disabled (UI; legacy DB values normalized in migration)

    @Column(length = 80)
    private String department;
}
