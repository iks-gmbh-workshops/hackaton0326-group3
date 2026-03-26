// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { keycloakCtor } = vi.hoisted(() => ({
  keycloakCtor: vi.fn((config) => ({ config })),
}));

vi.mock("keycloak-js", () => ({
  default: keycloakCtor,
}));

describe("getKeycloakClient", () => {
  beforeEach(() => {
    vi.resetModules();
    keycloakCtor.mockClear();
    delete process.env.NEXT_PUBLIC_KEYCLOAK_URL;
    delete process.env.NEXT_PUBLIC_KEYCLOAK_REALM;
    delete process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;
    Object.defineProperty(globalThis, "window", {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  it("returns null on the server", async () => {
    const { getKeycloakClient } = await import("./keycloak");

    expect(getKeycloakClient()).toBeNull();
    expect(keycloakCtor).not.toHaveBeenCalled();
  });

  it("creates and reuses one client on the browser", async () => {
    process.env.NEXT_PUBLIC_KEYCLOAK_URL = "http://kc.local/";
    process.env.NEXT_PUBLIC_KEYCLOAK_REALM = "realm-a";
    process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID = "client-a";

    Object.defineProperty(globalThis, "window", {
      value: {} as Window & typeof globalThis,
      configurable: true,
      writable: true,
    });

    const { getKeycloakClient } = await import("./keycloak");

    const first = getKeycloakClient();
    const second = getKeycloakClient();

    expect(first).toBe(second);
    expect(keycloakCtor).toHaveBeenCalledTimes(1);
    expect(keycloakCtor).toHaveBeenCalledWith({
      url: "http://kc.local",
      realm: "realm-a",
      clientId: "client-a",
    });
  });

  it("uses defaults when env vars are missing", async () => {
    Object.defineProperty(globalThis, "window", {
      value: {} as Window & typeof globalThis,
      configurable: true,
      writable: true,
    });

    const { getKeycloakClient } = await import("./keycloak");
    getKeycloakClient();

    expect(keycloakCtor).toHaveBeenCalledWith({
      url: "http://localhost:8080",
      realm: "drumdibum",
      clientId: "drumdibum-frontend",
    });
  });
});
