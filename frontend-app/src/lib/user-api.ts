import { ApiRequestError, buildPath, requestJson } from "./api-client";
import type { Notification } from "./types";

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
}

class UserApiError extends ApiRequestError {}

const defaultUserApiHeaders = {
  Accept: "application/json",
};

function request<T>(token: string, path: string, init?: RequestInit) {
  return requestJson<T, UserApiError>({
    path,
    token,
    init,
    errorType: UserApiError,
    defaultHeaders: defaultUserApiHeaders,
  });
}

export async function searchUsers(token: string, query: string) {
  return request<DirectoryUser[]>(token, buildPath("/users", { query }));
}

function normalizeNotificationType(type: string): Notification["type"] {
  switch (type) {
    case "activity_invite":
    case "group_invite":
    case "rsvp_update":
    case "reminder":
      return type;
    default:
      return "activity_invite";
  }
}

export async function listMyNotifications(token: string): Promise<Notification[]> {
  const body = await request<
    Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      read: boolean;
      createdAt: string;
      link?: string | null;
    }>
  >(token, "/users/me/notifications");

  return body.map((item) => ({
    id: item.id,
    type: normalizeNotificationType(item.type),
    title: item.title,
    message: item.message,
    read: item.read,
    createdAt: item.createdAt,
    link: item.link ?? undefined,
  }));
}

export interface UserActivity {
  id: string;
  groupId: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  location: string | null;
  attendanceStatus: string;
  createdAt: string;
  updatedAt: string;
}

export async function listMyActivities(token: string): Promise<UserActivity[]> {
  return request<UserActivity[]>(token, "/users/me/activities", {
    method: "GET",
  });
}

export async function updateOwnProfile(
  token: string,
  firstName: string,
  lastName: string,
  email: string
) {
  return request<void>(token, "/users/me", {
    method: "PUT",
    body: JSON.stringify({ firstName, lastName, email }),
  });
}

export async function deleteOwnAccount(token: string) {
  return request<void>(token, "/users/me", {
    method: "DELETE",
  });
}

export function isUserApiError(error: unknown): error is UserApiError {
  return error instanceof UserApiError;
}
