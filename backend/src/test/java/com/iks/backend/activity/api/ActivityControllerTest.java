package com.iks.backend.activity.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

import com.iks.backend.activity.ActivityService;
import com.iks.backend.activity.persistence.Activity;
import com.iks.backend.activity.persistence.ActivityAttendance;
import com.iks.backend.activity.persistence.AttendanceStatus;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

@ExtendWith(MockitoExtension.class)
class ActivityControllerTest {

    @Mock
    private ActivityService activityService;

    private ActivityController controller;

    @BeforeEach
    void setUp() {
        controller = new ActivityController(activityService);
    }

    @Test
    void createActivityReturnsCreatedResource() {
        Activity created = activity("activity-1", "group-1", "Morning Run");
        when(activityService.createActivity(
            "group-1",
            "Morning Run",
            "desc",
            "2026-08-21",
            "08:00",
            "Park"
        )).thenReturn(created);

        ResponseEntity<ActivityResponse> response = controller.createActivity(
            "group-1",
            new CreateActivityRequest("Morning Run", "desc", "2026-08-21", "08:00", "Park")
        );

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getHeaders().getLocation()).hasToString("/api/groups/group-1/activities/activity-1");
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().title()).isEqualTo("Morning Run");
    }

    @Test
    void getActivityThrowsWhenActivityBelongsToDifferentGroup() {
        when(activityService.getActivity("activity-1"))
            .thenReturn(activity("activity-1", "group-2", "Morning Run"));

        assertThatThrownBy(() -> controller.getActivity("group-1", "activity-1"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("does not belong");
    }

    @Test
    void respondToActivityDelegatesAndMapsResponse() {
        Activity activity = activity("activity-1", "group-1", "Morning Run");
        when(activityService.getActivity("activity-1")).thenReturn(activity);

        ActivityAttendance attendance = new ActivityAttendance(
            "activity-1",
            "user-1",
            "Jane Doe",
            "jane@example.com",
            AttendanceStatus.ACCEPTED
        );
        attendance.setId("att-1");
        attendance.setCreatedAt(Instant.parse("2025-01-01T10:00:00Z"));
        attendance.setUpdatedAt(Instant.parse("2025-01-01T11:00:00Z"));
        when(activityService.respondToActivity("activity-1", "group-1", "ACCEPTED", "Jane Doe", "jane@example.com"))
            .thenReturn(attendance);

        AttendanceResponse response = controller.respondToActivity(
            "group-1",
            "activity-1",
            new AttendanceRequest("ACCEPTED", "Jane Doe", "jane@example.com")
        );

        assertThat(response.activityId()).isEqualTo("activity-1");
        assertThat(response.userId()).isEqualTo("user-1");
        assertThat(response.status()).isEqualTo("ACCEPTED");
    }

    @Test
    void listAttendeesMapsAllResults() {
        Activity activity = activity("activity-1", "group-1", "Morning Run");
        when(activityService.getActivity("activity-1")).thenReturn(activity);

        ActivityAttendance a1 = new ActivityAttendance("activity-1", "u-1", "Jane", "jane@example.com", AttendanceStatus.ACCEPTED);
        a1.setId("att-1");
        a1.setCreatedAt(Instant.parse("2025-01-01T10:00:00Z"));
        a1.setUpdatedAt(Instant.parse("2025-01-01T10:00:00Z"));
        ActivityAttendance a2 = new ActivityAttendance("activity-1", "u-2", "John", "john@example.com", AttendanceStatus.MAYBE);
        a2.setId("att-2");
        a2.setCreatedAt(Instant.parse("2025-01-01T10:10:00Z"));
        a2.setUpdatedAt(Instant.parse("2025-01-01T10:10:00Z"));
        when(activityService.listAttendees("activity-1")).thenReturn(List.of(a1, a2));

        List<AttendanceResponse> response = controller.listAttendees("group-1", "activity-1");

        assertThat(response).hasSize(2);
        assertThat(response.get(0).userName()).isEqualTo("Jane");
        assertThat(response.get(1).status()).isEqualTo("MAYBE");
        verify(activityService).listAttendees("activity-1");
    }

    private static Activity activity(String id, String groupId, String title) {
        Activity activity = new Activity(groupId, title, "desc", LocalDateTime.parse("2026-08-21T08:00:00"), "Park");
        activity.setId(id);
        activity.setCreatedAt(Instant.parse("2025-01-01T00:00:00Z"));
        activity.setUpdatedAt(Instant.parse("2025-01-01T00:00:00Z"));
        return activity;
    }
}
