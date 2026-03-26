// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteOwnAccount,
  isUserApiError,
  listMyNotifications,
  searchUsers,
} from "./user-api";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("user-api", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("searches users with encoded query", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: "u1", name: "Jane" }]));

    const result = await searchUsers("token-1", "Jane Doe+Admin");

    expect(result).toEqual([{ id: "u1", name: "Jane" }]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/custom/users?query=Jane%20Doe%2BAdmin",
      {
        headers: {
          Authorization: "Bearer token-1",
          Accept: "application/json",
        },
      }
    );
  });

  it("maps notification types and nullable links", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          id: "n1",
          type: "group_invite",
          title: "Invite",
          message: "msg",
          read: false,
          createdAt: "2026-01-01T00:00:00Z",
          link: null,
        },
        {
          id: "n2",
          type: "unknown_type",
          title: "Fallback",
          message: "msg",
          read: true,
          createdAt: "2026-01-02T00:00:00Z",
          link: "/x",
        },
      ])
    );

    const result = await listMyNotifications("token-2");

    expect(result).toEqual([
      {
        id: "n1",
        type: "group_invite",
        title: "Invite",
        message: "msg",
        read: false,
        createdAt: "2026-01-01T00:00:00Z",
        link: undefined,
      },
      {
        id: "n2",
        type: "activity_invite",
        title: "Fallback",
        message: "msg",
        read: true,
        createdAt: "2026-01-02T00:00:00Z",
        link: "/x",
      },
    ]);
  });

  it("preserves all supported notification types", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          id: "n1",
          type: "activity_invite",
          title: "A",
          message: "A",
          read: false,
          createdAt: "2026-01-01T00:00:00Z",
        },
        {
          id: "n2",
          type: "rsvp_update",
          title: "B",
          message: "B",
          read: false,
          createdAt: "2026-01-01T00:00:00Z",
        },
        {
          id: "n3",
          type: "reminder",
          title: "C",
          message: "C",
          read: false,
          createdAt: "2026-01-01T00:00:00Z",
        },
      ])
    );

    const result = await listMyNotifications("token-types");

    expect(result.map((item) => item.type)).toEqual([
      "activity_invite",
      "rsvp_update",
      "reminder",
    ]);
  });

  it("deletes own account", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await deleteOwnAccount("token-3");

    expect(fetchMock).toHaveBeenCalledWith("/api/custom/users/me", {
      method: "DELETE",
      headers: {
        Authorization: "Bearer token-3",
        Accept: "application/json",
      },
    });
  });

  it("throws UserApiError and supports type guard", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "Nope" }, 401));

    let caught: unknown;
    try {
      await searchUsers("token", "x");
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({
      status: 401,
      message: "Nope",
    });
    expect(isUserApiError(caught)).toBe(true);
    expect(isUserApiError(new Error("x"))).toBe(false);
  });

  it("falls back to status text when error body is not valid JSON", async () => {
    fetchMock.mockResolvedValueOnce(new Response("bad", { status: 503 }));

    await expect(listMyNotifications("token")).rejects.toMatchObject({
      status: 503,
      message: "Request failed with status 503",
    });
  });

  it("throws from deleteOwnAccount when backend responds with an error", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "Denied" }, 403));

    await expect(deleteOwnAccount("token-denied")).rejects.toMatchObject({
      status: 403,
      message: "Denied",
    });
  });
});
