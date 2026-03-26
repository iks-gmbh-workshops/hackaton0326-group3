package com.iks.backend.user.api;

import java.util.List;

import com.iks.backend.activity.ActivityService;
import com.iks.backend.activity.persistence.Activity;
import com.iks.backend.user.UserLookupResult;
import com.iks.backend.user.UserNotification;
import com.iks.backend.user.UserService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final ActivityService activityService;

    public UserController(UserService userService, ActivityService activityService) {
        this.userService = userService;
        this.activityService = activityService;
    }

    @GetMapping
    public List<UserLookupResponse> searchUsers(
        @RequestParam(value = "query", required = false) String query,
        @RequestParam(value = "name", required = false) String name,
        @RequestParam(value = "email", required = false) String email
    ) {
        return userService.searchByNameOrEmail(firstNonBlank(query, name, email)).stream()
            .map(UserController::toResponse)
            .toList();
    }

    @GetMapping("/me/notifications")
    public List<UserNotificationResponse> listMyNotifications() {
        return userService.listMyUnreadNotificationsAndMarkRead().stream()
            .map(UserController::toNotificationResponse)
            .toList();
    }

    @GetMapping("/me/activities")
    public List<UserActivityResponse> listMyActivities() {
        return activityService.listMyAcceptedActivities().stream()
            .map(activityWithStatus -> toUserActivityResponse(activityWithStatus.activity(), activityWithStatus.attendanceStatus()))
            .toList();
    }

    @PutMapping("/me")
    public ResponseEntity<Void> updateMyProfile(@RequestBody UpdateProfileRequest request) {
        String firstName = request == null ? null : request.firstName();
        String lastName = request == null ? null : request.lastName();
        String email = request == null ? null : request.email();
        
        userService.updateOwnProfile(firstName, lastName, email);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteMyAccount() {
        userService.deleteOwnAccount();
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> deleteUserAccount(@PathVariable String userId) {
        userService.deleteOwnAccount(userId);
        return ResponseEntity.noContent().build();
    }

    private static UserLookupResponse toResponse(UserLookupResult user) {
        return new UserLookupResponse(
            user.id(),
            user.name(),
            user.email()
        );
    }

    private static UserNotificationResponse toNotificationResponse(UserNotification notification) {
        return new UserNotificationResponse(
            notification.getId(),
            notification.getType(),
            notification.getTitle(),
            notification.getMessage(),
            notification.isRead(),
            notification.getCreatedAt(),
            notification.getLink()
        );
    }

    private static UserActivityResponse toUserActivityResponse(Activity activity, String attendanceStatus) {
        return new UserActivityResponse(
            activity.getId(),
            activity.getGroupId(),
            activity.getTitle(),
            activity.getDescription(),
            activity.getScheduledAt(),
            activity.getLocation(),
            attendanceStatus,
            activity.getCreatedAt(),
            activity.getUpdatedAt()
        );
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.trim().isEmpty()) {
                return value.trim();
            }
        }
        return null;
    }
}
