package com.iks.backend.user;

import java.util.List;
import java.util.Optional;

import com.iks.backend.keycloak.KeycloakUserLookupService;

import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private static final int MAX_RESULTS = 20;

    private final KeycloakUserLookupService keycloakUserLookupService;

    public UserService(KeycloakUserLookupService keycloakUserLookupService) {
        this.keycloakUserLookupService = keycloakUserLookupService;
    }

    @Transactional(readOnly = true)
    public List<UserLookupResult> searchByNameOrEmail(String rawQuery) {
        String query = normalizeQuery(rawQuery);

        return keycloakUserLookupService.searchUsersByNameOrEmail(query, MAX_RESULTS).stream()
            .map(UserService::mapUser)
            .flatMap(Optional::stream)
            .toList();
    }

    private static Optional<UserLookupResult> mapUser(UserRepresentation userRepresentation) {
        String id = firstNonBlank(userRepresentation.getId());
        if (id == null) {
            return Optional.empty();
        }

        String email = firstNonBlank(userRepresentation.getEmail(), userRepresentation.getUsername());
        if (email == null) {
            return Optional.empty();
        }

        String fullName = firstNonBlank(
            joinName(userRepresentation.getFirstName(), userRepresentation.getLastName()),
            userRepresentation.getUsername(),
            email
        );

        return Optional.of(new UserLookupResult(id, fullName, email));
    }

    private static String joinName(String firstName, String lastName) {
        String normalizedFirstName = firstNonBlank(firstName);
        String normalizedLastName = firstNonBlank(lastName);

        if (normalizedFirstName == null && normalizedLastName == null) {
            return "";
        }
        if (normalizedFirstName == null) {
            return normalizedLastName;
        }
        if (normalizedLastName == null) {
            return normalizedFirstName;
        }
        return normalizedFirstName + " " + normalizedLastName;
    }

    private static String normalizeQuery(String rawQuery) {
        String query = firstNonBlank(rawQuery);
        if (query == null) {
            throw new InvalidUserSearchRequestException("Search query is required");
        }
        if (query.length() < 2) {
            throw new InvalidUserSearchRequestException("Search query must be at least 2 characters");
        }
        return query;
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null) {
                String trimmed = value.trim();
                if (!trimmed.isEmpty()) {
                    return trimmed;
                }
            }
        }
        return null;
    }
}
