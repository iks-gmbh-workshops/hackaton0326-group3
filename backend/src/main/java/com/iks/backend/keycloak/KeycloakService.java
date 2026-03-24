package com.iks.backend.keycloak;

public interface KeycloakService {

    String createGroup(String groupName);

    void deleteGroup(String groupId);
}
