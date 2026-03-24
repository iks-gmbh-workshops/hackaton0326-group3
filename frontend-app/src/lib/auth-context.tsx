"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { KeycloakProfile } from "keycloak-js";
import type { User } from "./types";
import { getKeycloakClient } from "./keycloak";

interface AuthContextValue {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  accessToken: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoggedIn: false,
  isLoading: true,
  accessToken: null,
  login: async () => {},
  logout: async () => {},
});

const rolePriority = [
  ["SYSTEM_ADMIN", "system_admin"],
  ["GROUP_ADMIN", "group_admin"],
  ["ACTIVITY_MEMBER", "activity_member"],
  ["GROUP_MEMBER", "group_member"],
  ["REGISTERED_USER", "registered"],
] as const;

function getFirstNonEmptyString(values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function mapRole(realmRoles: string[] | undefined): User["role"] {
  if (!realmRoles || realmRoles.length === 0) {
    return "registered";
  }

  for (const [realmRole, appRole] of rolePriority) {
    if (realmRoles.includes(realmRole)) {
      return appRole;
    }
  }

  return "registered";
}

function mapUser(profile: KeycloakProfile | null, tokenParsed: Record<string, unknown>): User {
  const fullName =
    getFirstNonEmptyString([
      tokenParsed.name,
      [tokenParsed.given_name, tokenParsed.family_name]
        .filter((v) => typeof v === "string" && v.trim())
        .join(" "),
      [profile?.firstName, profile?.lastName]
        .filter((v) => typeof v === "string" && v.trim())
        .join(" "),
      tokenParsed.preferred_username,
      profile?.username,
      tokenParsed.email,
      profile?.email,
    ]) ?? "Authenticated User";

  const email =
    getFirstNonEmptyString([
      tokenParsed.email,
      profile?.email,
      tokenParsed.preferred_username,
      profile?.username,
    ]) ?? "unknown@example.com";

  const realmAccess = tokenParsed.realm_access;
  const realmRoles =
    typeof realmAccess === "object" &&
    realmAccess !== null &&
    Array.isArray((realmAccess as { roles?: unknown }).roles)
      ? (realmAccess as { roles: string[] }).roles
      : undefined;

  return {
    id:
      getFirstNonEmptyString([tokenParsed.sub, profile?.id, tokenParsed.session_state]) ??
      "unknown-user",
    name: fullName,
    email,
    role: mapRole(realmRoles),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const keycloak = getKeycloakClient();
    if (!keycloak) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let refreshInterval: number | undefined;

    const syncAuthenticatedUser = async () => {
      if (!keycloak.authenticated || !keycloak.tokenParsed) {
        if (!cancelled) {
          setUser(null);
          setAccessToken(null);
        }
        return;
      }

      let profile: KeycloakProfile | null = null;
      try {
        profile = await keycloak.loadUserProfile();
      } catch {
        profile = null;
      }

      if (!cancelled) {
        setUser(mapUser(profile, keycloak.tokenParsed));
        setAccessToken(keycloak.token ?? null);
      }
    };

    const refreshToken = async () => {
      if (!keycloak.authenticated) {
        return;
      }

      try {
        await keycloak.updateToken(30);
        if (!cancelled) {
          setAccessToken(keycloak.token ?? null);
        }
      } catch {
        keycloak.clearToken();
        if (!cancelled) {
          setUser(null);
          setAccessToken(null);
        }
      }
    };

    const init = async () => {
      try {
        if (!keycloak.didInitialize) {
          await keycloak.init({
            onLoad: "check-sso",
            pkceMethod: "S256",
            checkLoginIframe: false,
            silentCheckSsoFallback: false,
            redirectUri: window.location.href,
          });
        }

        await syncAuthenticatedUser();

        keycloak.onAuthSuccess = () => {
          void syncAuthenticatedUser();
        };
        keycloak.onAuthRefreshSuccess = () => {
          if (!cancelled) {
            setAccessToken(keycloak.token ?? null);
          }
        };
        keycloak.onAuthLogout = () => {
          if (!cancelled) {
            setUser(null);
            setAccessToken(null);
          }
        };
        keycloak.onTokenExpired = () => {
          void refreshToken();
        };

        refreshInterval = window.setInterval(() => {
          void refreshToken();
        }, 60_000);
      } catch {
        if (!cancelled) {
          setUser(null);
          setAccessToken(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void init();

    return () => {
      cancelled = true;
      keycloak.onAuthSuccess = undefined;
      keycloak.onAuthRefreshSuccess = undefined;
      keycloak.onAuthLogout = undefined;
      keycloak.onTokenExpired = undefined;
      if (refreshInterval !== undefined) {
        window.clearInterval(refreshInterval);
      }
    };
  }, []);

  const login = async () => {
    const keycloak = getKeycloakClient();
    if (!keycloak) {
      return;
    }

    await keycloak.login({
      redirectUri: window.location.href,
    });
  };

  const logout = async () => {
    const keycloak = getKeycloakClient();
    if (!keycloak) {
      setUser(null);
      setAccessToken(null);
      return;
    }

    await keycloak.logout({
      redirectUri: window.location.origin,
    });
  };

  return (
    <AuthContext
      value={{ user, isLoggedIn: !!user, isLoading, accessToken, login, logout }}
    >
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
