package com.iks.backend.group;

import java.util.List;
import java.util.Optional;

import com.iks.backend.group.persistence.AppGroup;
import com.iks.backend.group.persistence.AppGroupRepository;
import com.iks.backend.keycloak.KeycloakService;
import com.iks.backend.user.UserLookupResult;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GroupService {

    private static final Logger log = LoggerFactory.getLogger(GroupService.class);
    private static final List<String> INVITE_REQUIRED_ACTIONS = List.of(
        "UPDATE_PASSWORD",
        "UPDATE_PROFILE",
        "VERIFY_EMAIL"
    );

    private final AppGroupRepository appGroupRepository;
    private final KeycloakService keycloakService;
    private final String frontendBaseUrl;

    public GroupService(
        AppGroupRepository appGroupRepository,
        KeycloakService keycloakService,
        @Value("${app.frontend-base-url:http://localhost:3000}") String frontendBaseUrl
    ) {
        this.appGroupRepository = appGroupRepository;
        this.keycloakService = keycloakService;
        this.frontendBaseUrl = frontendBaseUrl.replaceAll("/+$", "");
    }

    @Transactional
    public AppGroup createGroup(String rawGroupName, String description) {
        String groupName = normalizeGroupName(rawGroupName);
        String normalizedDescription = normalizeDescription(description);

        if (appGroupRepository.existsByNameIgnoreCase(groupName)) {
            throw new GroupAlreadyExistsException(groupName);
        }

        String ownerId = getCurrentUserId();
        String keycloakGroupId = keycloakService.createGroup(groupName);
        keycloakService.addUserToGroup(ownerId, keycloakGroupId);
        AppGroup group = new AppGroup(keycloakGroupId, groupName, normalizedDescription, ownerId);

        try {
            return appGroupRepository.saveAndFlush(group);
        } catch (DataIntegrityViolationException integrityViolationException) {
            rollbackKeycloakGroup(keycloakGroupId, integrityViolationException);
            throw new GroupAlreadyExistsException(groupName, integrityViolationException);
        } catch (RuntimeException runtimeException) {
            rollbackKeycloakGroup(keycloakGroupId, runtimeException);
            throw new GroupCreationException("Failed to persist group in database", runtimeException);
        }
    }

    @Transactional(readOnly = true)
    public List<AppGroup> listGroups() {
        return appGroupRepository.findAll(Sort.by(Sort.Direction.ASC, "name"));
    }

    @Transactional(readOnly = true)
    public AppGroup getGroup(String groupId) {
        return appGroupRepository.findById(groupId)
            .orElseThrow(() -> new GroupNotFoundException(groupId));
    }

    @Transactional
    public AppGroup updateGroup(String groupId, String rawGroupName, String description) {
        AppGroup group = getGroup(groupId);
        String currentUserId = getCurrentUserId();

        if (!group.getOwnerId().equals(currentUserId)) {
            throw new GroupOwnershipException("Only the group owner can edit this group");
        }

        String groupName = normalizeGroupName(rawGroupName);
        String normalizedDescription = normalizeDescription(description);
        
        boolean nameChanged = !group.getName().equals(groupName);
        if (nameChanged && appGroupRepository.existsByNameIgnoreCase(groupName)) {
            throw new GroupAlreadyExistsException(groupName);
        }
        
        if (nameChanged) {
            keycloakService.updateGroup(groupId, groupName);
        }
        
        group.setName(groupName);
        group.setDescription(normalizedDescription);
        
        return appGroupRepository.saveAndFlush(group);
    }

    @Transactional(readOnly = true)
    public List<AppGroup> listMyGroups() {
        String userId = getCurrentUserId();
        List<String> groupIds = keycloakService.listUserGroupIds(userId);
        if (groupIds.isEmpty()) {
            return List.of();
        }
        return appGroupRepository.findAllById(groupIds).stream()
            .sorted((a, b) -> a.getName().compareToIgnoreCase(b.getName()))
            .toList();
    }

    @Transactional
    public void deleteGroup(String groupId) {
        AppGroup group = getGroup(groupId);
        String currentUserId = getCurrentUserId();

        if (!group.getOwnerId().equals(currentUserId)) {
            throw new GroupOwnershipException("Only the group owner can delete this group");
        }

        keycloakService.deleteGroup(groupId);
        appGroupRepository.delete(group);
    }

    @Transactional
    public void addUserToGroup(String groupId, String rawUserId, String rawEmail) {
        AppGroup group = getGroup(groupId);
        String currentUserId = getCurrentUserId();
        log.debug(
            "Processing addUserToGroup for groupId={} by requester={} (rawUserIdPresent={} rawEmailPresent={})",
            groupId,
            currentUserId,
            rawUserId != null && !rawUserId.isBlank(),
            rawEmail != null && !rawEmail.isBlank()
        );

        if (!group.getOwnerId().equals(currentUserId)) {
            log.warn("Rejected addUserToGroup for groupId={} by non-owner requester={}", groupId, currentUserId);
            throw new GroupOwnershipException("Only the group owner can add members");
        }

        String userId = firstNonBlank(rawUserId);
        String email = firstNonBlank(rawEmail);

        if ((userId == null && email == null) || (userId != null && email != null)) {
            log.warn(
                "Invalid addUserToGroup payload for groupId={}: resolvedUserIdPresent={} resolvedEmailPresent={}",
                groupId,
                userId != null,
                email != null
            );
            throw new InvalidGroupMemberRequestException("Provide exactly one of userId or email");
        }

        if (userId != null) {
            String normalizedUserId = normalizeUserId(userId);
            log.debug("Adding existing Keycloak userId={} to groupId={}", normalizedUserId, groupId);
            keycloakService.addUserToGroup(normalizedUserId, groupId);
            return;
        }

        String normalizedEmail = normalizeEmail(email);
        log.debug("Inviting email={} to groupId={}", normalizedEmail, groupId);
        inviteUserToGroup(groupId, normalizedEmail);
    }

    @Transactional(readOnly = true)
    public void removeUserFromGroup(String groupId, String rawUserId) {
        AppGroup group = getGroup(groupId);
        String currentUserId = getCurrentUserId();

        if (!group.getOwnerId().equals(currentUserId)) {
            throw new GroupOwnershipException("Only the group owner can remove members");
        }

        String userId = normalizeUserId(rawUserId);
        keycloakService.removeUserFromGroup(userId, groupId);
    }

    @Transactional
    public void leaveGroup(String groupId) {
        AppGroup group = getGroup(groupId);
        String currentUserId = getCurrentUserId();

        if (group.getOwnerId().equals(currentUserId)) {
            throw new GroupOwnershipException("Group owners cannot leave their own group");
        }

        keycloakService.removeUserFromGroup(currentUserId, groupId);
        log.debug("User {} left group {}", currentUserId, groupId);
    }

    @Transactional(readOnly = true)
    public List<UserLookupResult> listGroupMembers(String groupId) {
        getGroup(groupId);
        return keycloakService.listGroupMembers(groupId).stream()
            .map(GroupService::mapUser)
            .flatMap(Optional::stream)
            .toList();
    }

    private void rollbackKeycloakGroup(String groupId, RuntimeException originalFailure) {
        try {
            keycloakService.deleteGroup(groupId);
        } catch (RuntimeException rollbackFailure) {
            originalFailure.addSuppressed(rollbackFailure);
        }
    }

    private static String normalizeDescription(String rawDescription) {
        if (rawDescription == null) {
            return null;
        }
        String description = rawDescription.trim();
        if (description.isEmpty()) {
            return null;
        }
        if (description.length() > 1000) {
            throw new InvalidGroupRequestException("Group description must be at most 1000 characters");
        }
        return description;
    }

    private static String normalizeGroupName(String rawGroupName) {
        if (rawGroupName == null) {
            throw new InvalidGroupRequestException("Group name is required");
        }

        String groupName = rawGroupName.trim();
        if (groupName.isEmpty()) {
            throw new InvalidGroupRequestException("Group name must not be blank");
        }
        if (groupName.length() > 255) {
            throw new InvalidGroupRequestException("Group name must be at most 255 characters");
        }
        return groupName;
    }

    private static String normalizeUserId(String rawUserId) {
        if (rawUserId == null) {
            throw new InvalidGroupMemberRequestException("User id is required");
        }

        String userId = rawUserId.trim();
        if (userId.isEmpty()) {
            throw new InvalidGroupMemberRequestException("User id must not be blank");
        }
        return userId;
    }

    private static String normalizeEmail(String rawEmail) {
        if (rawEmail == null) {
            throw new InvalidGroupMemberRequestException("Email is required");
        }

        String email = rawEmail.trim();
        if (email.isEmpty()) {
            throw new InvalidGroupMemberRequestException("Email must not be blank");
        }
        if (!email.contains("@")) {
            throw new InvalidGroupMemberRequestException("Invalid email address");
        }
        if (email.length() > 255) {
            throw new InvalidGroupMemberRequestException("Email must be at most 255 characters");
        }
        return email;
    }

    private void inviteUserToGroup(String groupId, String email) {
        if (keycloakService.findUserByEmail(email).isPresent()) {
            log.warn("Invite rejected for groupId={} because Keycloak account already exists for email={}", groupId, email);
            throw new InvalidGroupMemberRequestException(
                "Cannot invite user by email because an account already exists in Keycloak"
            );
        }

        log.debug("Creating Keycloak user for invite email={} and assigning to groupId={}", email, groupId);
        String createdUserId = keycloakService.createUser(email, INVITE_REQUIRED_ACTIONS);
        keycloakService.addUserToGroup(createdUserId, groupId);
        keycloakService.sendRequiredActionsEmail(
            createdUserId,
            buildGroupRedirectUri(groupId),
            INVITE_REQUIRED_ACTIONS
        );
        log.debug("Invite setup completed for email={} createdUserId={} groupId={}", email, createdUserId, groupId);
    }

    private String buildGroupRedirectUri(String groupId) {
        return frontendBaseUrl + "/groups/" + groupId;
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
            throw new InvalidGroupRequestException("User must be authenticated to create a group");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof Jwt jwt) {
            String userId = jwt.getSubject();
            if (userId == null || userId.isBlank()) {
                throw new InvalidGroupRequestException("Unable to determine user ID from authentication token");
            }
            return userId;
        }

        throw new InvalidGroupRequestException("Invalid authentication token");
    }
}
