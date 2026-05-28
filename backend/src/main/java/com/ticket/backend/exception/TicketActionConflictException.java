package com.ticket.backend.exception;

public class TicketActionConflictException extends RuntimeException {

    public TicketActionConflictException(String message) {
        super(message);
    }

    public TicketActionConflictException(String message, Throwable cause) {
        super(message, cause);
    }
}
