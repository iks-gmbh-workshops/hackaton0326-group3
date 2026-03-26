package com.iks.backend.group;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class GroupOwnershipException extends RuntimeException {

  public GroupOwnershipException(String message) {
    super(message);
  }
}
