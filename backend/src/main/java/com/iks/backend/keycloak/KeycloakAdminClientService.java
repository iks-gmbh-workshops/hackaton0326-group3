package com.iks.backend.keycloak;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import com.iks.backend.group.GroupAlreadyExistsException;
import com.iks.backend.group.GroupNotFoundException;
import com.iks.backend.user.UserNotFoundException;

import jakarta.ws.rs    .NotFoundException;
import jakarta.ws.rs.core.Response;

import org.keycloak.OAuth2Constants;
import org.keycloak.admin.client.CreatedResponseUtil;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.keycloak.admin.client.resource.GroupResource;
import org.keycloak.admin.client.resource.GroupsResource;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.UserResource;
import org.keycloak.representations.idm.GroupRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class KeycloakAdminClientService implements KeycloakService {

    private static final Logger log = LoggerFactory.getLogger(KeycloakAdminClientService.class);
    private final KeycloakAdminProperties properties;

    public KeycloakAdminClientService(KeycloakAdminProperties properties) {
        this.properties = properties;
    }

    @Override
    public String createGroup(String groupName) {
        try (Keycloak keycloak = buildAdminClient()) {
            RealmResource realm = keycloak.realm(properties.getRealm());
            GroupsResource groups = realm.groups();

            GroupRepresentation representation = new GroupRepresentation();
            representation.setName(groupName);

            Response response = groups.add(representation);
            try {
                int status = response.getStatus();
                if (status == 409) {
                    throw new GroupAlreadyExistsException(groupName);
                }
                if (status != 201) {
                    throw new KeycloakServiceException("Failed to create group in Keycloak, status: " + status);
                }

                String createdGroupId = CreatedResponseUtil.getCreatedId(response);
                if (createdGroupId == null || createdGroupId.isBlank()) {
                    throw new KeycloakServiceException("Keycloak did not return an id for the created group");
                }
                return createdGroupId;
            } finally {
                response.close();
            }
        } catch (GroupAlreadyExistsException conflict) {
            throw conflict;
        } catch (RuntimeException runtimeException) {
            throw new KeycloakServiceException("Failed to create group in Keycloak", runtimeException);
        }
    }

    @Override
    public void updateGroup(String groupId, String groupName) {
        try (Keycloak keycloak = buildAdminClient()) {
            RealmResource realm = keycloak.realm(properties.getRealm());
            GroupResource groupResource = realm.groups().group(groupId);
            
            GroupRepresentation representation;
            try {
                representation = groupResource.toRepresentation();
            } catch (NotFoundException notFound) {
                throw new GroupNotFoundException(groupId);
            }
            
            representation.setName(groupName);
            groupResource.update(representation);
        } catch (GroupNotFoundException missingGroup) {
            throw missingGroup;
        } catch (RuntimeException runtimeException) {
            throw new KeycloakServiceException("Failed to update group in Keycloak", runtimeException);
        }
    }

    @Override
    public void deleteGroup(String groupId) {
        try (Keycloak keycloak = buildAdminClient()) {
            RealmResource realm = keycloak.realm(properties.getRealm());
            GroupResource groupResource = realm.groups().group(groupId);
            groupResource.remove();
        } catch (NotFoundException notFound) {
            // Group already absent; compensation still considered complete.
        } catch (RuntimeException runtimeException) {
            throw new KeycloakServiceException("Failed to delete group in Keycloak", runtimeException);
        }
    }

    @Override
    public void addUserToGroup(String userId, String groupId) {
        try (Keycloak keycloak = buildAdminClient()) {
            RealmResource realm = keycloak.realm(properties.getRealm());

            UserResource userResource = realm.users().get(userId);
            try {
                userResource.toRepresentation();
            } catch (NotFoundException notFound) {
                throw new UserNotFoundException(userId);
            }

            GroupResource groupResource = realm.groups().group(groupId);
            try {
                groupResource.toRepresentation();
            } catch (NotFoundException notFound) {
                throw new GroupNotFoundException(groupId);
            }

            userResource.joinGroup(groupId);
        } catch (UserNotFoundException | GroupNotFoundException missingResource) {
            throw missingResource;
        } catch (RuntimeException runtimeException) {
            throw new KeycloakServiceException("Failed to add user to Keycloak group", runtimeException);
        }
    }

    @Override
    public void removeUserFromGroup(String userId, String groupId) {
        try (Keycloak keycloak = buildAdminClient()) {
            RealmResource realm = keycloak.realm(properties.getRealm());

            UserResource userResource = realm.users().get(userId);
            try {
                userResource.toRepresentation();
            } catch (NotFoundException notFound) {
                throw new UserNotFoundException(userId);
            }

            GroupResource groupResource = realm.groups().group(groupId);
            try {
                groupResource.toRepresentation();
            } catch (NotFoundException notFound) {
                throw new GroupNotFoundException(groupId);
            }

            userResource.leaveGroup(groupId);
        } catch (UserNotFoundException | GroupNotFoundException missingResource) {
            throw missingResource;
        } catch (RuntimeException runtimeException) {
            throw new KeycloakServiceException("Failed to remove user from Keycloak group", runtimeException);
        }
    }

    @Override
    public List<UserRepresentation> listGroupMembers(String groupId) {
        try (Keycloak keycloak = buildAdminClient()) {
            RealmResource realm = keycloak.realm(properties.getRealm());
            GroupResource groupResource = realm.groups().group(groupId);
            try {
                groupResource.toRepresentation();
            } catch (NotFoundException notFound) {
                throw new GroupNotFoundException(groupId);
            }

            List<UserRepresentation> members = new ArrayList<>();
            int first = 0;
            int max = 100;

            while (true) {
                List<UserRepresentation> page = groupResource.members(first, max);
                if (page == null || page.isEmpty()) {
                    break;
                }

                members.addAll(page);
                if (page.size() < max) {
                    break;
                }
                first += page.size();
            }

            return members.stream()
                .filter(user -> user.isEnabled() == null || user.isEnabled())
                .toList();
        } catch (GroupNotFoundException missingGroup) {
            throw missingGroup;
        } catch (RuntimeException runtimeException) {
            throw new KeycloakServiceException("Failed to list group members from Keycloak", runtimeException);
        }
    }

    @Override
    public List<String> listUserGroupIds(String userId) {
        try (Keycloak keycloak = buildAdminClient()) {
            RealmResource realm = keycloak.realm(properties.getRealm());
            UserResource userResource = realm.users().get(userId);

            try {
                userResource.toRepresentation();
            } catch (NotFoundException notFound) {
                throw new UserNotFoundException(userId);
            }

            List<GroupRepresentation> groups = userResource.groups();
            if (groups == null) {
                return List.of();
            }

            return groups.stream()
                .map(GroupRepresentation::getId)
                .filter(id -> id != null && !id.isBlank())
                .toList();
        } catch (UserNotFoundException missingUser) {
            throw missingUser;
        } catch (RuntimeException runtimeException) {
            throw new KeycloakServiceException("Failed to list user groups from Keycloak", runtimeException);
        }
    }

    @Override
    public Optional<UserRepresentation> findUserByEmail(String email) {
        try (Keycloak keycloak = buildAdminClient()) {
            RealmResource realm = keycloak.realm(properties.getRealm());
            Optional<UserRepresentation> user = realm.users().searchByEmail(email, true).stream()
                .filter(u -> equalsEmail(u.getEmail(), email))
                .findFirst();
            log.debug("Keycloak email lookup for email={} found={}", email, user.isPresent());
            return user;
        } catch (RuntimeException runtimeException) {
            throw new KeycloakServiceException("Failed to search user by email in Keycloak", runtimeException);
        }
    }

    @Override
    public String createUser(String email, List<String> requiredActions) {
        try (Keycloak keycloak = buildAdminClient()) {
            RealmResource realm = keycloak.realm(properties.getRealm());

            UserRepresentation representation = new UserRepresentation();
            representation.setUsername(email);
            representation.setEmail(email);
            representation.setEnabled(true);
            representation.setEmailVerified(false);
            representation.setRequiredActions(requiredActions);
            log.debug("Creating Keycloak user for email={} with requiredActions={}", email, requiredActions);

            Response response = realm.users().create(representation);
            try {
                int status = response.getStatus();
                if (status == 409) {
                    throw new KeycloakServiceException("User already exists in Keycloak");
                }
                if (status != 201) {
                    throw new KeycloakServiceException("Failed to create user in Keycloak, status: " + status);
                }

                String createdUserId = CreatedResponseUtil.getCreatedId(response);
                if (createdUserId == null || createdUserId.isBlank()) {
                    throw new KeycloakServiceException("Keycloak did not return an id for the created user");
                }
                log.debug("Created Keycloak user email={} userId={}", email, createdUserId);
                return createdUserId;
            } finally {
                response.close();
            }
        } catch (KeycloakServiceException keycloakServiceException) {
            throw keycloakServiceException;
        } catch (RuntimeException runtimeException) {
            throw new KeycloakServiceException("Failed to create user in Keycloak", runtimeException);
        }
    }

    @Override
    public void sendRequiredActionsEmail(String userId, String redirectUri, List<String> requiredActions) {
        try (Keycloak keycloak = buildAdminClient()) {
            RealmResource realm = keycloak.realm(properties.getRealm());
            UserResource userResource = realm.users().get(userId);
            try {
                userResource.toRepresentation();
            } catch (NotFoundException notFound) {
                throw new UserNotFoundException(userId);
            }

            userResource.executeActionsEmail(
                properties.getInviteClientId(),
                redirectUri,
                properties.getInviteActionsLifespanSeconds(),
                requiredActions
            );
            log.debug(
                "Triggered Keycloak required-actions email for userId={} clientId={} redirectUri={} actions={}",
                userId,
                properties.getInviteClientId(),
                redirectUri,
                requiredActions
            );
        } catch (UserNotFoundException missingUser) {
            throw missingUser;
        } catch (RuntimeException runtimeException) {
            throw new KeycloakServiceException("Failed to send required-actions email via Keycloak", runtimeException);
        }
    }

    @Override
    public void updateUser(String userId, String firstName, String lastName, String email) {
        try (Keycloak keycloak = buildAdminClient()) {
            RealmResource realm = keycloak.realm(properties.getRealm());
            UserResource userResource = realm.users().get(userId);
            
            UserRepresentation representation;
            try {
                representation = userResource.toRepresentation();
            } catch (NotFoundException notFound) {
                throw new UserNotFoundException(userId);
            }
            
            representation.setFirstName(firstName);
            representation.setLastName(lastName);
            representation.setEmail(email);
            
            try {
                userResource.update(representation);
                log.debug("Updated Keycloak user userId={} firstName={} lastName={} email={}", userId, firstName, lastName, email);
            } catch (RuntimeException updateException) {
                log.error("Failed to update user in Keycloak: userId={} firstName={} lastName={} email={} error={}", 
                    userId, firstName, lastName, email, updateException.getMessage(), updateException);
                throw updateException;
            }
        } catch (UserNotFoundException missingUser) {
            throw missingUser;
        } catch (RuntimeException runtimeException) {
            throw new KeycloakServiceException("Failed to update user in Keycloak", runtimeException);
        }
    }

    @Override
    public void deleteUser(String userId) {
        try (Keycloak keycloak = buildAdminClient()) {
            RealmResource realm = keycloak.realm(properties.getRealm());
            UserResource userResource = realm.users().get(userId);
            try {
                userResource.toRepresentation();
            } catch (NotFoundException notFound) {
                throw new UserNotFoundException(userId);
            }
            userResource.remove();
            log.debug("Deleted Keycloak user userId={}", userId);
        } catch (UserNotFoundException missingUser) {
            throw missingUser;
        } catch (RuntimeException runtimeException) {
            throw new KeycloakServiceException("Failed to delete user in Keycloak", runtimeException);
        }
    }

    private static boolean equalsEmail(String left, String right) {
        if (left == null || right == null) {
            return false;
        }
        return left.trim().equalsIgnoreCase(right.trim());
    }

    private Keycloak buildAdminClient() {
        String serverUrl = properties.getBaseUrl();
        if (serverUrl.endsWith("/")) {
            serverUrl = serverUrl.substring(0, serverUrl.length() - 1);
        }

        return KeycloakBuilder.builder()
            .serverUrl(serverUrl)
            .realm(properties.getRealm())
            .clientId(properties.getClientId())
            .clientSecret(properties.getClientSecret())
            .grantType(OAuth2Constants.CLIENT_CREDENTIALS)
            .build();
    }
}
