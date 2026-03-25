package com.iks.backend.keycloak;

import java.util.List;

import org.keycloak.representations.idm.UserRepresentation;

public interface KeycloakService {

    String createGroup(String groupName);

    void deleteGroup(String groupId);

    void addUserToGroup(String userId, String groupId);

    void removeUserFromGroup(String userId, String groupId);

    List<UserRepresentation> listGroupMembers(String groupId);
}
