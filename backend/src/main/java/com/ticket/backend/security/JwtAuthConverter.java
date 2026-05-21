package com.ticket.backend.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class JwtAuthConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final JwtGrantedAuthoritiesConverter defaultConverter = new JwtGrantedAuthoritiesConverter();

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {

        // 1. Default authorities (scope vs.)
        Collection<GrantedAuthority> authorities = Optional
                .ofNullable(defaultConverter.convert(jwt))
                .orElse(Collections.emptyList());

        List<GrantedAuthority> grantedAuthorities = new ArrayList<>(authorities);

        // 2. Keycloak realm roles - Sadece büyük harf ve alt çizgi içerenler
        Map<String, Object> realmAccess = jwt.getClaim("realm_access");

        if (realmAccess != null && realmAccess.get("roles") instanceof Collection<?>) {

            Collection<?> roles = (Collection<?>) realmAccess.get("roles");

            roles.stream()
                    .filter(String.class::isInstance)
                    .map(String.class::cast)
                    .filter(role -> role.matches("^[A-Z_]+$")) // Sadece CUSTOMER, AGENT, MANAGER, ADMIN vb.
                    .map(role -> "ROLE_" + role)
                    .map(SimpleGrantedAuthority::new)
                    .forEach(grantedAuthorities::add);
        }

        return new JwtAuthenticationToken(jwt, grantedAuthorities);
    }
}