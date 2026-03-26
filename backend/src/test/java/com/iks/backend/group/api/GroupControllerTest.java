package com.iks.backend.group.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.iks.backend.group.GroupService;
import com.iks.backend.group.persistence.AppGroup;
import com.iks.backend.user.UserLookupResult;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

@ExtendWith(MockitoExtension.class)
class GroupControllerTest {

  @Mock private GroupService groupService;

  private GroupController controller;

  @BeforeEach
  void setUp() {
    controller = new GroupController(groupService);
  }

  @Test
  void listGroupsMapsEntitiesToResponses() {
    AppGroup g1 = group("g-1", "Alpha", "desc-a", "owner-1");
    AppGroup g2 = group("g-2", "Beta", "desc-b", "owner-2");
    when(groupService.listGroups()).thenReturn(List.of(g1, g2));

    List<GroupResponse> response = controller.listGroups();

    assertThat(response).hasSize(2);
    assertThat(response.get(0).id()).isEqualTo("g-1");
    assertThat(response.get(0).name()).isEqualTo("Alpha");
    assertThat(response.get(1).ownerId()).isEqualTo("owner-2");
  }

  @Test
  void createGroupReturnsCreatedResponseWithLocation() {
    AppGroup created = group("g-1", "Weekend Hikers", "desc", "owner-1");
    when(groupService.createGroup("Weekend Hikers", "desc")).thenReturn(created);

    ResponseEntity<GroupResponse> response =
        controller.createGroup(new CreateGroupRequest("Weekend Hikers", "desc"));

    assertThat(response.getStatusCode().value()).isEqualTo(201);
    assertThat(response.getHeaders().getLocation()).hasToString("/api/groups/g-1");
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().id()).isEqualTo("g-1");
  }

  @Test
  void addMemberDelegatesToService() {
    ResponseEntity<Void> response =
        controller.addMember("group-1", new AddGroupMemberRequest("user-1", null));

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    verify(groupService).addUserToGroup("group-1", "user-1", null);
  }

  @Test
  void listMembersMapsToApiResponse() {
    when(groupService.listGroupMembers("group-1"))
        .thenReturn(
            List.of(
                new UserLookupResult("u-1", "Jane Doe", "jane@example.com"),
                new UserLookupResult("u-2", "John Roe", "john@example.com")));

    List<GroupMemberResponse> response = controller.listMembers("group-1");

    assertThat(response)
        .containsExactly(
            new GroupMemberResponse("u-1", "Jane Doe", "jane@example.com"),
            new GroupMemberResponse("u-2", "John Roe", "john@example.com"));
  }

  @Test
  void leaveGroupReturnsNoContent() {
    ResponseEntity<Void> response = controller.leaveGroup("group-1");

    assertThat(response.getStatusCode().value()).isEqualTo(204);
    verify(groupService).leaveGroup("group-1");
  }

  private static AppGroup group(String id, String name, String description, String ownerId) {
    AppGroup group = new AppGroup(id, name, description, ownerId);
    group.setCreatedAt(Instant.parse("2025-01-01T00:00:00Z"));
    group.setUpdatedAt(Instant.parse("2025-01-02T00:00:00Z"));
    return group;
  }
}
