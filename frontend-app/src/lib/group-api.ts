import { ApiRequestError, requestJson } from "./api-client";

export interface BackendGroup {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string;
  name: string;
  email: string;
}

class GroupApiError extends ApiRequestError {}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  return requestJson<T, GroupApiError>({
    path,
    token,
    init,
    errorType: GroupApiError,
  });
}

export async function listGroups(token: string) {
  return request<BackendGroup[]>("/groups", token);
}

export async function listMyGroups(token: string) {
  return request<BackendGroup[]>("/groups/my", token);
}

export async function getGroup(token: string, groupId: string) {
  return request<BackendGroup>(`/groups/${groupId}`, token);
}

export async function getGroupMembers(token: string, groupId: string) {
  return request<GroupMember[]>(`/groups/${groupId}/members`, token);
}

export async function createGroup(token: string, name: string, description?: string) {
  return request<BackendGroup>("/groups", token, {
    method: "POST",
    body: JSON.stringify({ name, description: description || null }),
  });
}

export async function updateGroup(token: string, groupId: string, name: string, description?: string) {
  return request<BackendGroup>(`/groups/${groupId}`, token, {
    method: "PUT",
    body: JSON.stringify({ name, description: description || null }),
  });
}

export async function deleteGroup(token: string, groupId: string) {
  return request<void>(`/groups/${groupId}`, token, {
    method: "DELETE",
  });
}

export async function addMemberToGroup(
  token: string,
  groupId: string,
  params: { userId?: string; email?: string }
) {
  return request<void>(`/groups/${groupId}/members`, token, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function removeMemberFromGroup(token: string, groupId: string, userId: string) {
  return request<void>(`/groups/${groupId}/members/${encodeURIComponent(userId)}`, token, {
    method: "DELETE",
  });
}

export async function leaveGroup(token: string, groupId: string) {
  return request<void>(`/groups/${groupId}/members/me`, token, {
    method: "DELETE",
  });
}

export function isGroupApiError(error: unknown): error is GroupApiError {
  return error instanceof GroupApiError;
}
