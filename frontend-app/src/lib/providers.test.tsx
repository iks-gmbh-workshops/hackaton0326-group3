import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { Providers } from "./providers";

vi.mock("@/lib/auth-context", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
}));

vi.mock("@/lib/locale-context", () => ({
  LocaleProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="locale-provider">{children}</div>
  ),
}));

vi.mock("@/lib/intl-provider", () => ({
  IntlProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="intl-provider">{children}</div>
  ),
}));

describe("Providers", () => {
  it("nests locale, intl and auth providers around children", () => {
    render(
      <Providers>
        <span data-testid="child">hello</span>
      </Providers>
    );

    const child = screen.getByTestId("child");
    const auth = screen.getByTestId("auth-provider");
    const intl = screen.getByTestId("intl-provider");

    expect(child.closest("[data-testid='auth-provider']")).toBe(auth);
    expect(auth.closest("[data-testid='intl-provider']")).toBe(intl);
    expect(intl.closest("[data-testid='locale-provider']")).toBe(
      screen.getByTestId("locale-provider")
    );
  });
});
