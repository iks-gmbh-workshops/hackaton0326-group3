package com.iks.backend.activity;

public class InvalidActivityRequestException extends RuntimeException {

    public InvalidActivityRequestException(String message) {
        super(message);
    }

    public InvalidActivityRequestException(String message, Throwable cause) {
        super(message, cause);
    }
}
