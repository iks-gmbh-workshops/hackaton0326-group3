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

class ActivityApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getBackendBaseUrl() {
  return (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000").replace(/\/$/, "");
}

async function parseErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as { message?: string; error?: string };
    return body.message || body.error || `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getBackendBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new ActivityApiError(response.status, await parseErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function listGroupActivities(token: string, groupId: string) {
  return request<BackendActivity[]>(`/api/groups/${groupId}/activities`, token);
}

export async function getActivity(token: string, groupId: string, activityId: string) {
  return request<BackendActivity>(`/api/groups/${groupId}/activities/${activityId}`, token);
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
  return request<BackendActivity>(`/api/groups/${groupId}/activities`, token, {
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
  return request<BackendActivity>(`/api/groups/${groupId}/activities/${activityId}`, token, {
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
  return request<void>(`/api/groups/${groupId}/activities/${activityId}`, token, {
    method: "DELETE",
  });
}

export interface BackendAttendance {
  id: string;
  activityId: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: "ACCEPTED" | "DECLINED";
  createdAt: string;
  updatedAt: string;
}

export async function listAttendees(token: string, groupId: string, activityId: string) {
  return request<BackendAttendance[]>(
    `/api/groups/${groupId}/activities/${activityId}/attendance`,
    token
  );
}

export async function respondToActivity(
  token: string,
  groupId: string,
  activityId: string,
  status: "ACCEPTED" | "DECLINED",
  userName: string,
  userEmail: string
) {
  return request<BackendAttendance>(
    `/api/groups/${groupId}/activities/${activityId}/attendance`,
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
