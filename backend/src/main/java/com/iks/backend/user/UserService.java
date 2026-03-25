package com.iks.backend.user;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

import com.iks.backend.activity.persistence.ActivityAttendanceRepository;
import com.iks.backend.group.persistence.AppGroup;
import com.iks.backend.group.persistence.AppGroupRepository;
import com.iks.backend.keycloak.KeycloakService;
import com.iks.backend.keycloak.KeycloakUserLookupService;

import org.keycloak.representations.idm.UserRepresentation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);
    private static final int MAX_RESULTS = 20;

    private final KeycloakUserLookupService keycloakUserLookupService;
    private final AppGroupRepository appGroupRepository;
    private final ActivityAttendanceRepository activityAttendanceRepository;
    private final UserNotificationRepository userNotificationRepository;
    private final KeycloakService keycloakService;

    public UserService(
        KeycloakUserLookupService keycloakUserLookupService,
        AppGroupRepository appGroupRepository,
        ActivityAttendanceRepository activityAttendanceRepository,
        UserNotificationRepository userNotificationRepository,
        KeycloakService keycloakService
    ) {
        this.keycloakUserLookupService = keycloakUserLookupService;
        this.appGroupRepository = appGroupRepository;
        this.activityAttendanceRepository = activityAttendanceRepository;
        this.userNotificationRepository = userNotificationRepository;
        this.keycloakService = keycloakService;
    }

    @Transactional(readOnly = true)
    public List<UserLookupResult> searchByNameOrEmail(String rawQuery) {
        String query = normalizeQuery(rawQuery);

        return keycloakUserLookupService.searchUsersByNameOrEmail(query, MAX_RESULTS).stream()
            .map(UserService::mapUser)
            .flatMap(Optional::stream)
            .toList();
    }

    @Transactional
    public void createActivityInviteNotifications(
        String groupId,
        String groupName,
        String activityId,
        String activityTitle,
        String creatorUserId
    ) {
        List<UserNotification> notifications = keycloakService.listGroupMembers(groupId).stream()
            .filter(member -> member.getId() != null && !member.getId().isBlank())
            .filter(member -> !Objects.equals(member.getId(), creatorUserId))
            .map(member -> new UserNotification(
                member.getId(),
                "activity_invite",
                "New Activity",
                "You've been invited to '" + activityTitle + "' in " + groupName + ".",
                "/groups/" + groupId + "/activities/" + activityId
            ))
            .toList();

        if (notifications.isEmpty()) {
            log.debug("No notification recipients found for activityId={} in groupId={}", activityId, groupId);
            return;
        }

        userNotificationRepository.saveAll(notifications);
        log.debug(
            "Saved {} activity invite notifications for activityId={} groupId={}",
            notifications.size(),
            activityId,
            groupId
        );
    }

    @Transactional
    public List<UserNotification> listMyUnreadNotificationsAndMarkRead() {
        String currentUserId = getCurrentUserId();
        List<UserNotification> notifications = userNotificationRepository
            .findByUserIdAndReadFalseOrderByCreatedAtDesc(currentUserId);

        if (notifications.isEmpty()) {
            log.debug("No unread notifications for userId={}", currentUserId);
            return notifications;
        }

        List<String> notificationIds = notifications.stream()
            .map(UserNotification::getId)
            .toList();
        int updatedCount = userNotificationRepository.markAsReadByIds(notificationIds, Instant.now());

        if (updatedCount > 0) {
            log.debug("Marked {} notifications as read for userId={}", updatedCount, currentUserId);
        }

        return notifications;
    }

    @Transactional
    public void deleteOwnAccount() {
        deleteOwnAccount(null);
    }

    @Transactional
    public void deleteOwnAccount(String requestedUserId) {
        String currentUserId = getCurrentUserId();
        String normalizedRequestedUserId = firstNonBlank(requestedUserId);

        if (normalizedRequestedUserId != null && !normalizedRequestedUserId.equals(currentUserId)) {
            throw new UserAccountDeletionForbiddenException("Users may only delete their own account");
        }

        List<String> ownedGroupIds = appGroupRepository.findByOwnerId(currentUserId).stream()
            .map(AppGroup::getId)
            .toList();
        log.debug("Deleting account userId={} with ownedGroupCount={}", currentUserId, ownedGroupIds.size());

        for (String groupId : ownedGroupIds) {
            log.debug("Deleting owned group groupId={} for userId={}", groupId, currentUserId);
            keycloakService.deleteGroup(groupId);
            appGroupRepository.deleteById(groupId);
        }

        long deletedAttendanceCount = activityAttendanceRepository.deleteByUserId(currentUserId);
        log.debug("Deleted {} attendance entries for userId={}", deletedAttendanceCount, currentUserId);
        long deletedNotificationsCount = userNotificationRepository.deleteByUserId(currentUserId);
        log.debug("Deleted {} notifications for userId={}", deletedNotificationsCount, currentUserId);

        keycloakService.deleteUser(currentUserId);
        log.info("Deleted account and related references for userId={}", currentUserId);
    }

    private static Optional<UserLookupResult> mapUser(UserRepresentation userRepresentation) {
        String id = firstNonBlank(userRepresentation.getId());
        if (id == null) {
            return Optional.empty();
        }

        String email = firstNonBlank(userRepresentation.getEmail(), userRepresentation.getUsername());
        if (email == null) {
            return Optional.empty();
        }

        String fullName = firstNonBlank(
            joinName(userRepresentation.getFirstName(), userRepresentation.getLastName()),
            userRepresentation.getUsername(),
            email
        );

        return Optional.of(new UserLookupResult(id, fullName, email));
    }

    private static String joinName(String firstName, String lastName) {
        String normalizedFirstName = firstNonBlank(firstName);
        String normalizedLastName = firstNonBlank(lastName);

        if (normalizedFirstName == null && normalizedLastName == null) {
            return "";
        }
        if (normalizedFirstName == null) {
            return normalizedLastName;
        }
        if (normalizedLastName == null) {
            return normalizedFirstName;
        }
        return normalizedFirstName + " " + normalizedLastName;
    }

    private static String normalizeQuery(String rawQuery) {
        String query = firstNonBlank(rawQuery);
        if (query == null) {
            throw new InvalidUserSearchRequestException("Search query is required");
        }
        if (query.length() < 2) {
            throw new InvalidUserSearchRequestException("Search query must be at least 2 characters");
        }
        return query;
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null) {
                String trimmed = value.trim();
                if (!trimmed.isEmpty()) {
                    return trimmed;
                }
            }
        }
        return null;
    }

    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new InvalidUserSearchRequestException("User must be authenticated");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof Jwt jwt) {
            String userId = jwt.getSubject();
            if (userId == null || userId.isBlank()) {
                throw new InvalidUserSearchRequestException("Unable to determine user ID from authentication token");
            }
            return userId;
        }

        throw new InvalidUserSearchRequestException("Invalid authentication token");
    }
}
