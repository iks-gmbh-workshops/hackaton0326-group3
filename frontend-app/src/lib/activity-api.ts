import { ApiRequestError, requestJson } from "./api-client";

export interface BackendActivity {
  id: string;
  groupId: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  location: string | null;
  createdAt: string;
  updatedAt: string;
}

class ActivityApiError extends ApiRequestError {}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  return requestJson<T, ActivityApiError>({
    path,
    token,
    init,
    errorType: ActivityApiError,
  });
}

export async function listGroupActivities(token: string, groupId: string) {
  return request<BackendActivity[]>(`/groups/${groupId}/activities`, token);
}

export async function getActivity(token: string, groupId: string, activityId: string) {
  return request<BackendActivity>(`/groups/${groupId}/activities/${activityId}`, token);
}

export async function createActivity(
  token: string,
  groupId: string,
  title: string,
  description: string | undefined,
  date: string,
  time: string,
  location: string | undefined
) {
  return request<BackendActivity>(`/groups/${groupId}/activities`, token, {
    method: "POST",
    body: JSON.stringify({
      title,
      description: description || null,
      date,
      time,
      location: location || null,
    }),
  });
}

export async function updateActivity(
  token: string,
  groupId: string,
  activityId: string,
  title: string,
  description: string | undefined,
  date: string,
  time: string,
  location: string | undefined
) {
  return request<BackendActivity>(`/groups/${groupId}/activities/${activityId}`, token, {
    method: "PUT",
    body: JSON.stringify({
      title,
      description: description || null,
      date,
      time,
      location: location || null,
    }),
  });
}

export async function deleteActivity(token: string, groupId: string, activityId: string) {
  return request<void>(`/groups/${groupId}/activities/${activityId}`, token, {
    method: "DELETE",
  });
}

export interface BackendAttendance {
  id: string;
  activityId: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: "ACCEPTED" | "DECLINED" | "MAYBE";
  createdAt: string;
  updatedAt: string;
}

export async function listAttendees(token: string, groupId: string, activityId: string) {
  return request<BackendAttendance[]>(
    `/groups/${groupId}/activities/${activityId}/attendance`,
    token
  );
}

export async function respondToActivity(
  token: string,
  groupId: string,
  activityId: string,
  status: "ACCEPTED" | "DECLINED" | "MAYBE",
  userName: string,
  userEmail: string
) {
  return request<BackendAttendance>(
    `/groups/${groupId}/activities/${activityId}/attendance`,
    token,
    {
      method: "PUT",
      body: JSON.stringify({ status, userName, userEmail }),
    }
  );
}

export function isActivityApiError(error: unknown): error is ActivityApiError {
  return error instanceof ActivityApiError;
}
