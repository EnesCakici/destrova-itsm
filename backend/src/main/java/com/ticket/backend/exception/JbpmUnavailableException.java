package com.ticket.backend.exception;

public class JbpmUnavailableException extends RuntimeException {

    public JbpmUnavailableException(String message) {
        super(message);
    }

    public JbpmUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
