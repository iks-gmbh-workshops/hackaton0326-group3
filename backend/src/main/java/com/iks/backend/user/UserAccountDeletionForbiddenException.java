package com.iks.backend.user;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class UserAccountDeletionForbiddenException extends RuntimeException {

  public UserAccountDeletionForbiddenException(String message) {
    super(message);
  }
}
