import { NextResponse, type NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const REQUIRED_BACKEND_ROLE = "REGISTERED_USER";

function getBackendBaseUrl() {
  return (
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    "http://localhost:8000"
  ).replace(/\/$/, "");
}

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token.trim();
}

function decodeTokenPayload(token: string) {
  const [, payload] = token.split(".");
  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const parsed = JSON.parse(Buffer.from(padded, "base64").toString("utf-8"));
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function isExpired(payload: Record<string, unknown>) {
  const exp = payload.exp;
  if (typeof exp !== "number") {
    return true;
  }

  return exp <= Math.floor(Date.now() / 1000);
}

function hasRegisteredRole(payload: Record<string, unknown>) {
  const realmAccess = payload.realm_access;
  if (typeof realmAccess !== "object" || realmAccess === null) {
    return false;
  }

  const roles = (realmAccess as { roles?: unknown }).roles;
  if (!Array.isArray(roles)) {
    return false;
  }

  return roles.includes(REQUIRED_BACKEND_ROLE);
}

async function forwardToBackend(
  request: NextRequest,
  path: string[],
  bearerToken: string
) {
  const backendPath = path.map((segment) => encodeURIComponent(segment)).join("/");
  const targetUrl = new URL(`${getBackendBaseUrl()}/api/${backendPath}`);
  targetUrl.search = request.nextUrl.search;

  const headers = new Headers();
  headers.set("authorization", `Bearer ${bearerToken}`);

  const accept = request.headers.get("accept");
  if (accept) {
    headers.set("accept", accept);
  }

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const response = await fetch(targetUrl, init);
  const responseHeaders = new Headers();
  const responseContentType = response.headers.get("content-type");
  if (responseContentType) {
    responseHeaders.set("content-type", responseContentType);
  }

  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

async function handleRequest(request: NextRequest, context: RouteContext) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = decodeTokenPayload(token);
  if (!payload || isExpired(payload)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!hasRegisteredRole(payload)) {
    return NextResponse.json(
      { message: `Forbidden. Missing required role ${REQUIRED_BACKEND_ROLE}.` },
      { status: 403 }
    );
  }

  const { path } = await context.params;
  if (!Array.isArray(path) || path.length === 0) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    return await forwardToBackend(request, path, token);
  } catch {
    return NextResponse.json(
      { message: "Unable to reach backend service." },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}
