package com.iks.backend.keycloak;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.UserRepresentation;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class KeycloakUserLookupServiceTest {

  @Mock private KeycloakAdminProperties properties;
  @Mock private KeycloakBuilder builder;
  @Mock private Keycloak keycloak;
  @Mock private RealmResource realmResource;
  @Mock private UsersResource usersResource;

  private KeycloakUserLookupService service;

  @BeforeEach
  void setUp() {
    service = new KeycloakUserLookupService(properties);
    when(properties.getBaseUrl()).thenReturn("http://keycloak.local/");
    when(properties.getRealm()).thenReturn("drumdibum");
    when(properties.getClientId()).thenReturn("client-id");
    when(properties.getClientSecret()).thenReturn("client-secret");

    when(builder.serverUrl(anyString())).thenReturn(builder);
    when(builder.realm(anyString())).thenReturn(builder);
    when(builder.clientId(anyString())).thenReturn(builder);
    when(builder.clientSecret(anyString())).thenReturn(builder);
    when(builder.grantType(anyString())).thenReturn(builder);
    when(builder.build()).thenReturn(keycloak);

    when(keycloak.realm("drumdibum")).thenReturn(realmResource);
    when(realmResource.users()).thenReturn(usersResource);
  }

  @Test
  void searchUsersByNameOrEmailDeduplicatesFiltersAndLimits() {
    UserRepresentation user1 = user("u-1", true);
    UserRepresentation duplicateUser1 = user("u-1", true);
    UserRepresentation user2Disabled = user("u-2", false);
    UserRepresentation user3 = user("u-3", null);
    UserRepresentation missingId = user(" ", true);

    when(usersResource.search("jane@example.com", 0, 2))
        .thenReturn(List.of(user1, user2Disabled, missingId));
    when(usersResource.searchByEmail("jane@example.com", false))
        .thenReturn(List.of(duplicateUser1, user3));

    try (MockedStatic<KeycloakBuilder> keycloakBuilderMock = mockStatic(KeycloakBuilder.class)) {
      keycloakBuilderMock.when(KeycloakBuilder::builder).thenReturn(builder);

      List<UserRepresentation> result = service.searchUsersByNameOrEmail("jane@example.com", 2);

      assertThat(result).extracting(UserRepresentation::getId).containsExactly("u-1", "u-3");
      verify(builder).serverUrl("http://keycloak.local");
      verify(usersResource).searchByEmail("jane@example.com", false);
    }
  }

  @Test
  void searchUsersByNameOrEmailSkipsEmailLookupForPlainTextQueries() {
    when(usersResource.search("jane", 0, 20)).thenReturn(List.of(user("u-1", true)));

    try (MockedStatic<KeycloakBuilder> keycloakBuilderMock = mockStatic(KeycloakBuilder.class)) {
      keycloakBuilderMock.when(KeycloakBuilder::builder).thenReturn(builder);

      List<UserRepresentation> result = service.searchUsersByNameOrEmail("jane", 20);

      assertThat(result).extracting(UserRepresentation::getId).containsExactly("u-1");
      verify(usersResource, never()).searchByEmail(anyString(), eq(false));
    }
  }

  @Test
  void searchUsersByNameOrEmailWrapsRuntimeFailures() {
    when(usersResource.search("jane", 0, 20)).thenThrow(new RuntimeException("keycloak unavailable"));

    try (MockedStatic<KeycloakBuilder> keycloakBuilderMock = mockStatic(KeycloakBuilder.class)) {
      keycloakBuilderMock.when(KeycloakBuilder::builder).thenReturn(builder);

      assertThatThrownBy(() -> service.searchUsersByNameOrEmail("jane", 20))
          .isInstanceOf(KeycloakServiceException.class)
          .hasMessageContaining("Failed to search users in Keycloak")
          .hasRootCauseMessage("keycloak unavailable");
    }
  }

  private static UserRepresentation user(String id, Boolean enabled) {
    UserRepresentation user = new UserRepresentation();
    user.setId(id);
    user.setEnabled(enabled);
    return user;
  }
}
