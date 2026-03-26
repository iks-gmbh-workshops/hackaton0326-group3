import { act, cleanup, render, waitFor } from "@testing-library/react";
import type { KeycloakProfile } from "keycloak-js";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./auth-context";
import type { Notification } from "./types";

const { getKeycloakClientMock, listMyNotificationsMock } = vi.hoisted(() => ({
  getKeycloakClientMock: vi.fn(),
  listMyNotificationsMock: vi.fn(),
}));

vi.mock("./keycloak", () => ({
  getKeycloakClient: getKeycloakClientMock,
}));

vi.mock("./user-api", () => ({
  listMyNotifications: listMyNotificationsMock,
}));

type FakeKeycloak = {
  didInitialize: boolean;
  authenticated: boolean;
  token: string | null;
  tokenParsed: Record<string, unknown> | null;
  init: ReturnType<typeof vi.fn>;
  loadUserProfile: ReturnType<typeof vi.fn>;
  updateToken: ReturnType<typeof vi.fn>;
  clearToken: ReturnType<typeof vi.fn>;
  login: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  onAuthSuccess?: () => void;
  onAuthRefreshSuccess?: () => void;
  onAuthError?: () => void;
  onAuthRefreshError?: () => void;
  onAuthLogout?: () => void;
  onTokenExpired?: () => void;
};

