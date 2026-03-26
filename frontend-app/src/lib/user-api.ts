import type { Notification } from "./types";

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
}

class UserApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getBackendBaseUrl() {
  return "/api/custom";
}

async function parseErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as { message?: string; error?: string };
    return body.message || body.error || `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

export async function searchUsers(token: string, query: string) {
  const response = await fetch(
    `${getBackendBaseUrl()}/users?query=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new UserApiError(response.status, await parseErrorMessage(response));
  }

  return (await response.json()) as DirectoryUser[];
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
  const response = await fetch(`${getBackendBaseUrl()}/users/me/notifications`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new UserApiError(response.status, await parseErrorMessage(response));
  }

  const body = (await response.json()) as Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    link?: string | null;
  }>;

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
  const response = await fetch(`${getBackendBaseUrl()}/users/me/activities`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new UserApiError(response.status, await parseErrorMessage(response));
  }

  return (await response.json()) as UserActivity[];
}

export async function updateOwnProfile(
  token: string,
  firstName: string,
  lastName: string,
  email: string
) {
  const response = await fetch(`${getBackendBaseUrl()}/users/me`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ firstName, lastName, email }),
  });

  if (!response.ok) {
    throw new UserApiError(response.status, await parseErrorMessage(response));
  }
}

export async function deleteOwnAccount(token: string) {
  const response = await fetch(`${getBackendBaseUrl()}/users/me`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new UserApiError(response.status, await parseErrorMessage(response));
  }
}

export function isUserApiError(error: unknown): error is UserApiError {
  return error instanceof UserApiError;
}
