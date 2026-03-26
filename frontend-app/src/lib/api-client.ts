const BACKEND_PROXY_BASE_URL = "/api/custom";

export class ApiRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type ErrorConstructor<TError extends ApiRequestError> = new (
  status: number,
  message: string
) => TError;

type QueryValue = string | number | boolean;

function toHeaderRecord(headers?: HeadersInit): Record<string, string> {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return Object.entries(headers).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === "string") {
      acc[key] = value;
    }

    return acc;
  }, {});
}

function hasHeader(headers: Record<string, string>, name: string) {
  const normalizedName = name.toLowerCase();
  return Object.keys(headers).some((headerName) => headerName.toLowerCase() === normalizedName);
}

async function parseErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as { message?: string; error?: string };
    return body.message || body.error || `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

export interface ApiRequestOptions<TError extends ApiRequestError> {
  path: string;
  token: string;
  init?: RequestInit;
  errorType: ErrorConstructor<TError>;
  defaultHeaders?: HeadersInit;
  baseUrl?: string;
}

export async function requestJson<T, TError extends ApiRequestError>({
  path,
  token,
  init,
  errorType,
  defaultHeaders,
  baseUrl = BACKEND_PROXY_BASE_URL,
}: ApiRequestOptions<TError>): Promise<T> {
  const headers = {
    ...toHeaderRecord(defaultHeaders),
    Authorization: `Bearer ${token}`,
    ...toHeaderRecord(init?.headers),
  };

  if (init?.body && !hasHeader(headers, "content-type")) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new errorType(response.status, await parseErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function buildPath(path: string, query?: Record<string, QueryValue | undefined>) {
  if (!query) {
    return path;
  }

  const entries = Object.entries(query).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return path;
  }

  const queryString = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");

  return `${path}?${queryString}`;
}
