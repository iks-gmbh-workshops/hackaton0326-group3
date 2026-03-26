// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createActivity,
  deleteActivity,
  getActivity,
  isActivityApiError,
  listAttendees,
  listGroupActivities,
  respondToActivity,
  updateActivity,
} from "./activity-api";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("activity-api", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("lists group activities", async () => {
    const payload = [{ id: "a1" }];
    fetchMock.mockResolvedValueOnce(jsonResponse(payload));

    const result = await listGroupActivities("token-1", "g1");

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith("/api/custom/groups/g1/activities", {
      headers: {
        Authorization: "Bearer token-1",
      },
    });
  });

  it("loads a single activity", async () => {
    const payload = { id: "a1" };
    fetchMock.mockResolvedValueOnce(jsonResponse(payload));

    const result = await getActivity("token-1", "g1", "a1");

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith("/api/custom/groups/g1/activities/a1", {
      headers: {
        Authorization: "Bearer token-1",
      },
    });
  });

  it("creates and updates an activity with normalized optional fields", async () => {
    const created = { id: "a-new" };
    const updated = { id: "a-new", title: "Updated" };
    fetchMock.mockResolvedValueOnce(jsonResponse(created));
    fetchMock.mockResolvedValueOnce(jsonResponse(updated));

    const createdResult = await createActivity(
      "token-2",
      "g1",
      "Morning Run",
      undefined,
      "2026-04-01",
      "08:00",
      undefined
    );
    const updatedResult = await updateActivity(
      "token-2",
      "g1",
      "a-new",
      "Morning Run+",
      "Bring water",
      "2026-04-02",
      "09:00",
      "Park"
    );

    expect(createdResult).toEqual(created);
    expect(updatedResult).toEqual(updated);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/custom/groups/g1/activities", {
      method: "POST",
      body: JSON.stringify({
        title: "Morning Run",
        description: null,
        date: "2026-04-01",
        time: "08:00",
        location: null,
      }),
      headers: {
        Authorization: "Bearer token-2",
        "Content-Type": "application/json",
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/custom/groups/g1/activities/a-new",
      {
        method: "PUT",
        body: JSON.stringify({
          title: "Morning Run+",
          description: "Bring water",
          date: "2026-04-02",
          time: "09:00",
          location: "Park",
        }),
        headers: {
          Authorization: "Bearer token-2",
          "Content-Type": "application/json",
        },
      }
    );
  });

  it("deletes an activity and handles 204", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const result = await deleteActivity("token-1", "g1", "a1");

    expect(result).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("/api/custom/groups/g1/activities/a1", {
      method: "DELETE",
      headers: {
        Authorization: "Bearer token-1",
      },
    });
  });

  it("lists attendees and responds with status", async () => {
    const attendees = [{ id: "att-1" }];
    const response = { id: "att-2", status: "MAYBE" };
    fetchMock.mockResolvedValueOnce(jsonResponse(attendees));
    fetchMock.mockResolvedValueOnce(jsonResponse(response));

    const listed = await listAttendees("token-3", "g2", "a2");
    const responded = await respondToActivity(
      "token-3",
      "g2",
      "a2",
      "MAYBE",
      "Jane",
      "jane@example.com"
    );

    expect(listed).toEqual(attendees);
    expect(responded).toEqual(response);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/custom/groups/g2/activities/a2/attendance",
      {
        headers: {
          Authorization: "Bearer token-3",
        },
      }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/custom/groups/g2/activities/a2/attendance",
      {
        method: "PUT",
        body: JSON.stringify({
          status: "MAYBE",
          userName: "Jane",
          userEmail: "jane@example.com",
        }),
        headers: {
          Authorization: "Bearer token-3",
          "Content-Type": "application/json",
        },
      }
    );
  });

  it("throws an ActivityApiError with message from backend", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "Bad request" }, 400));

    await expect(listGroupActivities("token", "g1")).rejects.toMatchObject({
      status: 400,
      message: "Bad request",
    });
  });

  it("uses backend error field when message is missing", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "No access" }, 403));

    await expect(listGroupActivities("token", "g1")).rejects.toMatchObject({
      status: 403,
      message: "No access",
    });
  });

  it("normalizes empty optional update fields to null", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "a1" }));

    await updateActivity(
      "token-4",
      "g9",
      "a1",
      "Name",
      "",
      "2026-04-03",
      "10:00",
      ""
    );

    expect(fetchMock).toHaveBeenCalledWith("/api/custom/groups/g9/activities/a1", {
      method: "PUT",
      body: JSON.stringify({
        title: "Name",
        description: null,
        date: "2026-04-03",
        time: "10:00",
        location: null,
      }),
      headers: {
        Authorization: "Bearer token-4",
        "Content-Type": "application/json",
      },
    });
  });

  it("falls back to generic error message when error payload is invalid JSON", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("not-json", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      })
    );

    await expect(getActivity("token", "g1", "a1")).rejects.toMatchObject({
      status: 500,
      message: "Request failed with status 500",
    });
  });

  it("exposes a working error type guard", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "Forbidden" }, 403));

    let caught: unknown;
    try {
      await listGroupActivities("token", "g1");
    } catch (error) {
      caught = error;
    }

    expect(isActivityApiError(caught)).toBe(true);
    expect(isActivityApiError(new Error("x"))).toBe(false);
  });
});
