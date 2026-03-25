package com.iks.backend.keycloak;

import java.util.List;
import java.util.Optional;

import org.keycloak.representations.idm.UserRepresentation;

public interface KeycloakService {

    String createGroup(String groupName);

    void updateGroup(String groupId, String groupName);

    void deleteGroup(String groupId);

    void addUserToGroup(String userId, String groupId);

    void removeUserFromGroup(String userId, String groupId);

    List<UserRepresentation> listGroupMembers(String groupId);

    List<String> listUserGroupIds(String userId);

    Optional<UserRepresentation> findUserByEmail(String email);

    String createUser(String email, List<String> requiredActions);

    void sendRequiredActionsEmail(String userId, String redirectUri, List<String> requiredActions);
}
