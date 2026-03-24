package com.iks.backend.group;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class GroupAlreadyExistsException extends RuntimeException {

    public GroupAlreadyExistsException(String groupName) {
        super("Group already exists: " + groupName);
    }

    public GroupAlreadyExistsException(String groupName, Throwable cause) {
        super("Group already exists: " + groupName, cause);
    }
}
