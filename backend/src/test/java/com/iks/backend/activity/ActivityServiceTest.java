package com.iks.backend.activity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.iks.backend.activity.persistence.Activity;
import com.iks.backend.activity.persistence.ActivityAttendance;
import com.iks.backend.activity.persistence.ActivityAttendanceRepository;
import com.iks.backend.activity.persistence.ActivityRepository;
import com.iks.backend.activity.persistence.AttendanceStatus;
import com.iks.backend.email.ActivityNotificationService;
import com.iks.backend.group.GroupOwnershipException;
import com.iks.backend.group.GroupService;
import com.iks.backend.group.persistence.AppGroup;
import com.iks.backend.user.UserService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
class ActivityServiceTest {

  @Mock private ActivityRepository activityRepository;

  @Mock private ActivityAttendanceRepository attendanceRepository;

  @Mock private GroupService groupService;

  @Mock private ActivityNotificationService notificationService;

  @Mock private UserService userService;

  private ActivityService activityService;

  @BeforeEach
  void setUp() {
    activityService =
        new ActivityService(
            activityRepository,
            attendanceRepository,
            groupService,
            notificationService,
            userService);
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void createActivityPersistsNormalizedValuesAndTriggersNotifications() {
    authenticateAs("owner-1");
    AppGroup group = new AppGroup("group-1", "Hiking Crew", null, "owner-1");
    when(groupService.getGroup("group-1")).thenReturn(group);
    when(activityRepository.saveAndFlush(any(Activity.class)))
        .thenAnswer(
            invocation -> {
              Activity activity = invocation.getArgument(0);
              activity.setId("activity-1");
              return activity;
            });

    LocalDateTime future = LocalDateTime.now().plusDays(2).withSecond(0).withNano(0);
    Activity created =
        activityService.createActivity(
            "group-1",
            "  Evening Hike ",
            "  bring snacks ",
            future.toLocalDate().toString(),
            future.toLocalTime().toString(),
            "  Riverside Park ");

    assertThat(created.getId()).isEqualTo("activity-1");
    assertThat(created.getTitle()).isEqualTo("Evening Hike");
    assertThat(created.getDescription()).isEqualTo("bring snacks");
    assertThat(created.getLocation()).isEqualTo("Riverside Park");
    verify(userService)
        .createActivityInviteNotifications(
            "group-1", "Hiking Crew", "activity-1", "Evening Hike", "owner-1");
    verify(notificationService).notifyActivityCreated(created, group, "owner-1");
  }

  @Test
  void createActivityRejectsNonOwner() {
    authenticateAs("member-1");
    AppGroup group = new AppGroup("group-1", "Hiking Crew", null, "owner-1");
    when(groupService.getGroup("group-1")).thenReturn(group);

    LocalDateTime future = LocalDateTime.now().plusDays(1);
    assertThatThrownBy(
            () ->
                activityService.createActivity(
                    "group-1",
                    "Evening Hike",
                    null,
                    future.toLocalDate().toString(),
                    future.toLocalTime().toString(),
                    null))
        .isInstanceOf(GroupOwnershipException.class);

    verify(activityRepository, never()).saveAndFlush(any());
  }

  @Test
  void createActivityRejectsPastDate() {
    authenticateAs("owner-1");
    AppGroup group = new AppGroup("group-1", "Hiking Crew", null, "owner-1");
    when(groupService.getGroup("group-1")).thenReturn(group);

    LocalDateTime past = LocalDateTime.now().minusDays(1);
    assertThatThrownBy(
            () ->
                activityService.createActivity(
                    "group-1",
                    "Evening Hike",
                    null,
                    past.toLocalDate().toString(),
                    past.toLocalTime().toString(),
                    null))
        .isInstanceOf(InvalidActivityRequestException.class)
        .hasMessageContaining("past");
  }

  @Test
  void updateActivityUpdatesMutableFields() {
    authenticateAs("owner-1");
    Activity activity =
        new Activity("group-1", "Old", "desc", LocalDateTime.now().plusDays(2), "loc");
    activity.setId("activity-1");
    when(activityRepository.findById("activity-1")).thenReturn(Optional.of(activity));
    when(groupService.getGroup("group-1"))
        .thenReturn(new AppGroup("group-1", "Group", null, "owner-1"));
    when(activityRepository.saveAndFlush(activity)).thenReturn(activity);

    LocalDateTime future = LocalDateTime.now().plusDays(5).withSecond(0).withNano(0);
    Activity updated =
        activityService.updateActivity(
            "activity-1",
            " New Title ",
            " new description ",
            future.toLocalDate().toString(),
            future.toLocalTime().toString(),
            " new location ");

    assertThat(updated.getTitle()).isEqualTo("New Title");
    assertThat(updated.getDescription()).isEqualTo("new description");
    assertThat(updated.getLocation()).isEqualTo("new location");
    assertThat(updated.getScheduledAt()).isEqualTo(future);
  }

  @Test
  void respondToActivityUpdatesExistingAttendance() {
    authenticateAs("user-1");
    Activity activity =
        new Activity("group-1", "Trip", null, LocalDateTime.now().plusDays(2), null);
    activity.setId("activity-1");
    when(activityRepository.findById("activity-1")).thenReturn(Optional.of(activity));
    when(groupService.getGroup("group-1"))
        .thenReturn(new AppGroup("group-1", "Group", null, "owner-1"));

    ActivityAttendance existing =
        new ActivityAttendance(
            "activity-1", "user-1", "Old Name", "old@example.com", AttendanceStatus.MAYBE);
    when(attendanceRepository.findByActivityIdAndUserId("activity-1", "user-1"))
        .thenReturn(Optional.of(existing));
    when(attendanceRepository.saveAndFlush(existing)).thenReturn(existing);

    ActivityAttendance saved =
        activityService.respondToActivity(
            "activity-1", "group-1", "accepted", "  Jane Doe ", "  jane@example.com ");

    assertThat(saved.getStatus()).isEqualTo(AttendanceStatus.ACCEPTED);
    assertThat(saved.getUserName()).isEqualTo("Jane Doe");
    assertThat(saved.getUserEmail()).isEqualTo("jane@example.com");
  }

  @Test
  void respondToActivityCreatesNewAttendanceWhenNoRecordExists() {
    authenticateAs("user-1");
    Activity activity =
        new Activity("group-1", "Trip", null, LocalDateTime.now().plusDays(2), null);
    activity.setId("activity-1");
    when(activityRepository.findById("activity-1")).thenReturn(Optional.of(activity));
    when(groupService.getGroup("group-1"))
        .thenReturn(new AppGroup("group-1", "Group", null, "owner-1"));
    when(attendanceRepository.findByActivityIdAndUserId("activity-1", "user-1"))
        .thenReturn(Optional.empty());
    when(attendanceRepository.saveAndFlush(any(ActivityAttendance.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    ActivityAttendance saved =
        activityService.respondToActivity(
            "activity-1", "group-1", "maybe", " User Name ", " user@example.com ");

    assertThat(saved.getActivityId()).isEqualTo("activity-1");
    assertThat(saved.getUserId()).isEqualTo("user-1");
    assertThat(saved.getStatus()).isEqualTo(AttendanceStatus.MAYBE);
    assertThat(saved.getUserName()).isEqualTo("User Name");
    assertThat(saved.getUserEmail()).isEqualTo("user@example.com");
  }

  @Test
  void respondToActivityRejectsInvalidStatus() {
    authenticateAs("user-1");
    Activity activity =
        new Activity("group-1", "Trip", null, LocalDateTime.now().plusDays(2), null);
    activity.setId("activity-1");
    when(activityRepository.findById("activity-1")).thenReturn(Optional.of(activity));
    when(groupService.getGroup("group-1"))
        .thenReturn(new AppGroup("group-1", "Group", null, "owner-1"));

    assertThatThrownBy(
            () ->
                activityService.respondToActivity(
                    "activity-1", "group-1", "not-a-status", "User", "user@example.com"))
        .isInstanceOf(InvalidActivityRequestException.class);
  }

  @Test
  void listAttendeesEnsuresActivityExistsAndReturnsRepositoryData() {
    Activity activity =
        new Activity("group-1", "Trip", null, LocalDateTime.now().plusDays(1), null);
    activity.setId("activity-1");
    ActivityAttendance attendance =
        new ActivityAttendance(
            "activity-1", "user-1", "User One", "user@example.com", AttendanceStatus.ACCEPTED);
    when(activityRepository.findById("activity-1")).thenReturn(Optional.of(activity));
    when(attendanceRepository.findByActivityId("activity-1")).thenReturn(List.of(attendance));

    List<ActivityAttendance> attendees = activityService.listAttendees("activity-1");

    assertThat(attendees).containsExactly(attendance);
    verify(attendanceRepository).findByActivityId("activity-1");
  }

  @Test
  void deleteActivityRejectsNonOwner() {
    authenticateAs("user-2");
    Activity activity =
        new Activity("group-1", "Trip", null, LocalDateTime.now().plusDays(2), null);
    activity.setId("activity-1");
    when(activityRepository.findById("activity-1")).thenReturn(Optional.of(activity));
    when(groupService.getGroup("group-1"))
        .thenReturn(new AppGroup("group-1", "Group", null, "owner-1"));

    assertThatThrownBy(() -> activityService.deleteActivity("activity-1"))
        .isInstanceOf(GroupOwnershipException.class);
  }

  @Test
  void createActivityCallsSaveWithGroupIdFromRequest() {
    authenticateAs("owner-1");
    AppGroup group = new AppGroup("group-1", "Hiking Crew", null, "owner-1");
    when(groupService.getGroup("group-1")).thenReturn(group);
    when(activityRepository.saveAndFlush(any(Activity.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    LocalDateTime future = LocalDateTime.now().plusDays(3).withSecond(0).withNano(0);
    activityService.createActivity(
        "group-1",
        "Activity",
        null,
        future.toLocalDate().toString(),
        future.toLocalTime().toString(),
        null);

    ArgumentCaptor<Activity> captor = ArgumentCaptor.forClass(Activity.class);
    verify(activityRepository).saveAndFlush(captor.capture());
    assertThat(captor.getValue().getGroupId()).isEqualTo("group-1");
  }

  private static void authenticateAs(String userId) {
    Jwt jwt = Jwt.withTokenValue("token").header("alg", "none").claim("sub", userId).build();
    TestingAuthenticationToken authentication =
        new TestingAuthenticationToken(jwt, null, "ROLE_REGISTERED_USER");
    SecurityContextHolder.getContext().setAuthentication(authentication);
  }
}
