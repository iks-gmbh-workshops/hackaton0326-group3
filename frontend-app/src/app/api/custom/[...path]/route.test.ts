// @vitest-environment node

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PATCH, POST, PUT } from "./route";

const fetchMock = vi.fn<typeof fetch>();

function encodeBase64Url(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function buildToken(payload: Record<string, unknown>) {
  return `header.${encodeBase64Url(JSON.stringify(payload))}.signature`;
}

describe("custom backend proxy route", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-03-26T00:00:00Z").getTime());
    delete process.env.BACKEND_URL;
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when authorization header is missing", async () => {
    const request = new NextRequest("http://localhost/api/custom/groups");
    const response = await GET(request, { params: Promise.resolve({ path: ["groups"] }) });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: "Unauthorized" });
  });

  it("returns 401 for malformed bearer header or invalid token payload", async () => {
    const malformed = new NextRequest("http://localhost/api/custom/groups", {
      headers: { authorization: "Token abc" },
    });
    const invalidPayload = new NextRequest("http://localhost/api/custom/groups", {
      headers: { authorization: "Bearer not.a-jwt" },
    });

    const malformedResponse = await GET(malformed, {
      params: Promise.resolve({ path: ["groups"] }),
    });
    const invalidResponse = await GET(invalidPayload, {
      params: Promise.resolve({ path: ["groups"] }),
    });

    expect(malformedResponse.status).toBe(401);
    expect(invalidResponse.status).toBe(401);
  });

  it("returns 401 for expired token", async () => {
    const token = buildToken({
      exp: Math.floor(Date.now() / 1000) - 1,
      realm_access: { roles: ["REGISTERED_USER"] },
    });
    const request = new NextRequest("http://localhost/api/custom/groups", {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await GET(request, { params: Promise.resolve({ path: ["groups"] }) });

    expect(response.status).toBe(401);
  });

  it("returns 403 when required role is missing", async () => {
    const token = buildToken({
      exp: Math.floor(Date.now() / 1000) + 3600,
      realm_access: { roles: ["GROUP_MEMBER"] },
    });
    const request = new NextRequest("http://localhost/api/custom/groups", {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await GET(request, { params: Promise.resolve({ path: ["groups"] }) });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      message: "Forbidden. Missing required role REGISTERED_USER.",
    });
  });

  it("returns 403 when realm_access is not an object", async () => {
    const token = buildToken({
      exp: Math.floor(Date.now() / 1000) + 3600,
      realm_access: "invalid",
    });
    const request = new NextRequest("http://localhost/api/custom/groups", {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await GET(request, { params: Promise.resolve({ path: ["groups"] }) });
    expect(response.status).toBe(403);
  });

  it("returns 403 when roles is not an array", async () => {
    const token = buildToken({
      exp: Math.floor(Date.now() / 1000) + 3600,
      realm_access: { roles: "REGISTERED_USER" },
    });
    const request = new NextRequest("http://localhost/api/custom/groups", {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await GET(request, { params: Promise.resolve({ path: ["groups"] }) });
    expect(response.status).toBe(403);
  });

  it("returns 404 when no path segments are provided", async () => {
    const token = buildToken({
      exp: Math.floor(Date.now() / 1000) + 3600,
      realm_access: { roles: ["REGISTERED_USER"] },
    });
    const request = new NextRequest("http://localhost/api/custom", {
      headers: { authorization: `Bearer ${token}` },
    });

    const response = await GET(request, {
      params: Promise.resolve({ path: [] }),
    });

    expect(request).toBeDefined();
    expect(response.status).toBe(404);
  });

  it("forwards GET requests to backend with encoded path and query", async () => {
    const token = buildToken({
      exp: Math.floor(Date.now() / 1000) + 3600,
      realm_access: { roles: ["REGISTERED_USER"] },
    });
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8" },
      })
    );

    const request = new NextRequest("http://localhost/api/custom/groups?search=trail", {
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
      },
    });
    const response = await GET(request, {
      params: Promise.resolve({ path: ["groups", "a/b"] }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.headers.get("content-type")).toContain("application/json");

    const [targetUrl, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(targetUrl)).toBe("http://localhost:8000/api/groups/a%2Fb?search=trail");
    expect(init.method).toBe("GET");
    expect(init.cache).toBe("no-store");
    expect(init.redirect).toBe("manual");
    expect((init.headers as Headers).get("authorization")).toBe(`Bearer ${token}`);
    expect((init.headers as Headers).get("accept")).toBe("application/json");
    expect(init.body).toBeUndefined();
  });

  it("uses BACKEND_URL when provided and strips trailing slash", async () => {
    process.env.BACKEND_URL = "http://backend.internal:9000/";
    const token = buildToken({
      exp: Math.floor(Date.now() / 1000) + 3600,
      realm_access: { roles: ["REGISTERED_USER"] },
    });
    fetchMock.mockResolvedValueOnce(
      new Response("ok", {
        status: 200,
      })
    );

    const request = new NextRequest("http://localhost/api/custom/health", {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    const response = await GET(request, {
      params: Promise.resolve({ path: ["health"] }),
    });

    expect(response.status).toBe(200);
    const [targetUrl, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(targetUrl)).toBe("http://backend.internal:9000/api/health");
    expect((init.headers as Headers).get("content-type")).toBeNull();
  });

  it("forwards POST body and content type", async () => {
    const token = buildToken({
      exp: Math.floor(Date.now() / 1000) + 3600,
      realm_access: { roles: ["REGISTERED_USER"] },
    });
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ created: true }), {
        status: 201,
        headers: { "content-type": "application/json" },
      })
    );

    const request = new NextRequest("http://localhost/api/custom/groups", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Weekend" }),
    });
    const response = await POST(request, {
      params: Promise.resolve({ path: ["groups"] }),
    });

    expect(response.status).toBe(201);
    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(init.method).toBe("POST");
    expect((init.headers as Headers).get("content-type")).toBe("application/json");
    expect(init.body).toBeInstanceOf(ArrayBuffer);
  });

  it("returns 502 when backend call throws", async () => {
    const token = buildToken({
      exp: Math.floor(Date.now() / 1000) + 3600,
      realm_access: { roles: ["REGISTERED_USER"] },
    });
    fetchMock.mockRejectedValueOnce(new Error("connection refused"));

    const request = new NextRequest("http://localhost/api/custom/groups", {
      headers: { authorization: `Bearer ${token}` },
    });
    const response = await GET(request, {
      params: Promise.resolve({ path: ["groups"] }),
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      message: "Unable to reach backend service.",
    });
  });

  it("supports PUT, PATCH, and DELETE handlers", async () => {
    const methods = [PUT, PATCH, DELETE];
    for (const method of methods) {
      const request = new NextRequest("http://localhost/api/custom/groups");
      const response = await method(request, {
        params: Promise.resolve({ path: ["groups"] }),
      });
      expect(response.status).toBe(401);
    }
  });
});
