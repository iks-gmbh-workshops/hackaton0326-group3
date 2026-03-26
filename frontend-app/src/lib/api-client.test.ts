// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, buildPath, requestJson } from "./api-client";

const fetchMock = vi.fn<typeof fetch>();

class TestApiError extends ApiRequestError {}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api-client", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("builds paths with encoded query params", () => {
    expect(buildPath("/users", { query: "Jane Doe+Admin", page: 2 })).toBe(
      "/users?query=Jane%20Doe%2BAdmin&page=2"
    );
    expect(buildPath("/users", { query: undefined })).toBe("/users");
  });

  it("merges auth/default/custom headers and sets json content-type when body exists", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await requestJson<{ ok: boolean }, TestApiError>({
      path: "/users",
      token: "token-1",
      errorType: TestApiError,
      defaultHeaders: {
        Accept: "application/json",
      },
      init: {
        method: "POST",
        headers: {
          "X-Trace-Id": "trace-1",
        },
        body: JSON.stringify({ name: "Jane" }),
      },
    });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith("/api/custom/users", {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer token-1",
        "X-Trace-Id": "trace-1",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Jane" }),
    });
  });

  it("keeps explicit content-type header instead of overriding it", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await requestJson<{ ok: boolean }, TestApiError>({
      path: "/users",
      token: "token-2",
      errorType: TestApiError,
      init: {
        method: "POST",
        headers: {
          "content-type": "text/plain",
        },
        body: "payload",
      },
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/custom/users", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-2",
        "content-type": "text/plain",
      },
      body: "payload",
    });
  });

  it("returns undefined for 204 responses", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const result = await requestJson<void, TestApiError>({
      path: "/users/me",
      token: "token-3",
      errorType: TestApiError,
      init: { method: "DELETE" },
    });

    expect(result).toBeUndefined();
  });

  it("throws typed errors with parsed backend message", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "Denied" }, 403));

    await expect(
      requestJson<void, TestApiError>({
        path: "/users",
        token: "token-4",
        errorType: TestApiError,
      })
    ).rejects.toMatchObject({
      status: 403,
      message: "Denied",
    });
  });

  it("falls back to status text when error response is not valid json", async () => {
    fetchMock.mockResolvedValueOnce(new Response("oops", { status: 500 }));

    await expect(
      requestJson<void, TestApiError>({
        path: "/users",
        token: "token-5",
        errorType: TestApiError,
      })
    ).rejects.toMatchObject({
      status: 500,
      message: "Request failed with status 500",
    });
  });
});
