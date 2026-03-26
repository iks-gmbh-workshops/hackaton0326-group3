package com.iks.backend.user;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidUserSearchRequestException extends RuntimeException {

  public InvalidUserSearchRequestException(String message) {
    super(message);
  }
}
