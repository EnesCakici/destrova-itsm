package com.ticket.backend.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AppUserDto {
    Long id;
    String name;
    String keycloakSub;
    /** ITSM içi; mention / Involved sekmesi için JWT ile senkron. */
    String email;
}
