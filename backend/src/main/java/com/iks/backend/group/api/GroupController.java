package com.iks.backend.group.api;

import java.net.URI;
import java.util.List;

import com.iks.backend.group.GroupService;
import com.iks.backend.group.persistence.AppGroup;
import com.iks.backend.user.UserLookupResult;

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
@RequestMapping("/api/groups")
public class GroupController {

    private final GroupService groupService;

    public GroupController(GroupService groupService) {
        this.groupService = groupService;
    }

    @GetMapping
    public List<GroupResponse> listGroups() {
        return groupService.listGroups().stream()
            .map(GroupController::toGroupResponse)
            .toList();
    }

    @GetMapping("/{groupId}")
    public GroupResponse getGroup(@PathVariable String groupId) {
        return toGroupResponse(groupService.getGroup(groupId));
    }

    @GetMapping("/{groupId}/members")
    public List<GroupMemberResponse> listMembers(@PathVariable String groupId) {
        return groupService.listGroupMembers(groupId).stream()
            .map(GroupController::toGroupMemberResponse)
            .toList();
    }

    @PostMapping
    public ResponseEntity<GroupResponse> createGroup(@RequestBody CreateGroupRequest request) {
        String requestedName = request == null ? null : request.name();
        String requestedDescription = request == null ? null : request.description();
        AppGroup createdGroup = groupService.createGroup(requestedName, requestedDescription);

        return ResponseEntity
            .created(URI.create("/api/groups/" + createdGroup.getId()))
            .body(toGroupResponse(createdGroup));
    }

    @PutMapping("/{groupId}")
    public GroupResponse updateGroup(
        @PathVariable String groupId,
        @RequestBody UpdateGroupRequest request
    ) {
        String requestedName = request == null ? null : request.name();
        String requestedDescription = request == null ? null : request.description();
        AppGroup updatedGroup = groupService.updateGroup(groupId, requestedName, requestedDescription);
        return toGroupResponse(updatedGroup);
    }

    @PostMapping("/{groupId}/members")
    public ResponseEntity<Void> addMember(
        @PathVariable String groupId,
        @RequestBody AddGroupMemberRequest request
    ) {
        String requestedUserId = request == null ? null : request.userId();
        groupService.addUserToGroup(groupId, requestedUserId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{groupId}/members/{userId}")
    public ResponseEntity<Void> removeMember(
        @PathVariable String groupId,
        @PathVariable String userId
    ) {
        groupService.removeUserFromGroup(groupId, userId);
        return ResponseEntity.noContent().build();
    }

    private static GroupResponse toGroupResponse(AppGroup group) {
        return new GroupResponse(
            group.getId(),
            group.getName(),
            group.getDescription(),
            group.getOwnerId(),
            group.getCreatedAt(),
            group.getUpdatedAt()
        );
    }

    private static GroupMemberResponse toGroupMemberResponse(UserLookupResult user) {
        return new GroupMemberResponse(
            user.id(),
            user.name(),
            user.email()
        );
    }
}
