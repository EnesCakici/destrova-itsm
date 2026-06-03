package com.ticket.backend.service;

import com.ticket.backend.enums.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class KeycloakAdminService {

    private final RestTemplate restTemplate;

    @Value("${destrova.keycloak-admin.url}")
    private String keycloakUrl;

    @Value("${destrova.keycloak-admin.realm}")
    private String realm;

    @Value("${destrova.keycloak-admin.admin-username}")
    private String adminUsername;

    @Value("${destrova.keycloak-admin.admin-password}")
    private String adminPassword;

    private String getAdminToken() {
        String url = keycloakUrl + "/realms/master/protocol/openid-connect/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> requestBody = new LinkedMultiValueMap<>();
        requestBody.add("client_id", "admin-cli");
        requestBody.add("username", adminUsername);
        requestBody.add("password", adminPassword);
        requestBody.add("grant_type", "password");

        ResponseEntity<Map> response = restTemplate.exchange(
                url, HttpMethod.POST,
                new HttpEntity<>(requestBody, headers),
                Map.class);

        Map body = response.getBody();
        if (body == null || body.get("access_token") == null) {
            throw new RuntimeException("Keycloak admin token alınamadı");
        }
        return body.get("access_token").toString();
    }

    public String provisionUser(String fullName, String email, UserRole role) {
        String token = getAdminToken();
        HttpHeaders authHeaders = new HttpHeaders();
        authHeaders.setBearerAuth(token);
        authHeaders.setContentType(MediaType.APPLICATION_JSON);

        String[] parts = (fullName != null ? fullName.trim() : "").split("\\s+", 2);
        String firstName = parts.length > 0 ? parts[0] : "";
        String lastName = parts.length > 1 ? parts[1] : "";

        String createUrl = keycloakUrl + "/admin/realms/" + realm + "/users";

        Map<String, Object> kcUser = new LinkedHashMap<>();
        kcUser.put("username", email);
        kcUser.put("email", email);
        kcUser.put("firstName", firstName);
        kcUser.put("lastName", lastName);
        kcUser.put("enabled", true);
        kcUser.put("emailVerified", true);

        String kcId;
        try {
            ResponseEntity<Void> createResp = restTemplate.exchange(
                    createUrl, HttpMethod.POST,
                    new HttpEntity<>(kcUser, authHeaders),
                    Void.class);

            if (!createResp.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException(
                        "Keycloak kullanıcı oluşturma hatası: " + createResp.getStatusCode());
            }

            URI location = createResp.getHeaders().getLocation();
            if (location == null) {
                throw new RuntimeException("Keycloak Location header dönmedi");
            }
            String path = location.getPath();
            kcId = path.substring(path.lastIndexOf('/') + 1);
            log.info("Keycloak kullanıcı oluşturuldu: email={}, kcId={}", email, kcId);

        } catch (org.springframework.web.client.HttpClientErrorException.Conflict e) {
            throw new IllegalStateException("A user with this email address already exists: " + email);
        }

        String roleName = role.name().toUpperCase();
        String roleUrl = keycloakUrl + "/admin/realms/" + realm + "/roles/" + roleName;

        ResponseEntity<Map> roleResp = restTemplate.exchange(
                roleUrl, HttpMethod.GET,
                new HttpEntity<>(authHeaders),
                Map.class);

        if (!roleResp.getStatusCode().is2xxSuccessful() || roleResp.getBody() == null) {
            throw new RuntimeException("Keycloak'ta rol bulunamadı: " + roleName);
        }
        Map<String, Object> roleRep = roleResp.getBody();

        String roleMappingUrl = keycloakUrl + "/admin/realms/" + realm
                + "/users/" + kcId + "/role-mappings/realm";

        restTemplate.exchange(
                roleMappingUrl, HttpMethod.POST,
                new HttpEntity<>(List.of(roleRep), authHeaders),
                Void.class);
        log.info("Keycloak rol atandı: role={}, kcId={}", roleName, kcId);

        String actionsUrl = keycloakUrl + "/admin/realms/" + realm
                + "/users/" + kcId + "/execute-actions-email?lifespan=172800";
        try {
            restTemplate.exchange(
                    actionsUrl, HttpMethod.PUT,
                    new HttpEntity<>(List.of("UPDATE_PASSWORD"), authHeaders),
                    Void.class);
            log.info("Şifre belirleme e-postası gönderildi: email={}", email);
        } catch (Exception e) {
            log.warn("Şifre e-postası gönderilemedi: email={}, hata={}", email, e.getMessage());
        }

        return kcId;
    }

    public void disableUser(String kcId) {
        String url = keycloakUrl + "/admin/realms/" + realm + "/users/" + kcId;
        HttpHeaders authHeaders = new HttpHeaders();
        authHeaders.setBearerAuth(getAdminToken());
        authHeaders.setContentType(MediaType.APPLICATION_JSON);
        restTemplate.exchange(url, HttpMethod.PUT, new HttpEntity<>(Map.of("enabled", false), authHeaders), Void.class);
        log.info("Keycloak kullanıcısı disable edildi: kcId={}", kcId);
    }

    public void enableUser(String kcId) {
        String url = keycloakUrl + "/admin/realms/" + realm + "/users/" + kcId;
        HttpHeaders authHeaders = new HttpHeaders();
        authHeaders.setBearerAuth(getAdminToken());
        authHeaders.setContentType(MediaType.APPLICATION_JSON);
        restTemplate.exchange(url, HttpMethod.PUT, new HttpEntity<>(Map.of("enabled", true), authHeaders), Void.class);
        log.info("Keycloak kullanıcısı enable edildi: kcId={}", kcId);
    }

    public void deleteUser(String kcId) {
        String url = keycloakUrl + "/admin/realms/" + realm + "/users/" + kcId;
        HttpHeaders authHeaders = new HttpHeaders();
        authHeaders.setBearerAuth(getAdminToken());
        restTemplate.exchange(url, HttpMethod.DELETE, new HttpEntity<>(authHeaders), Void.class);
        log.info("Keycloak kullanıcısı silindi (Rollback): kcId={}", kcId);
    }
}
