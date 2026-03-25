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

export async function searchUsers(token: string, query: string) {
  const response = await fetch(
    `${getBackendBaseUrl()}/api/users?query=${encodeURIComponent(query)}`,
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

export function isUserApiError(error: unknown): error is UserApiError {
  return error instanceof UserApiError;
}
