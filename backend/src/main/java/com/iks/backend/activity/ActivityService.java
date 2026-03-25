package com.iks.backend.activity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import com.iks.backend.activity.persistence.Activity;
import com.iks.backend.activity.persistence.ActivityAttendance;
import com.iks.backend.activity.persistence.ActivityAttendanceRepository;
import com.iks.backend.activity.persistence.ActivityRepository;
import com.iks.backend.activity.persistence.AttendanceStatus;
import com.iks.backend.group.GroupOwnershipException;
import com.iks.backend.group.GroupService;
import com.iks.backend.group.persistence.AppGroup;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final ActivityAttendanceRepository attendanceRepository;
    private final GroupService groupService;

    public ActivityService(ActivityRepository activityRepository, ActivityAttendanceRepository attendanceRepository, GroupService groupService) {
        this.activityRepository = activityRepository;
        this.attendanceRepository = attendanceRepository;
        this.groupService = groupService;
    }

    @Transactional
    public Activity createActivity(String groupId, String rawTitle, String description, String date, String time, String location) {
        AppGroup group = groupService.getGroup(groupId);
        String currentUserId = getCurrentUserId();

        if (!group.getOwnerId().equals(currentUserId)) {
            throw new GroupOwnershipException("Only the group owner can create activities");
        }

        String title = normalizeTitle(rawTitle);
        String normalizedDescription = normalizeDescription(description);
        LocalDateTime scheduledAt = parseDateTime(date, time);
        String normalizedLocation = normalizeLocation(location);

        Activity activity = new Activity(groupId, title, normalizedDescription, scheduledAt, normalizedLocation);
        return activityRepository.saveAndFlush(activity);
    }

    @Transactional(readOnly = true)
    public Activity getActivity(String activityId) {
        return activityRepository.findById(activityId)
            .orElseThrow(() -> new ActivityNotFoundException(activityId));
    }

    @Transactional(readOnly = true)
    public List<Activity> listGroupActivities(String groupId) {
        groupService.getGroup(groupId);
        return activityRepository.findByGroupIdOrderByScheduledAtAsc(groupId);
    }

    @Transactional
    public Activity updateActivity(String activityId, String rawTitle, String description, String date, String time, String location) {
        Activity activity = getActivity(activityId);
        AppGroup group = groupService.getGroup(activity.getGroupId());
        String currentUserId = getCurrentUserId();

        if (!group.getOwnerId().equals(currentUserId)) {
            throw new GroupOwnershipException("Only the group owner can edit activities");
        }

        String title = normalizeTitle(rawTitle);
        String normalizedDescription = normalizeDescription(description);
        LocalDateTime scheduledAt = parseDateTime(date, time);
        String normalizedLocation = normalizeLocation(location);

        activity.setTitle(title);
        activity.setDescription(normalizedDescription);
        activity.setScheduledAt(scheduledAt);
        activity.setLocation(normalizedLocation);

        return activityRepository.saveAndFlush(activity);
    }

    @Transactional
    public void deleteActivity(String activityId) {
        Activity activity = getActivity(activityId);
        AppGroup group = groupService.getGroup(activity.getGroupId());
        String currentUserId = getCurrentUserId();

        if (!group.getOwnerId().equals(currentUserId)) {
            throw new GroupOwnershipException("Only the group owner can delete activities");
        }

        activityRepository.delete(activity);
    }

    private static String normalizeTitle(String rawTitle) {
        if (rawTitle == null) {
            throw new InvalidActivityRequestException("Activity title is required");
        }

        String title = rawTitle.trim();
        if (title.isEmpty()) {
            throw new InvalidActivityRequestException("Activity title must not be blank");
        }
        if (title.length() > 255) {
            throw new InvalidActivityRequestException("Activity title must be at most 255 characters");
        }
        return title;
    }

    private static String normalizeDescription(String rawDescription) {
        if (rawDescription == null) {
            return null;
        }
        String description = rawDescription.trim();
        if (description.isEmpty()) {
            return null;
        }
        if (description.length() > 2000) {
            throw new InvalidActivityRequestException("Activity description must be at most 2000 characters");
        }
        return description;
    }

    private static String normalizeLocation(String rawLocation) {
        if (rawLocation == null) {
            return null;
        }
        String location = rawLocation.trim();
        if (location.isEmpty()) {
            return null;
        }
        if (location.length() > 500) {
            throw new InvalidActivityRequestException("Activity location must be at most 500 characters");
        }
        return location;
    }

    private static LocalDateTime parseDateTime(String date, String time) {
        if (date == null || date.isBlank()) {
            throw new InvalidActivityRequestException("Activity date is required");
        }
        if (time == null || time.isBlank()) {
            throw new InvalidActivityRequestException("Activity time is required");
        }

        LocalDateTime scheduledDateTime;
        try {
            LocalDate localDate = LocalDate.parse(date);
            LocalTime localTime = LocalTime.parse(time);
            scheduledDateTime = LocalDateTime.of(localDate, localTime);
        } catch (Exception e) {
            throw new InvalidActivityRequestException("Invalid date or time format. Please check that the date exists (e.g., February only has 28/29 days)", e);
        }

        if (scheduledDateTime.isBefore(LocalDateTime.now())) {
            throw new InvalidActivityRequestException("Activity cannot be scheduled in the past");
        }

        return scheduledDateTime;
    }

    @Transactional
    public ActivityAttendance respondToActivity(String activityId, String statusStr, String userName, String userEmail) {
        Activity activity = getActivity(activityId);

        if (activity.getScheduledAt().isBefore(LocalDateTime.now())) {
            throw new InvalidActivityRequestException("Cannot change attendance after the activity has started");
        }

        AttendanceStatus status;
        try {
            status = AttendanceStatus.valueOf(statusStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidActivityRequestException("Invalid attendance status: " + statusStr);
        }

        String currentUserId = getCurrentUserId();

        if (userName == null || userName.isBlank()) {
            throw new InvalidActivityRequestException("User name is required");
        }
        if (userEmail == null || userEmail.isBlank()) {
            throw new InvalidActivityRequestException("User email is required");
        }

        return attendanceRepository.findByActivityIdAndUserId(activityId, currentUserId)
            .map(existing -> {
                existing.setStatus(status);
                existing.setUserName(userName.trim());
                existing.setUserEmail(userEmail.trim());
                return attendanceRepository.saveAndFlush(existing);
            })
            .orElseGet(() -> {
                ActivityAttendance attendance = new ActivityAttendance(
                    activityId, currentUserId, userName.trim(), userEmail.trim(), status
                );
                return attendanceRepository.saveAndFlush(attendance);
            });
    }

    @Transactional(readOnly = true)
    public List<ActivityAttendance> listAttendees(String activityId) {
        getActivity(activityId);
        return attendanceRepository.findByActivityId(activityId);
    }

    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new InvalidActivityRequestException("User must be authenticated");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof Jwt jwt) {
            String userId = jwt.getSubject();
            if (userId == null || userId.isBlank()) {
                throw new InvalidActivityRequestException("Unable to determine user ID from authentication token");
            }
            return userId;
        }

        throw new InvalidActivityRequestException("Invalid authentication token");
    }
}
