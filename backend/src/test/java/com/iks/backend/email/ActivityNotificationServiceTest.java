package com.iks.backend.email;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.iks.backend.activity.persistence.Activity;
import com.iks.backend.activity.persistence.AttendanceStatus;
import com.iks.backend.group.persistence.AppGroup;
import com.iks.backend.keycloak.KeycloakService;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.keycloak.representations.idm.UserRepresentation;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ActivityNotificationServiceTest {

  @Mock private EmailService emailService;

  @Mock private KeycloakService keycloakService;

  private ActivityNotificationService notificationService;

  @BeforeEach
  void setUp() {
    notificationService =
        new ActivityNotificationService(emailService, keycloakService, "http://frontend.local/");
  }

  @Test
  void notifyActivityCreatedFiltersRecipientsAndBuildsEscapedHtmlBody() {
    Activity activity =
        new Activity(
            "group-1",
            "<Run & Hike>",
            "desc <b>tag</b>",
            LocalDateTime.parse("2026-08-21T08:15:00"),
            "Park <North>");
    activity.setId("activity-1");
    AppGroup group = new AppGroup("group-1", "Trail & Friends <All>", null, "owner-1");

    UserRepresentation creator = member("owner-1", "owner@example.com", "owner", true);
    UserRepresentation verified = member("user-2", "member@example.com", "member", true);
    UserRepresentation unverified = member("user-3", "skip@example.com", "skip", false);
    UserRepresentation usernameFallback = member("user-4", null, "fallback-user", true);
    UserRepresentation duplicateEmail = member("user-5", "member@example.com", "dup", true);
    when(keycloakService.listGroupMembers("group-1"))
        .thenReturn(List.of(creator, verified, unverified, usernameFallback, duplicateEmail));

    notificationService.notifyActivityCreated(activity, group, "owner-1");

    @SuppressWarnings("unchecked")
    ArgumentCaptor<List<String>> recipientsCaptor = ArgumentCaptor.forClass(List.class);
    ArgumentCaptor<String> subjectCaptor = ArgumentCaptor.forClass(String.class);
    ArgumentCaptor<String> bodyCaptor = ArgumentCaptor.forClass(String.class);
    verify(emailService)
        .sendEmailToMany(recipientsCaptor.capture(), subjectCaptor.capture(), bodyCaptor.capture());

    assertThat(recipientsCaptor.getValue()).containsExactly("member@example.com", "fallback-user");
    assertThat(subjectCaptor.getValue()).contains("New Activity").contains("<Run & Hike>");
    assertThat(bodyCaptor.getValue()).contains("&lt;Run &amp; Hike&gt;");
    assertThat(bodyCaptor.getValue()).contains("&lt;North&gt;");
    assertThat(bodyCaptor.getValue())
        .contains("http://frontend.local/groups/group-1/activities/activity-1");
  }

  @Test
  void notifyAttendanceChangedUsesStatusLabelAndVerifiedRecipients() {
    Activity activity =
        new Activity(
            "group-1", "Morning Run", null, LocalDateTime.parse("2026-08-21T08:15:00"), null);
    activity.setId("activity-1");
    AppGroup group = new AppGroup("group-1", "Trail Friends", null, "owner-1");

    UserRepresentation verified = member("user-2", "member@example.com", "member", true);
    UserRepresentation fallback = member("user-3", null, "fallback-user", true);
    UserRepresentation unverified = member("user-4", "skip@example.com", "skip", false);
    when(keycloakService.listGroupMembers("group-1"))
        .thenReturn(List.of(verified, fallback, unverified));

    notificationService.notifyAttendanceChanged(
        activity, group, "Jane Doe", AttendanceStatus.MAYBE);

    @SuppressWarnings("unchecked")
    ArgumentCaptor<List<String>> recipientsCaptor = ArgumentCaptor.forClass(List.class);
    ArgumentCaptor<String> subjectCaptor = ArgumentCaptor.forClass(String.class);
    ArgumentCaptor<String> bodyCaptor = ArgumentCaptor.forClass(String.class);
    verify(emailService)
        .sendEmailToMany(recipientsCaptor.capture(), subjectCaptor.capture(), bodyCaptor.capture());

    assertThat(recipientsCaptor.getValue()).containsExactly("member@example.com", "fallback-user");
    assertThat(subjectCaptor.getValue()).contains("tentatively accepted (maybe)");
    assertThat(bodyCaptor.getValue()).contains("Jane Doe");
  }

  private static UserRepresentation member(
      String id, String email, String username, boolean verified) {
    UserRepresentation user = new UserRepresentation();
    user.setId(id);
    user.setEmail(email);
    user.setUsername(username);
    user.setEmailVerified(verified);
    return user;
  }
}
