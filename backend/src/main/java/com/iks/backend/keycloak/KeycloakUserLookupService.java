package com.iks.backend.keycloak;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.keycloak.OAuth2Constants;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.stereotype.Service;

@Service
public class KeycloakUserLookupService {

    private final KeycloakAdminProperties properties;

    public KeycloakUserLookupService(KeycloakAdminProperties properties) {
        this.properties = properties;
    }

    public List<UserRepresentation> searchUsersByNameOrEmail(String query, int maxResults) {
        try (Keycloak keycloak = buildAdminClient()) {
            UsersResource usersResource = keycloak.realm(properties.getRealm()).users();
            Map<String, UserRepresentation> uniqueUsers = new LinkedHashMap<>();

            addResults(uniqueUsers, usersResource.search(query, 0, maxResults));
            if (query.contains("@")) {
                addResults(uniqueUsers, usersResource.searchByEmail(query, false));
            }

            return uniqueUsers.values().stream()
                .filter(user -> user.isEnabled() == null || user.isEnabled())
                .limit(maxResults)
                .toList();
        } catch (RuntimeException runtimeException) {
            throw new KeycloakServiceException("Failed to search users in Keycloak", runtimeException);
        }
    }

    private static void addResults(Map<String, UserRepresentation> uniqueUsers, List<UserRepresentation> users) {
        for (UserRepresentation user : users) {
            if (user == null) {
                continue;
            }
            String id = user.getId();
            if (id == null || id.isBlank()) {
                continue;
            }
            uniqueUsers.putIfAbsent(id, user);
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
