package com.iks.backend.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.iks.backend.activity.persistence.ActivityAttendanceRepository;
import com.iks.backend.group.persistence.AppGroup;
import com.iks.backend.group.persistence.AppGroupRepository;
import com.iks.backend.keycloak.KeycloakService;
import com.iks.backend.keycloak.KeycloakUserLookupService;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.keycloak.representations.idm.UserRepresentation;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

  @Mock private KeycloakUserLookupService keycloakUserLookupService;

  @Mock private AppGroupRepository appGroupRepository;

  @Mock private ActivityAttendanceRepository activityAttendanceRepository;

  @Mock private UserNotificationRepository userNotificationRepository;

  @Mock private KeycloakService keycloakService;

  private UserService userService;

  @BeforeEach
  void setUp() {
    userService =
        new UserService(
            keycloakUserLookupService,
            appGroupRepository,
            activityAttendanceRepository,
            userNotificationRepository,
            keycloakService);
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void searchByNameOrEmailNormalizesQueryAndMapsUsers() {
    UserRepresentation user1 = user("u-1", "jane@example.com", "jane", "Jane", "Doe", true);
    UserRepresentation user2 = user("u-2", null, "fallback@example.com", null, null, true);
    UserRepresentation missingId = user(null, "invalid@example.com", "invalid", null, null, true);
    UserRepresentation missingEmailAndUsername = user("u-3", null, null, null, null, true);
    when(keycloakUserLookupService.searchUsersByNameOrEmail("jane", 20))
        .thenReturn(List.of(user1, user2, missingId, missingEmailAndUsername));

    List<UserLookupResult> result = userService.searchByNameOrEmail("  jane ");

    assertThat(result)
        .containsExactly(
            new UserLookupResult("u-1", "Jane Doe", "jane@example.com"),
            new UserLookupResult("u-2", "fallback@example.com", "fallback@example.com"));
  }

  @Test
  void searchByNameOrEmailRejectsShortQuery() {
    assertThatThrownBy(() -> userService.searchByNameOrEmail("a"))
        .isInstanceOf(InvalidUserSearchRequestException.class)
        .hasMessageContaining("at least 2 characters");
  }

  @Test
  void createActivityInviteNotificationsSkipsCreatorAndUsersWithoutId() {
    UserRepresentation creator =
        user("u-creator", "creator@example.com", "creator", "Creator", "User", true);
    UserRepresentation recipient =
        user("u-recipient", "recipient@example.com", "recipient", "Recipient", "User", true);
    UserRepresentation missingId =
        user(null, "missing@example.com", "missing", "Missing", "Id", true);
    when(keycloakService.listGroupMembers("group-1"))
        .thenReturn(List.of(creator, recipient, missingId));

    userService.createActivityInviteNotifications(
        "group-1", "Hiking Crew", "activity-1", "Sunset Hike", "u-creator");

    @SuppressWarnings("unchecked")
    ArgumentCaptor<List<UserNotification>> captor = ArgumentCaptor.forClass(List.class);
    verify(userNotificationRepository).saveAll(captor.capture());
    List<UserNotification> notifications = captor.getValue();
    assertThat(notifications).hasSize(1);
    assertThat(notifications.getFirst().getUserId()).isEqualTo("u-recipient");
    assertThat(notifications.getFirst().getMessage()).contains("Sunset Hike");
    assertThat(notifications.getFirst().getLink())
        .isEqualTo("/groups/group-1/activities/activity-1");
  }

  @Test
  void createActivityInviteNotificationsDoesNotSaveWhenNoRecipients() {
    UserRepresentation creator =
        user("u-creator", "creator@example.com", "creator", "Creator", "User", true);
    when(keycloakService.listGroupMembers("group-1")).thenReturn(List.of(creator));

    userService.createActivityInviteNotifications(
        "group-1", "Hiking Crew", "activity-1", "Sunset Hike", "u-creator");

    verify(userNotificationRepository, never()).saveAll(any());
  }

  @Test
  void listUnreadNotificationsMarksThemAsRead() {
    authenticateAs("user-1");
    UserNotification n1 = new UserNotification("user-1", "activity_invite", "T1", "M1", "/a");
    n1.setId("n-1");
    UserNotification n2 = new UserNotification("user-1", "activity_invite", "T2", "M2", "/b");
    n2.setId("n-2");
    when(userNotificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc("user-1"))
        .thenReturn(List.of(n1, n2));
    when(userNotificationRepository.markAsReadByIds(eq(List.of("n-1", "n-2")), any()))
        .thenReturn(2);

    List<UserNotification> result = userService.listMyUnreadNotificationsAndMarkRead();

    assertThat(result).containsExactly(n1, n2);
    verify(userNotificationRepository).markAsReadByIds(eq(List.of("n-1", "n-2")), any());
  }

  @Test
  void listUnreadNotificationsDoesNotMarkAnythingWhenNoneExist() {
    authenticateAs("user-1");
    when(userNotificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc("user-1"))
        .thenReturn(List.of());

    List<UserNotification> result = userService.listMyUnreadNotificationsAndMarkRead();

    assertThat(result).isEmpty();
    verify(userNotificationRepository, never()).markAsReadByIds(any(), any());
  }

  @Test
  void deleteOwnAccountRejectsDeletingDifferentUser() {
    authenticateAs("user-1");

    assertThatThrownBy(() -> userService.deleteOwnAccount("user-2"))
        .isInstanceOf(UserAccountDeletionForbiddenException.class);
  }

  @Test
  void deleteOwnAccountDeletesGroupsRelatedDataAndKeycloakUser() {
    authenticateAs("user-1");
    when(appGroupRepository.findByOwnerId("user-1"))
        .thenReturn(
            List.of(
                new AppGroup("g-1", "Group 1", null, "user-1"),
                new AppGroup("g-2", "Group 2", null, "user-1")));
    when(activityAttendanceRepository.deleteByUserId("user-1")).thenReturn(3L);
    when(userNotificationRepository.deleteByUserId("user-1")).thenReturn(5L);

    userService.deleteOwnAccount();

    verify(keycloakService).deleteGroup("g-1");
    verify(keycloakService).deleteGroup("g-2");
    verify(appGroupRepository).deleteById("g-1");
    verify(appGroupRepository).deleteById("g-2");
    verify(activityAttendanceRepository).deleteByUserId("user-1");
    verify(userNotificationRepository).deleteByUserId("user-1");
    verify(keycloakService).deleteUser("user-1");
  }

  private static UserRepresentation user(
      String id,
      String email,
      String username,
      String firstName,
      String lastName,
      boolean emailVerified) {
    UserRepresentation user = new UserRepresentation();
    user.setId(id);
    user.setEmail(email);
    user.setUsername(username);
    user.setFirstName(firstName);
    user.setLastName(lastName);
    user.setEmailVerified(emailVerified);
    return user;
  }

  private static void authenticateAs(String userId) {
    Jwt jwt = Jwt.withTokenValue("token").header("alg", "none").claim("sub", userId).build();
    TestingAuthenticationToken authentication =
        new TestingAuthenticationToken(jwt, null, "ROLE_REGISTERED_USER");
    SecurityContextHolder.getContext().setAuthentication(authentication);
  }
}
