package com.iks.backend.group;

import com.iks.backend.group.persistence.AppGroup;
import com.iks.backend.group.persistence.AppGroupRepository;
import com.iks.backend.keycloak.KeycloakService;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GroupService {

    private final AppGroupRepository appGroupRepository;
    private final KeycloakService keycloakService;

    public GroupService(AppGroupRepository appGroupRepository, KeycloakService keycloakService) {
        this.appGroupRepository = appGroupRepository;
        this.keycloakService = keycloakService;
    }

    @Transactional
    public AppGroup createGroup(String rawGroupName) {
        String groupName = normalizeGroupName(rawGroupName);

        if (appGroupRepository.existsByNameIgnoreCase(groupName)) {
            throw new GroupAlreadyExistsException(groupName);
        }

        String keycloakGroupId = keycloakService.createGroup(groupName);
        AppGroup group = new AppGroup(keycloakGroupId, groupName);

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

    private void rollbackKeycloakGroup(String groupId, RuntimeException originalFailure) {
        try {
            keycloakService.deleteGroup(groupId);
        } catch (RuntimeException rollbackFailure) {
            originalFailure.addSuppressed(rollbackFailure);
        }
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
}
