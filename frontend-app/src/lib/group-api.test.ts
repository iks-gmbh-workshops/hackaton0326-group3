// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addMemberToGroup,
  createGroup,
  deleteGroup,
  getGroup,
  getGroupMembers,
  isGroupApiError,
  leaveGroup,
  listGroups,
  listMyGroups,
  removeMemberFromGroup,
  updateGroup,
} from "./group-api";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("group-api", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("lists groups and my groups", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: "g1" }]));
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: "g2" }]));

    const groups = await listGroups("token-a");
    const myGroups = await listMyGroups("token-a");

    expect(groups).toEqual([{ id: "g1" }]);
    expect(myGroups).toEqual([{ id: "g2" }]);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/custom/groups", {
      headers: {
        Authorization: "Bearer token-a",
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/custom/groups/my", {
      headers: {
        Authorization: "Bearer token-a",
      },
    });
  });

  it("gets one group and its members", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "g1" }));
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: "u1" }]));

    const group = await getGroup("token-a", "g1");
    const members = await getGroupMembers("token-a", "g1");

    expect(group).toEqual({ id: "g1" });
    expect(members).toEqual([{ id: "u1" }]);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/custom/groups/g1", {
      headers: {
        Authorization: "Bearer token-a",
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/custom/groups/g1/members", {
      headers: {
        Authorization: "Bearer token-a",
      },
    });
  });

  it("creates and updates a group with normalized description", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "g-new" }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "g-new", name: "Updated" }));

    const created = await createGroup("token-b", "Hikers");
    const updated = await updateGroup("token-b", "g-new", "Hikers+", "desc");

    expect(created).toEqual({ id: "g-new" });
    expect(updated).toEqual({ id: "g-new", name: "Updated" });
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/custom/groups", {
      method: "POST",
      body: JSON.stringify({ name: "Hikers", description: null }),
      headers: {
        Authorization: "Bearer token-b",
        "Content-Type": "application/json",
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/custom/groups/g-new", {
      method: "PUT",
      body: JSON.stringify({ name: "Hikers+", description: "desc" }),
      headers: {
        Authorization: "Bearer token-b",
        "Content-Type": "application/json",
      },
    });
  });

  it("normalizes empty update description to null", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "g1" }));

    await updateGroup("token-empty", "g1", "Name", "");

    expect(fetchMock).toHaveBeenCalledWith("/api/custom/groups/g1", {
      method: "PUT",
      body: JSON.stringify({ name: "Name", description: null }),
      headers: {
        Authorization: "Bearer token-empty",
        "Content-Type": "application/json",
      },
    });
  });

  it("handles membership write operations and encodes user id", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await addMemberToGroup("token-c", "g1", { email: "new@example.com" });
    await removeMemberFromGroup("token-c", "g1", "user/with spaces");
    await leaveGroup("token-c", "g1");
    await deleteGroup("token-c", "g1");
    await addMemberToGroup("token-c", "g1", { userId: "u9" });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/custom/groups/g1/members", {
      method: "POST",
      body: JSON.stringify({ email: "new@example.com" }),
      headers: {
        Authorization: "Bearer token-c",
        "Content-Type": "application/json",
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/custom/groups/g1/members/user%2Fwith%20spaces",
      {
        method: "DELETE",
        headers: {
          Authorization: "Bearer token-c",
        },
      }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/custom/groups/g1/members/me", {
      method: "DELETE",
      headers: {
        Authorization: "Bearer token-c",
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(4, "/api/custom/groups/g1", {
      method: "DELETE",
      headers: {
        Authorization: "Bearer token-c",
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(5, "/api/custom/groups/g1/members", {
      method: "POST",
      body: JSON.stringify({ userId: "u9" }),
      headers: {
        Authorization: "Bearer token-c",
        "Content-Type": "application/json",
      },
    });
  });

  it("throws a GroupApiError and supports type guard", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "Denied" }, 403));

    let caught: unknown;
    try {
      await listGroups("token");
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({
      status: 403,
      message: "Denied",
    });
    expect(isGroupApiError(caught)).toBe(true);
    expect(isGroupApiError(new Error("other"))).toBe(false);
  });

  it("uses fallback error text when error body cannot be parsed", async () => {
    fetchMock.mockResolvedValueOnce(new Response("oops", { status: 500 }));

    await expect(getGroup("token", "g1")).rejects.toMatchObject({
      status: 500,
      message: "Request failed with status 500",
    });
  });

  it("uses backend error field when message field is missing", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "Forbidden" }, 403));

    await expect(getGroup("token", "g1")).rejects.toMatchObject({
      status: 403,
      message: "Forbidden",
    });
  });
});
