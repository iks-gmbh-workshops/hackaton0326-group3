package com.iks.backend.activity.api;

import java.net.URI;
import java.util.List;

import com.iks.backend.activity.ActivityService;
import com.iks.backend.activity.persistence.Activity;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/groups/{groupId}/activities")
public class ActivityController {

    private final ActivityService activityService;

    public ActivityController(ActivityService activityService) {
        this.activityService = activityService;
    }

    @GetMapping
    public List<ActivityResponse> listActivities(@PathVariable String groupId) {
        return activityService.listGroupActivities(groupId).stream()
            .map(ActivityController::toActivityResponse)
            .toList();
    }

    @GetMapping("/{activityId}")
    public ActivityResponse getActivity(
        @PathVariable String groupId,
        @PathVariable String activityId
    ) {
        Activity activity = activityService.getActivity(activityId);
        if (!activity.getGroupId().equals(groupId)) {
            throw new IllegalArgumentException("Activity does not belong to this group");
        }
        return toActivityResponse(activity);
    }

    @PostMapping
    public ResponseEntity<ActivityResponse> createActivity(
        @PathVariable String groupId,
        @RequestBody CreateActivityRequest request
    ) {
        String title = request == null ? null : request.title();
        String description = request == null ? null : request.description();
        String date = request == null ? null : request.date();
        String time = request == null ? null : request.time();
        String location = request == null ? null : request.location();

        Activity createdActivity = activityService.createActivity(
            groupId, title, description, date, time, location
        );

        return ResponseEntity
            .created(URI.create("/api/groups/" + groupId + "/activities/" + createdActivity.getId()))
            .body(toActivityResponse(createdActivity));
    }

    @PutMapping("/{activityId}")
    public ActivityResponse updateActivity(
        @PathVariable String groupId,
        @PathVariable String activityId,
        @RequestBody UpdateActivityRequest request
    ) {
        Activity activity = activityService.getActivity(activityId);
        if (!activity.getGroupId().equals(groupId)) {
            throw new IllegalArgumentException("Activity does not belong to this group");
        }

        String title = request == null ? null : request.title();
        String description = request == null ? null : request.description();
        String date = request == null ? null : request.date();
        String time = request == null ? null : request.time();
        String location = request == null ? null : request.location();

        Activity updatedActivity = activityService.updateActivity(
            activityId, title, description, date, time, location
        );

        return toActivityResponse(updatedActivity);
    }

    @DeleteMapping("/{activityId}")
    public ResponseEntity<Void> deleteActivity(
        @PathVariable String groupId,
        @PathVariable String activityId
    ) {
        Activity activity = activityService.getActivity(activityId);
        if (!activity.getGroupId().equals(groupId)) {
            throw new IllegalArgumentException("Activity does not belong to this group");
        }

        activityService.deleteActivity(activityId);
        return ResponseEntity.noContent().build();
    }

    private static ActivityResponse toActivityResponse(Activity activity) {
        return new ActivityResponse(
            activity.getId(),
            activity.getGroupId(),
            activity.getTitle(),
            activity.getDescription(),
            activity.getScheduledAt(),
            activity.getLocation(),
            activity.getCreatedAt(),
            activity.getUpdatedAt()
        );
    }
}
