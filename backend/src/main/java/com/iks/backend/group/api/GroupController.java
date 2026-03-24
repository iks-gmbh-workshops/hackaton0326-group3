package com.iks.backend.group.api;

import java.net.URI;

import com.iks.backend.group.GroupService;
import com.iks.backend.group.persistence.AppGroup;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
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

    @PostMapping
    public ResponseEntity<GroupResponse> createGroup(@RequestBody CreateGroupRequest request) {
        String requestedName = request == null ? null : request.name();
        AppGroup createdGroup = groupService.createGroup(requestedName);

        GroupResponse response = new GroupResponse(
            createdGroup.getId(),
            createdGroup.getName(),
            createdGroup.getCreatedAt(),
            createdGroup.getUpdatedAt()
        );

        return ResponseEntity
            .created(URI.create("/api/groups/" + createdGroup.getId()))
            .body(response);
    }
}
