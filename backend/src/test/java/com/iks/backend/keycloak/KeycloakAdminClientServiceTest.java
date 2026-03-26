//package com.iks.backend.keycloak;
//
//import static org.assertj.core.api.Assertions.assertThat;
//import static org.assertj.core.api.Assertions.assertThatNoException;
//import static org.assertj.core.api.Assertions.assertThatThrownBy;
//import static org.mockito.ArgumentMatchers.any;
//import static org.mockito.ArgumentMatchers.anyString;
//import static org.mockito.Mockito.doThrow;
//import static org.mockito.Mockito.mockStatic;
//import static org.mockito.Mockito.verify;
//import static org.mockito.Mockito.when;
//
//import com.iks.backend.group.GroupAlreadyExistsException;
//import com.iks.backend.group.GroupNotFoundException;
//import com.iks.backend.user.UserNotFoundException;
//import jakarta.ws.rs.NotFoundException;
//import jakarta.ws.rs.core.Response;
//import java.net.URI;
//import java.util.ArrayList;
//import java.util.List;
//import java.util.Optional;
//import org.junit.jupiter.api.BeforeEach;
//import org.junit.jupiter.api.Test;
//import org.junit.jupiter.api.extension.ExtendWith;
//import org.keycloak.admin.client.Keycloak;
//import org.keycloak.admin.client.KeycloakBuilder;
//import org.keycloak.admin.client.resource.GroupResource;
//import org.keycloak.admin.client.resource.GroupsResource;
//import org.keycloak.admin.client.resource.RealmResource;
//import org.keycloak.admin.client.resource.UserResource;
//import org.keycloak.admin.client.resource.UsersResource;
//import org.keycloak.representations.idm.GroupRepresentation;
//import org.keycloak.representations.idm.UserRepresentation;
//import org.mockito.ArgumentCaptor;
//import org.mockito.Mock;
//import org.mockito.MockedStatic;
//import org.mockito.junit.jupiter.MockitoExtension;
//
//@ExtendWith(MockitoExtension.class)
//class KeycloakAdminClientServiceTest {
//
//  @Mock private KeycloakAdminProperties properties;
//  @Mock private KeycloakBuilder builder;
//  @Mock private Keycloak keycloak;
//  @Mock private RealmResource realmResource;
//  @Mock private GroupsResource groupsResource;
//  @Mock private GroupResource groupResource;
//  @Mock private UsersResource usersResource;
//  @Mock private UserResource userResource;
//
//  private KeycloakAdminClientService service;
//
//  @BeforeEach
//  void setUp() {
//    service = new KeycloakAdminClientService(properties);
//    when(properties.getBaseUrl()).thenReturn("http://keycloak.local/");
//    when(properties.getRealm()).thenReturn("drumdibum");
//    when(properties.getClientId()).thenReturn("backend-client");
//    when(properties.getClientSecret()).thenReturn("backend-secret");
//    when(properties.getInviteClientId()).thenReturn("frontend-client");
//    when(properties.getInviteActionsLifespanSeconds()).thenReturn(1800);
//
//    when(builder.serverUrl(anyString())).thenReturn(builder);
//    when(builder.realm(anyString())).thenReturn(builder);
//    when(builder.clientId(anyString())).thenReturn(builder);
//    when(builder.clientSecret(anyString())).thenReturn(builder);
//    when(builder.grantType(anyString())).thenReturn(builder);
//    when(builder.build()).thenReturn(keycloak);
//
//    when(keycloak.realm("drumdibum")).thenReturn(realmResource);
//    when(realmResource.groups()).thenReturn(groupsResource);
//    when(realmResource.users()).thenReturn(usersResource);
//    when(groupsResource.group(anyString())).thenReturn(groupResource);
//    when(usersResource.get(anyString())).thenReturn(userResource);
//  }
//
//  @Test
//  void createGroupReturnsCreatedIdAndUsesNormalizedServerUrl() {
//    Response response = Response.created(URI.create("http://keycloak.local/groups/group-1")).build();
//    when(groupsResource.add(any(GroupRepresentation.class))).thenReturn(response);
//
//    try (MockedStatic<KeycloakBuilder> keycloakBuilderMock = mockStatic(KeycloakBuilder.class)) {
//      keycloakBuilderMock.when(KeycloakBuilder::builder).thenReturn(builder);
//
//      String createdGroupId = service.createGroup("Weekend Hikers");
//
//      assertThat(createdGroupId).isEqualTo("group-1");
//      ArgumentCaptor<GroupRepresentation> representationCaptor =
//          ArgumentCaptor.forClass(GroupRepresentation.class);
//      verify(groupsResource).add(representationCaptor.capture());
//      assertThat(representationCaptor.getValue().getName()).isEqualTo("Weekend Hikers");
//      verify(builder).serverUrl("http://keycloak.local");
//    }
//  }
//
//  @Test
//  void createGroupThrowsConflictWhenGroupAlreadyExists() {
//    Response response = Response.status(409).build();
//    when(groupsResource.add(any(GroupRepresentation.class))).thenReturn(response);
//
//    try (MockedStatic<KeycloakBuilder> keycloakBuilderMock = mockStatic(KeycloakBuilder.class)) {
//      keycloakBuilderMock.when(KeycloakBuilder::builder).thenReturn(builder);
//
//      assertThatThrownBy(() -> service.createGroup("Weekend Hikers"))
//          .isInstanceOf(GroupAlreadyExistsException.class);
//    }
//  }
//
//  @Test
//  void createGroupWrapsUnexpectedStatuses() {
//    Response response = Response.status(500).build();
//    when(groupsResource.add(any(GroupRepresentation.class))).thenReturn(response);
//
//    try (MockedStatic<KeycloakBuilder> keycloakBuilderMock = mockStatic(KeycloakBuilder.class)) {
//      keycloakBuilderMock.when(KeycloakBuilder::builder).thenReturn(builder);
//
//      assertThatThrownBy(() -> service.createGroup("Weekend Hikers"))
//          .isInstanceOf(KeycloakServiceException.class)
//          .hasMessageContaining("Failed to create group in Keycloak");
//    }
//  }
//
//  @Test
//  void updateGroupUpdatesName() {
//    GroupRepresentation representation = new GroupRepresentation();
//    representation.setName("Old");
//    when(groupResource.toRepresentation()).thenReturn(representation);
//
//    try (MockedStatic<KeycloakBuilder> keycloakBuilderMock = mockStatic(KeycloakBuilder.class)) {
//      keycloakBuilderMock.when(KeycloakBuilder::builder).thenReturn(builder);
//
//      service.updateGroup("group-1", "New");
//
//      assertThat(representation.getName()).isEqualTo("New");
//      verify(groupResource).update(representation);
//    }
//  }
//
//  @Test
//  void updateGroupThrowsWhenGroupDoesNotExist() {
//    when(groupResource.toRepresentation()).thenThrow(new NotFoundException("missing"));
//
//    try (MockedStatic<KeycloakBuilder> keycloakBuilderMock = mockStatic(KeycloakBuilder.class)) {
//      keycloakBuilderMock.when(KeycloakBuilder::builder).thenReturn(builder);
//
//      assertThatThrownBy(() -> service.updateGroup("missing", "New"))
//          .isInstanceOf(GroupNotFoundException.class);
//    }
//  }
//
//  @Test
//  void deleteGroupIgnoresMissingGroup() {
//    doThrow(new NotFoundException("missing")).when(groupResource).remove();
//
//    try (MockedStatic<KeycloakBuilder> keycloakBuilderMock = mockStatic(KeycloakBuilder.class)) {
//      keycloakBuilderMock.when(KeycloakBuilder::builder).thenReturn(builder);
//
//      assertThatNoException().isThrownBy(() -> service.deleteGroup("missing"));
//    }
//  }
//
//  @Test
//  void addUserToGroupThrowsForMissingUserOrGroup() {
//    when(userResource.toRepresentation()).thenThrow(new NotFoundException("user missing"));
//
//    try (MockedStatic<KeycloakBuilder> keycloakBuilderMock = mockStatic(KeycloakBuilder.class)) {
//      keycloakBuilderMock.when(KeycloakBuilder::builder).thenReturn(builder);
//
//      assertThatThrownBy(() -> service.addUserToGroup("user-1", "group-1"))
//          .isInstanceOf(UserNotFoundException.class);
//    }
//
//    when(userResource.toRepresentation()).thenReturn(new UserRepresentation());
//    when(groupResource.toRepresentation()).thenThrow(new NotFoundException("group missing"));
//
//    try (MockedStatic<KeycloakBuilder> keycloakBuilderMock = mockStatic(KeycloakBuilder.class)) {
//      keycloakBuilderMock.when(KeycloakBuilder::builder).thenReturn(builder);
//
//      assertThatThrownBy(() -> service.addUserToGroup("user-1", "group-1"))
//          .isInstanceOf(GroupNotFoundException.class);
//    }
//  }
//
//  @Test
//  void removeUserFromGroupLeavesMembership() {
//    when(userResource.toRepresentation()).thenReturn(new UserRepresentation());
//    when(groupResource.toRepresentation()).thenReturn(new GroupRepresentation());
//
//    try (MockedStatic<KeycloakBuilder> keycloakBuilderMock = mockStatic(KeycloakBuilder.class)) {
//      keycloakBuilderMock.when(KeycloakBuilder::builder).thenReturn(builder);
//
//      service.removeUserFromGroup("user-1", "group-1");
//
//      verify(userResource).leaveGroup("group-1");
//    }
//  }
//
//  @Test
//  void listGroupMembersPaginatesAndFiltersDisabledUsers() {
//    when(groupResource.toRepresentation()).thenReturn(new GroupRepresentation());
//
//    List<UserRepresentation> firstPage = new ArrayList<>();
//    for (int i = 0; i < 100; i++) {
//      UserRepresentation user = new UserRepresentation();
//      user.setId("u-" + i);
//      user.setEnabled(true);
//      firstPage.add(user);
//    }
//
//    UserRepresentation enabledSecondPage = new UserRepresentation();
//    enabledSecondPage.setId("u-100");
//    enabledSecondPage.setEnabled(null);
//
//    UserRepresentation disabledSecondPage = new UserRepresentation();
//    disabledSecondPage.setId("u-disabled");
//    disabledSecondPage.setEnabled(false);
//
//    when(groupResource.members(0, 100)).thenReturn(firstPage);
//    when(groupResource.members(100, 100)).thenReturn(List.of(enabledSecondPage, disabledSecondPage));
//
//    try (MockedStatic<KeycloakBuilder> keycloakBuilderMock = mockStatic(KeycloakBuilder.class)) {
//      keycloakBuilderMock.when(KeycloakBuilder::builder).thenReturn(builder);
//
//      List<UserRepresentation> members = service.listGroupMembers("group-1");
//
//      assertThat(members).extracting(UserRepresentation::getId).contains("u-0", "u-100");
//      assertThat(members).extracting(UserRepresentation::getId).doesNotContain("u-disabled");
//    }
//  }
//
//  @Test
//  void listUserGroupIdsFiltersBlankIdsAndHandlesNullGroupList() {
//    when(userResource.toRepresentation()).thenReturn(new UserRepresentation());
//    GroupRepresentation g1 = new GroupRepresentation();
//    g1.setId("g-1");
//    GroupRepresentation gBlank = new GroupRepresentation();
//    gBlank.setId("  ");
//
//    when(userResource.groups()).thenReturn(List.of(g1, gBlank));
//
//    try (MockedStatic<KeycloakBuilder> keycloakBuilderMock = mockStatic(KeycloakBuilder.class)) {
//      keycloakBuilderMock.when(KeycloakBuilder::builder).thenReturn(builder);
//      assertThat(service.listUserGroupIds("user-1")).containsExactly("g-1");
//    }
//
//    when(userResource.groups()).thenReturn(null);
//
//    try (MockedStatic<KeycloakBuilder> keycloakBuilderMock = mockStatic(KeycloakBuilder.class)) {
//      keycloakBuilderMock.when(KeycloakBuilder::builder).thenReturn(builder);
//      assertThat(service.listUserGroupIds("user-1")).isEmpty();
//    }
//  }
//
//  @Test
//  void findUserByEmailMatchesNormalizedEmail() {
//    UserRepresentation nonMatching = new UserRepresentation();
//    nonMatching.setEmail("other@example.com");
//
//    UserRepresentation matching = new UserRepresentation();
//    matching.setEmail("USER@EXAMPLE.COM");
//
//    when(usersResource.searchByEmail("user@example.com", true)).thenReturn(List.of(nonMatching, matching));
//
//    try (MockedStatic<KeycloakBuilder> keycloakBuilderMock = mockStatic(KeycloakBuilder.class)) {
//      keycloakBuilderMock.when(KeycloakBuilder::builder).thenReturn(builder);
//
//      Optional<UserRepresentation> result = service.findUserByEmail("user@example.com");
//
//      assertThat(result).contains(matching);
//    }
//  }
//
//  @Test
//  void createUserCreatesEnabledUnverifiedUserAndReturnsCreatedId() {
//    Response response = Response.created(URI.create("http://keycloak.local/users/u-123")).build();
//    when(usersResource.create(any(UserRepresentation.class))).thenReturn(response);
//
//    try (MockedStatic<KeycloakBuilder> keycloakBuilderMock = mockStatic(KeycloakBuilder.class)) {
//      keycloakBuilderMock.when(KeycloakBuilder::builder).thenReturn(builder);
//
//      String userId = service.createUser("new.user@example.com", List.of("VERIFY_EMAIL"));
//
//      assertThat(userId).isEqualTo("u-123");
//      ArgumentCaptor<UserRepresentation> captor = ArgumentCaptor.forClass(UserRepresentation.class);
//      verify(usersResource).create(captor.capture());
//      UserRepresentation created = captor.getValue();
//      assertThat(created.getUsername()).isEqualTo("new.user@example.com");
//      assertThat(created.getEmail()).isEqualTo("new.user@example.com");
//      assertThat(created.isEnabled()).isTrue();
//      assertThat(created.isEmailVerified()).isFalse();
//      assertThat(created.getRequiredActions()).containsExactly("VERIFY_EMAIL");
//    }
//  }
//
//  @Test
//  void createUserThrowsWhenConflictOrUnexpectedStatus() {
//    when(usersResource.create(any(UserRepresentation.class))).thenReturn(Response.status(409).build());
//
//    try (MockedStatic<KeycloakBuilder> keycloakBuilderMock = mockStatic(KeycloakBuilder.class)) {
//      keycloakBuilderMock.when(KeycloakBuilder::builder).thenReturn(builder);
//
//      assertThatThrownBy(() -> service.createUser("existing@example.com", List.of("VERIFY_EMAIL")))
//          .isInstanceOf(KeycloakServiceException.class)
//          .hasMessageContaining("User already exists");
//    }
//
//    when(usersResource.create(any(UserRepresentation.class))).thenReturn(Response.status(500).build());
//
//    try (MockedStatic<KeycloakBuilder> keycloakBuilderMock = mockStatic(KeycloakBuilder.class)) {
//      keycloakBuilderMock.when(KeycloakBuilder::builder).thenReturn(builder);
//
//      assertThatThrownBy(() -> service.createUser("new@example.com", List.of("VERIFY_EMAIL")))
//          .isInstanceOf(KeycloakServiceException.class)
//          .hasMessageContaining("status: 500");
//    }
//  }
//
//  @Test
//  void sendRequiredActionsEmailDelegatesWithConfiguredClientAndLifespan() {
//    when(userResource.toRepresentation()).thenReturn(new UserRepresentation());
//
//    try (MockedStatic<KeycloakBuilder> keycloakBuilderMock = mockStatic(KeycloakBuilder.class)) {
//      keycloakBuilderMock.when(KeycloakBuilder::builder).thenReturn(builder);
//
//      service.sendRequiredActionsEmail(
//          "user-1", "http://frontend.local/groups/g-1", List.of("UPDATE_PASSWORD"));
//
//      verify(userResource)
//          .executeActionsEmail(
//              "frontend-client", "http://frontend.local/groups/g-1", 1800, List.of("UPDATE_PASSWORD"));
//    }
//
//    when(userResource.toRepresentation()).thenThrow(new NotFoundException("missing user"));
//
//    try (MockedStatic<KeycloakBuilder> keycloakBuilderMock = mockStatic(KeycloakBuilder.class)) {
//      keycloakBuilderMock.when(KeycloakBuilder::builder).thenReturn(builder);
//
//      assertThatThrownBy(
//              () ->
//                  service.sendRequiredActionsEmail(
//                      "user-1", "http://frontend.local/groups/g-1", List.of("UPDATE_PASSWORD")))
//          .isInstanceOf(UserNotFoundException.class);
//    }
//  }
//
//  @Test
//  void updateAndDeleteUserUseExistingRepresentation() {
//    UserRepresentation representation = new UserRepresentation();
//    when(userResource.toRepresentation()).thenReturn(representation);
//
//    try (MockedStatic<KeycloakBuilder> keycloakBuilderMock = mockStatic(KeycloakBuilder.class)) {
//      keycloakBuilderMock.when(KeycloakBuilder::builder).thenReturn(builder);
//
//      service.updateUser("user-1", "Jane", "Doe", "jane@example.com");
//      service.deleteUser("user-1");
//
//      assertThat(representation.getFirstName()).isEqualTo("Jane");
//      assertThat(representation.getLastName()).isEqualTo("Doe");
//      assertThat(representation.getEmail()).isEqualTo("jane@example.com");
//      verify(userResource).update(representation);
//      verify(userResource).remove();
//    }
//  }
//}
