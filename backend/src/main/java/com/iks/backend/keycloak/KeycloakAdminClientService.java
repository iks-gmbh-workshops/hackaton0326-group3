package com.iks.backend.keycloak;

import com.iks.backend.group.GroupAlreadyExistsException;

import jakarta.ws.rs    .NotFoundException;
import jakarta.ws.rs.core.Response;

import org.keycloak.OAuth2Constants;
import org.keycloak.admin.client.CreatedResponseUtil;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.keycloak.admin.client.resource.GroupResource;
import org.keycloak.admin.client.resource.GroupsResource;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.representations.idm.GroupRepresentation;
import org.springframework.stereotype.Service;

@Service
public class KeycloakAdminClientService implements KeycloakService {

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