function createFakeKeycloak(overrides: Partial<FakeKeycloak> = {}): FakeKeycloak {
  return {
    didInitialize: false,
    authenticated: false,
    token: null,
    tokenParsed: null,
    init: vi.fn().mockResolvedValue(true),
    loadUserProfile: vi.fn().mockResolvedValue({} as KeycloakProfile),
    updateToken: vi.fn().mockResolvedValue(true),
    clearToken: vi.fn(),
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function authObserver() {
  let latest: ReturnType<typeof useAuth> | null = null;
  function Observer() {
    const auth = useAuth();

    useEffect(() => {
      latest = auth;
    }, [auth]);

    return null;
  }

  return {
    Observer,
    getLatest: () => latest,
  };
}

function notification(id: string): Notification {
  return {
    id,
    type: "activity_invite",
    title: "Title",
    message: "Message",
    read: false,
    createdAt: "2026-01-01T00:00:00Z",
    link: "/x",
  };
}

function futureExp(seconds = 3600) {
  return Math.floor(Date.now() / 1000) + seconds;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    getKeycloakClientMock.mockReset();
    listMyNotificationsMock.mockReset();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("stops loading when no keycloak client is available", async () => {
    getKeycloakClientMock.mockReturnValue(null);
    const { Observer, getLatest } = authObserver();

    render(
      <AuthProvider>
        <Observer />
      </AuthProvider>
    );

    await waitFor(() => expect(getLatest()?.isLoading).toBe(false));
    expect(getLatest()?.isLoggedIn).toBe(false);
    expect(getLatest()?.user).toBeNull();
    expect(getLatest()?.accessToken).toBeNull();

    await act(async () => {
      await getLatest()?.login();
    });
  });

  it("initializes authenticated user, loads notifications, and handles actions", async () => {
    window.history.replaceState({}, "", "/dashboard?tab=mine#profile");
    const keycloak = createFakeKeycloak({
      authenticated: true,
      token: "token-123",
      tokenParsed: {
        exp: futureExp(),
        sub: "user-1",
        name: "Jane Doe",
        email: "jane@example.com",
        realm_access: { roles: ["GROUP_ADMIN"] },
      },
      loadUserProfile: vi.fn().mockResolvedValue({
        id: "profile-id",
        username: "jane",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
      } as KeycloakProfile),
    });
    getKeycloakClientMock.mockReturnValue(keycloak);
    listMyNotificationsMock.mockResolvedValue([notification("n1")]);
    const { Observer, getLatest } = authObserver();

    render(
      <AuthProvider>
        <Observer />
      </AuthProvider>
    );

    await waitFor(() => expect(getLatest()?.isLoading).toBe(false));
    await waitFor(() => expect(getLatest()?.isLoggedIn).toBe(true));

    expect(keycloak.init).toHaveBeenCalledWith({
      onLoad: "check-sso",
      pkceMethod: "S256",
      checkLoginIframe: false,
      silentCheckSsoFallback: false,
      scope: "openid profile email roles",
      redirectUri: `${window.location.origin}/dashboard`,
    });
    expect(listMyNotificationsMock).toHaveBeenCalledWith("token-123");
    expect(getLatest()?.user).toMatchObject({
      id: "user-1",
      name: "Jane Doe",
      email: "jane@example.com",
      role: "group_admin",
    });
    expect(getLatest()?.notifications).toEqual([notification("n1")]);
    expect(getLatest()?.accessToken).toBe("token-123");

    await act(async () => {
      await getLatest()?.login();
    });
    expect(keycloak.login).toHaveBeenCalledWith({
      scope: "openid profile email roles",
      redirectUri: `${window.location.origin}/dashboard`,
    });

    await act(async () => {
      await getLatest()?.logout();
    });
    expect(keycloak.logout).toHaveBeenCalledWith({
      redirectUri: window.location.origin,
    });
    expect(keycloak.clearToken).toHaveBeenCalledTimes(1);

    act(() => {
      getLatest()?.consumeNotification("n1");
    });
    await waitFor(() => expect(getLatest()?.notifications).toEqual([]));
  });

  it("falls back to defaults when profile and notifications cannot be loaded", async () => {
    const keycloak = createFakeKeycloak({
      authenticated: true,
      token: "token-abc",
      tokenParsed: { exp: futureExp() },
      loadUserProfile: vi.fn().mockRejectedValue(new Error("profile failed")),
    });
    getKeycloakClientMock.mockReturnValue(keycloak);
    listMyNotificationsMock.mockRejectedValue(new Error("notifications failed"));
    const { Observer, getLatest } = authObserver();

    render(
      <AuthProvider>
        <Observer />
      </AuthProvider>
    );

    await waitFor(() => expect(getLatest()?.isLoading).toBe(false));
    await waitFor(() => expect(getLatest()?.isLoggedIn).toBe(true));

    expect(getLatest()?.user).toMatchObject({
      id: "unknown-user",
      name: "Authenticated User",
      email: "unknown@example.com",
      role: "registered",
    });
    expect(getLatest()?.notifications).toEqual([]);
    expect(getLatest()?.accessToken).toBe("token-abc");
  });

  it("clears session when token refresh fails", async () => {
    const keycloak = createFakeKeycloak({
      authenticated: true,
      token: "token-initial",
      tokenParsed: {
        exp: futureExp(),
        sub: "user-1",
        preferred_username: "jane",
        realm_access: { roles: ["REGISTERED_USER"] },
      },
      updateToken: vi.fn().mockRejectedValue(new Error("expired")),
    });
    getKeycloakClientMock.mockReturnValue(keycloak);
    listMyNotificationsMock.mockResolvedValue([]);
    const { Observer, getLatest } = authObserver();

    render(
      <AuthProvider>
        <Observer />
      </AuthProvider>
    );

    await waitFor(() => expect(getLatest()?.isLoggedIn).toBe(true));

    await act(async () => {
      keycloak.onTokenExpired?.();
    });

    await waitFor(() => expect(getLatest()?.isLoggedIn).toBe(false));
    expect(keycloak.clearToken).toHaveBeenCalledTimes(1);
    expect(getLatest()?.notifications).toEqual([]);
    expect(getLatest()?.accessToken).toBeNull();
  });

  it("updates access token when refresh succeeds", async () => {
    const keycloak = createFakeKeycloak({
      authenticated: true,
      token: "token-initial",
      tokenParsed: {
        exp: futureExp(),
        sub: "user-2",
        preferred_username: "john",
        realm_access: { roles: ["REGISTERED_USER"] },
      },
    });
    keycloak.updateToken.mockImplementation(async () => {
      keycloak.token = "token-refreshed";
      return true;
    });
    getKeycloakClientMock.mockReturnValue(keycloak);
    listMyNotificationsMock.mockResolvedValue([]);
    const { Observer, getLatest } = authObserver();

    render(
      <AuthProvider>
        <Observer />
      </AuthProvider>
    );

    await waitFor(() => expect(getLatest()?.isLoggedIn).toBe(true));

    await act(async () => {
      keycloak.onTokenExpired?.();
    });

    await waitFor(() => expect(keycloak.updateToken).toHaveBeenCalledWith(30));
    await waitFor(() => expect(getLatest()?.accessToken).toBe("token-refreshed"));
  });

  it("reacts to keycloak auth events", async () => {
    const keycloak = createFakeKeycloak({
      authenticated: true,
      token: "token-initial",
      tokenParsed: {
        exp: futureExp(),
        sub: "user-2",
        preferred_username: "john",
        realm_access: { roles: ["REGISTERED_USER"] },
      },
    });
    getKeycloakClientMock.mockReturnValue(keycloak);
    listMyNotificationsMock.mockResolvedValue([]);
    const { Observer, getLatest } = authObserver();

    render(
      <AuthProvider>
        <Observer />
      </AuthProvider>
    );

    await waitFor(() => expect(getLatest()?.isLoggedIn).toBe(true));

    keycloak.token = "token-refreshed";
    act(() => {
      keycloak.onAuthRefreshSuccess?.();
    });
    await waitFor(() => expect(getLatest()?.accessToken).toBe("token-refreshed"));

    act(() => {
      keycloak.onAuthLogout?.();
    });
    await waitFor(() => expect(getLatest()?.isLoggedIn).toBe(false));

    act(() => {
      keycloak.onAuthSuccess?.();
    });
    await waitFor(() => expect(listMyNotificationsMock).toHaveBeenCalledTimes(2));
  });

  it("handles init failure and supports logout without keycloak", async () => {
    const failing = createFakeKeycloak({
      init: vi.fn().mockRejectedValue(new Error("init failed")),
    });
    getKeycloakClientMock.mockReturnValueOnce(failing);
    const { Observer, getLatest } = authObserver();

    render(
      <AuthProvider>
        <Observer />
      </AuthProvider>
    );

    await waitFor(() => expect(getLatest()?.isLoading).toBe(false));
    expect(getLatest()?.isLoggedIn).toBe(false);

    getKeycloakClientMock.mockReturnValueOnce(null);
    await act(async () => {
      await getLatest()?.logout();
    });
    expect(getLatest()?.isLoggedIn).toBe(false);
    expect(getLatest()?.notifications).toEqual([]);
    expect(getLatest()?.accessToken).toBeNull();
  });

  it("clears session when token is already expired on init", async () => {
    const keycloak = createFakeKeycloak({
      authenticated: true,
      token: "token-stale",
      tokenParsed: {
        exp: Math.floor(Date.now() / 1000) - 5,
        sub: "user-3",
      },
    });
    getKeycloakClientMock.mockReturnValue(keycloak);
    const { Observer, getLatest } = authObserver();

    render(
      <AuthProvider>
        <Observer />
      </AuthProvider>
    );

    await waitFor(() => expect(getLatest()?.isLoading).toBe(false));
    expect(getLatest()?.isLoggedIn).toBe(false);
    expect(keycloak.clearToken).toHaveBeenCalledTimes(1);
  });

  it("clears session when keycloak emits auth errors", async () => {
    const keycloak = createFakeKeycloak({
      authenticated: true,
      token: "token-initial",
      tokenParsed: {
        exp: futureExp(),
        sub: "user-4",
      },
    });
    getKeycloakClientMock.mockReturnValue(keycloak);
    listMyNotificationsMock.mockResolvedValue([]);
    const { Observer, getLatest } = authObserver();

    render(
      <AuthProvider>
        <Observer />
      </AuthProvider>
    );

    await waitFor(() => expect(getLatest()?.isLoggedIn).toBe(true));

    act(() => {
      keycloak.onAuthRefreshError?.();
    });
    await waitFor(() => expect(getLatest()?.isLoggedIn).toBe(false));
    expect(keycloak.clearToken).toHaveBeenCalledTimes(1);
  });
});
