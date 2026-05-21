package com.ticket.backend.service;

import com.ticket.backend.dto.AppUserDto;
import com.ticket.backend.entity.User;
import com.ticket.backend.enums.UserRole;
import com.ticket.backend.repository.UserRepository;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AppUserService {

    private static final Logger log = LoggerFactory.getLogger(AppUserService.class);

    /** DB `app_users.name` kolonu uzunlugu ile uyumlu */
    private static final int MAX_NAME_LENGTH = 120;

    /** DB `app_users.email` kolonu uzunlugu ile uyumlu */
    private static final int MAX_EMAIL_LENGTH = 180;

    /** Keycloak JWT `sub` (genelde UUID string); VARCHAR yeterli */
    private static final int MAX_KEYCLOAK_SUB_LENGTH = 128;

    private final UserRepository userRepository;

    @Transactional
    public Long getOrCreateUserId(Jwt jwt) {
        return getOrCreateUser(jwt).getId();
    }

    /**
     * Oturumdaki kullanici icin DTO doner; gerekirse JIT ile kayit olusturur.
     * Read-only transaction INSERT ile uyumsuz oldugundan {@code readOnly} kullanilmaz.
     */
    @Transactional
    public AppUserDto getCurrentUserDto(Jwt jwt) {
        User user = getOrCreateUser(jwt);
        return toDto(user);
    }

    /**
     * JWT'deki kullaniciyi bulur veya olusturur; {@code email} claim'i varsa {@code app_users.email}
     * ile senkronize edilir. {@link com.ticket.backend.service.TicketService#createTicketForCustomer}
     * dahil tum {@link #getOrCreateUserId} cagrilari bu davranisi paylasir.
     */
    @Transactional
    public User getOrCreateUser(Jwt jwt) {
        String subRaw = jwt.getSubject();
        if (subRaw == null || subRaw.isBlank()) {
            log.error("JWT sub bos veya null; kullanici eslestirilemez. Claims anahtarlari: {}", jwt.getClaims().keySet());
            throw new IllegalStateException("JWT sub zorunludur.");
        }
        // Keycloak sub her zaman String (UUID metin); DB VARCHAR(128) ile uyumlu
        String sub = truncate(subRaw.trim(), MAX_KEYCLOAK_SUB_LENGTH);

        Optional<User> existing = userRepository.findByKeycloakSub(sub);
        if (existing.isPresent()) {
            User user = existing.get();
            if (syncEmailFromJwtIfNeeded(user, jwt)) {
                return userRepository.save(user);
            }
            return user;
        }

        String displayName = resolveDisplayName(jwt, sub);
        displayName = truncate(displayName, MAX_NAME_LENGTH);
        if (displayName == null || displayName.isBlank()) {
            displayName = "Bilgi Yok";
        }

        String emailForNew = truncate(resolveEmailFromJwt(jwt), MAX_EMAIL_LENGTH);
        if (emailForNew == null || emailForNew.isBlank()) {
            log.debug(
                    "JIT yeni kullanici: JWT'de kullanilabilir email yok (sub={}). Claim anahtarlari: {}. "
                            + "Frontend'de Keycloak scope'unun 'openid profile email' oldugundan emin olun.",
                    sub,
                    jwt.getClaims().keySet());
        }

        User created = User.builder()
                .name(displayName)
                .keycloakSub(sub)
                .role(resolveRole(jwt))
                .maxTicketLimit(5)
                .email(emailForNew)
                .build();

        try {
            return userRepository.save(created);
        } catch (DataIntegrityViolationException e) {
            log.error("Kullanıcı kaydedilemedi: ", e);
            Optional<User> concurrent = userRepository.findByKeycloakSub(sub);
            if (concurrent.isPresent()) {
                User u = concurrent.get();
                if (syncEmailFromJwtIfNeeded(u, jwt)) {
                    return userRepository.save(u);
                }
                return u;
            }
            throw e;
        } catch (Exception e) {
            log.error("Kullanıcı kaydedilemedi: ", e);
            throw e;
        }
    }

    public Long requireUserId(Authentication authentication) {
        return getOrCreateUserId(jwtFrom(authentication));
    }

    private Jwt jwtFrom(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal instanceof Jwt jwt) {
            return jwt;
        }
        throw new IllegalStateException("Oturum JWT bekleniyordu.");
    }

    /**
     * Keycloak genelde {@code email} claim'ini uretir; bos degilse DB ile hizalanir.
     *
     * @return JWT'den guncellenecek ise true (tekrar {@code save} cagrin).
     */
    private boolean syncEmailFromJwtIfNeeded(User user, Jwt jwt) {
        String fromJwt = resolveEmailFromJwt(jwt);
        if (fromJwt == null || fromJwt.isBlank()) {
            return false;
        }
        String normalized = truncate(fromJwt.trim(), MAX_EMAIL_LENGTH);
        if (normalized == null || normalized.isBlank()) {
            return false;
        }
        String current = user.getEmail();
        if (current == null || current.isBlank()) {
            user.setEmail(normalized);
            return true;
        }
        if (!current.trim().equalsIgnoreCase(normalized)) {
            user.setEmail(normalized);
            return true;
        }
        return false;
    }

    /**
     * Keycloak access token'da {@code email} genelde yalnizca {@code email} client scope'u istendiginde gelir.
     * Ayrica bazı kurulumlarda {@code preferred_username} e-posta olabilir.
     */
    private static String resolveEmailFromJwt(Jwt jwt) {
        if (jwt == null) {
            return null;
        }
        String email = firstNonBlank(
                jwt.getClaimAsString("email"),
                stringClaim(jwt, "email"),
                emailLikePreferredUsername(jwt));
        if (email == null || email.isBlank()) {
            return null;
        }
        return email.trim();
    }

    /** getClaimAsString bazen bos doner; ham claim Map uzerinden String oku. */
    private static String stringClaim(Jwt jwt, String name) {
        Object raw = jwt.getClaims().get(name);
        if (raw instanceof String s && !s.isBlank()) {
            return s.trim();
        }
        if (raw instanceof Collection<?> col) {
            for (Object o : col) {
                if (o != null && !o.toString().isBlank()) {
                    return o.toString().trim();
                }
            }
        }
        return null;
    }

    private static String emailLikePreferredUsername(Jwt jwt) {
        String pu = jwt.getClaimAsString("preferred_username");
        if (pu != null && pu.contains("@")) {
            return pu.trim();
        }
        return null;
    }

    /**
     * Keycloak / IdP claim'leri bos olabilir; hata yerine sira ile guvenli varsayilanlar.
     */
    private static String resolveDisplayName(Jwt jwt, String subFallback) {
        String v = firstNonBlank(
                jwt.getClaimAsString("preferred_username"),
                jwt.getClaimAsString("username"),
                jwt.getClaimAsString("email"),
                jwt.getClaimAsString("name"),
                combineGivenFamily(jwt),
                jwt.getClaimAsString("nickname"),
                jwt.getClaimAsString("given_name"),
                subFallback);
        if (v == null || v.isBlank()) {
            return "Bilgi Yok";
        }
        return v.trim();
    }

    private static String combineGivenFamily(Jwt jwt) {
        String given = nullToEmpty(jwt.getClaimAsString("given_name"));
        String family = nullToEmpty(jwt.getClaimAsString("family_name"));
        String combined = (given + " " + family).trim();
        return combined.isEmpty() ? null : combined;
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s.trim();
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String candidate : values) {
            if (candidate != null && !candidate.isBlank()) {
                return candidate.trim();
            }
        }
        return null;
    }

    /**
     * Keycloak realm rollerinden uygulama icin UserRole; authorization icin degil, kayit/raporlama icin.
     * {@code realm_access.roles} yapisini null-safe okur.
     */
    private static UserRole resolveRole(Jwt jwt) {
        Collection<String> roles = extractRealmRoles(jwt);
        if (roles == null || roles.isEmpty()) {
            return UserRole.CUSTOMER;
        }
        if (hasRoleIgnoreCase(roles, "admin")) {
            return UserRole.ADMIN;
        }
        if (hasRoleIgnoreCase(roles, "manager")) {
            return UserRole.MANAGER;
        }
        if (hasRoleIgnoreCase(roles, "agent")) {
            return UserRole.AGENT;
        }
        return UserRole.CUSTOMER;
    }

    private static boolean hasRoleIgnoreCase(Collection<String> roles, String target) {
        for (String r : roles) {
            if (r != null && r.trim().equalsIgnoreCase(target)) {
                return true;
            }
        }
        return false;
    }

    private static Collection<String> extractRealmRoles(Jwt jwt) {
        if (jwt == null) {
            return List.of();
        }
        Object claim = jwt.getClaim("realm_access");
        if (!(claim instanceof Map<?, ?> realmAccess)) {
            return List.of();
        }
        Object rolesObj = realmAccess.get("roles");
        if (!(rolesObj instanceof Collection<?> col)) {
            return List.of();
        }
        List<String> list = new ArrayList<>();
        for (Object o : col) {
            if (o != null) {
                list.add(o.toString());
            }
        }
        return list;
    }

    private static String truncate(String value, int maxLen) {
        if (value == null) {
            return null;
        }
        String t = value.trim();
        if (t.length() <= maxLen) {
            return t;
        }
        return t.substring(0, maxLen);
    }

    private static AppUserDto toDto(User user) {
        Long id = Objects.requireNonNull(user.getId(), "user.id");
        String name = user.getName();
        if (name == null || name.isBlank()) {
            name = "Bilgi Yok";
        } else {
            name = name.trim();
            if (name.length() > MAX_NAME_LENGTH) {
                name = name.substring(0, MAX_NAME_LENGTH);
            }
        }
        String sub = user.getKeycloakSub();
        if (sub == null) {
            sub = "";
        } else {
            sub = sub.trim();
            if (sub.length() > MAX_KEYCLOAK_SUB_LENGTH) {
                sub = sub.substring(0, MAX_KEYCLOAK_SUB_LENGTH);
            }
        }
        return AppUserDto.builder()
                .id(id)
                .name(name)
                .keycloakSub(sub)
                .email(user.getEmail() != null && !user.getEmail().isBlank() ? user.getEmail().trim() : null)
                .build();
    }
}
