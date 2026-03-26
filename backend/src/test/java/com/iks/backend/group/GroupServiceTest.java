package com.iks.backend.group;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import com.iks.backend.group.persistence.AppGroup;
import com.iks.backend.group.persistence.AppGroupRepository;
import com.iks.backend.keycloak.KeycloakService;
import com.iks.backend.user.UserLookupResult;

import org.keycloak.representations.idm.UserRepresentation;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
class GroupServiceTest {

    @Mock
    private AppGroupRepository appGroupRepository;

    @Mock
    private KeycloakService keycloakService;

    private GroupService groupService;

    @BeforeEach
    void setUp() {
        groupService = new GroupService(appGroupRepository, keycloakService, "http://frontend.local/");
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createGroupCreatesKeycloakGroupAndPersistsNormalizedData() {
        authenticateAs("owner-1");
        when(appGroupRepository.existsByNameIgnoreCase("Weekend Hikers")).thenReturn(false);
        when(keycloakService.createGroup("Weekend Hikers")).thenReturn("kc-group-1");
        when(appGroupRepository.saveAndFlush(any(AppGroup.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppGroup created = groupService.createGroup("  Weekend Hikers  ", "  Great outdoors  ");

        assertThat(created.getId()).isEqualTo("kc-group-1");
        assertThat(created.getName()).isEqualTo("Weekend Hikers");
        assertThat(created.getDescription()).isEqualTo("Great outdoors");
        assertThat(created.getOwnerId()).isEqualTo("owner-1");
        verify(keycloakService).addUserToGroup("owner-1", "kc-group-1");
    }

    @Test
    void createGroupThrowsWhenNameAlreadyExists() {
        authenticateAs("owner-1");
        when(appGroupRepository.existsByNameIgnoreCase("Weekend Hikers")).thenReturn(true);

        assertThatThrownBy(() -> groupService.createGroup("Weekend Hikers", null))
            .isInstanceOf(GroupAlreadyExistsException.class)
            .hasMessageContaining("Weekend Hikers");

        verify(keycloakService, never()).createGroup(any());
    }

    @Test
    void createGroupRollsBackKeycloakGroupWhenDatabaseSaveFailsWithUniqueConstraint() {
        authenticateAs("owner-1");
        when(appGroupRepository.existsByNameIgnoreCase("Weekend Hikers")).thenReturn(false);
        when(keycloakService.createGroup("Weekend Hikers")).thenReturn("kc-group-1");
        when(appGroupRepository.saveAndFlush(any(AppGroup.class)))
            .thenThrow(new DataIntegrityViolationException("duplicate"));

        assertThatThrownBy(() -> groupService.createGroup("Weekend Hikers", null))
            .isInstanceOf(GroupAlreadyExistsException.class);

        verify(keycloakService).deleteGroup("kc-group-1");
    }

    @Test
    void updateGroupRejectsNonOwner() {
        authenticateAs("someone-else");
        AppGroup group = new AppGroup("group-1", "Old Name", "desc", "owner-1");
        when(appGroupRepository.findById("group-1")).thenReturn(Optional.of(group));

        assertThatThrownBy(() -> groupService.updateGroup("group-1", "New Name", "new desc"))
            .isInstanceOf(GroupOwnershipException.class);
    }

    @Test
    void updateGroupUpdatesKeycloakNameWhenNameChanges() {
        authenticateAs("owner-1");
        AppGroup group = new AppGroup("group-1", "Old Name", "desc", "owner-1");
        when(appGroupRepository.findById("group-1")).thenReturn(Optional.of(group));
        when(appGroupRepository.existsByNameIgnoreCase("New Name")).thenReturn(false);
        when(appGroupRepository.saveAndFlush(group)).thenReturn(group);

        AppGroup updated = groupService.updateGroup("group-1", " New Name ", " new description ");

        assertThat(updated.getName()).isEqualTo("New Name");
        assertThat(updated.getDescription()).isEqualTo("new description");
        verify(keycloakService).updateGroup("group-1", "New Name");
    }

    @Test
    void addUserToGroupAddsExistingUserByUserId() {
        authenticateAs("owner-1");
        AppGroup group = new AppGroup("group-1", "Group", null, "owner-1");
        when(appGroupRepository.findById("group-1")).thenReturn(Optional.of(group));

        groupService.addUserToGroup("group-1", "  user-2  ", null);

        verify(keycloakService).addUserToGroup("user-2", "group-1");
        verify(keycloakService, never()).createUser(any(), any());
    }

    @Test
    void addUserToGroupInvitesNewUserByEmail() {
        authenticateAs("owner-1");
        AppGroup group = new AppGroup("group-1", "Group", null, "owner-1");
        when(appGroupRepository.findById("group-1")).thenReturn(Optional.of(group));
        when(keycloakService.findUserByEmail("new.user@example.com")).thenReturn(Optional.empty());
        when(keycloakService.createUser(eq("new.user@example.com"), any())).thenReturn("invited-user-id");

        groupService.addUserToGroup("group-1", null, "  new.user@example.com ");

        ArgumentCaptor<List<String>> actionsCaptor = ArgumentCaptor.forClass(List.class);
        verify(keycloakService).createUser(eq("new.user@example.com"), actionsCaptor.capture());
        assertThat(actionsCaptor.getValue())
            .containsExactly("UPDATE_PASSWORD", "UPDATE_PROFILE", "VERIFY_EMAIL");
        verify(keycloakService).addUserToGroup("invited-user-id", "group-1");
        verify(keycloakService).sendRequiredActionsEmail(
            eq("invited-user-id"),
            eq("http://frontend.local/groups/group-1"),
            any()
        );
    }

    @Test
    void addUserToGroupRejectsEmailInviteWhenKeycloakAccountAlreadyExists() {
        authenticateAs("owner-1");
        AppGroup group = new AppGroup("group-1", "Group", null, "owner-1");
        when(appGroupRepository.findById("group-1")).thenReturn(Optional.of(group));
        when(keycloakService.findUserByEmail("existing@example.com"))
            .thenReturn(Optional.of(new UserRepresentation()));

        assertThatThrownBy(() -> groupService.addUserToGroup("group-1", null, "existing@example.com"))
            .isInstanceOf(InvalidGroupMemberRequestException.class);
    }

    @Test
    void leaveGroupRejectsOwner() {
        authenticateAs("owner-1");
        AppGroup group = new AppGroup("group-1", "Group", null, "owner-1");
        when(appGroupRepository.findById("group-1")).thenReturn(Optional.of(group));

        assertThatThrownBy(() -> groupService.leaveGroup("group-1"))
            .isInstanceOf(GroupOwnershipException.class);
    }

    @Test
    void leaveGroupRemovesCurrentUserFromGroup() {
        authenticateAs("member-1");
        AppGroup group = new AppGroup("group-1", "Group", null, "owner-1");
        when(appGroupRepository.findById("group-1")).thenReturn(Optional.of(group));

        groupService.leaveGroup("group-1");

        verify(keycloakService).removeUserFromGroup("member-1", "group-1");
    }

    @Test
    void listMyGroupsSortsByNameIgnoringCase() {
        authenticateAs("user-1");
        AppGroup zeta = new AppGroup("g-2", "zeta", null, "owner-1");
        AppGroup alpha = new AppGroup("g-1", "Alpha", null, "owner-1");
        when(keycloakService.listUserGroupIds("user-1")).thenReturn(List.of("g-2", "g-1"));
        when(appGroupRepository.findAllById(List.of("g-2", "g-1"))).thenReturn(List.of(zeta, alpha));

        List<AppGroup> result = groupService.listMyGroups();

        assertThat(result).extracting(AppGroup::getName).containsExactly("Alpha", "zeta");
    }

    @Test
    void listGroupMembersFiltersEntriesWithoutIdOrEmail() {
        AppGroup group = new AppGroup("group-1", "Group", null, "owner-1");
        when(appGroupRepository.findById("group-1")).thenReturn(Optional.of(group));

        UserRepresentation valid = new UserRepresentation();
        valid.setId("user-1");
        valid.setFirstName("Jane");
        valid.setLastName("Doe");
        valid.setEmail("jane@example.com");

        UserRepresentation missingId = new UserRepresentation();
        missingId.setEmail("no-id@example.com");

        UserRepresentation missingEmailAndUsername = new UserRepresentation();
        missingEmailAndUsername.setId("user-2");

        when(keycloakService.listGroupMembers("group-1"))
            .thenReturn(List.of(valid, missingId, missingEmailAndUsername));

        List<UserLookupResult> members = groupService.listGroupMembers("group-1");

        assertThat(members).containsExactly(new UserLookupResult("user-1", "Jane Doe", "jane@example.com"));
    }

    private static void authenticateAs(String userId) {
        Jwt jwt = Jwt.withTokenValue("token")
            .header("alg", "none")
            .claim("sub", userId)
            .build();
        TestingAuthenticationToken authentication = new TestingAuthenticationToken(jwt, null, "ROLE_REGISTERED_USER");
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
