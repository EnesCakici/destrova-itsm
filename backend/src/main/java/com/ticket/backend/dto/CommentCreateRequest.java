package com.ticket.backend.dto;

//import com.ticket.backend.enums.CommentAuthorType;
import lombok.Data;

@Data
public class CommentCreateRequest {
    private String message;
    //private String authorName;
    //private CommentAuthorType authorType;
    private Boolean isInternal;
}
