package com.iks.backend.user.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.iks.backend.user.UserLookupResult;
import com.iks.backend.user.UserNotification;
import com.iks.backend.user.UserService;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

  @Mock private UserService userService;

  private UserController controller;

  @BeforeEach
  void setUp() {
    controller = new UserController(userService);
  }

  @Test
  void searchUsersUsesFirstNonBlankInput() {
    when(userService.searchByNameOrEmail("Alice"))
        .thenReturn(List.of(new UserLookupResult("u-1", "Alice", "alice@example.com")));

    List<UserLookupResponse> response = controller.searchUsers("  ", " Alice ", null);

    assertThat(response)
        .containsExactly(new UserLookupResponse("u-1", "Alice", "alice@example.com"));
    verify(userService).searchByNameOrEmail("Alice");
  }

  @Test
  void listMyNotificationsMapsDomainModel() {
    UserNotification notification =
        new UserNotification(
            "u-1", "activity_invite", "New Activity", "Join us", "/groups/g-1/activities/a-1");
    notification.setId("n-1");
    notification.setRead(false);
    notification.setCreatedAt(Instant.parse("2025-01-01T10:00:00Z"));

    when(userService.listMyUnreadNotificationsAndMarkRead()).thenReturn(List.of(notification));

    List<UserNotificationResponse> response = controller.listMyNotifications();

    assertThat(response)
        .containsExactly(
            new UserNotificationResponse(
                "n-1",
                "activity_invite",
                "New Activity",
                "Join us",
                false,
                Instant.parse("2025-01-01T10:00:00Z"),
                "/groups/g-1/activities/a-1"));
  }

  @Test
  void deleteMyAccountCallsServiceAndReturnsNoContent() {
    ResponseEntity<Void> response = controller.deleteMyAccount();

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    verify(userService).deleteOwnAccount();
  }

  @Test
  void deleteUserAccountCallsServiceWithPathVariableAndReturnsNoContent() {
    ResponseEntity<Void> response = controller.deleteUserAccount("u-42");

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    verify(userService).deleteOwnAccount("u-42");
  }
}
