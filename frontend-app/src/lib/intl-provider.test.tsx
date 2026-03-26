import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IntlProvider } from "./intl-provider";

const { useLocaleMock } = vi.hoisted(() => ({
  useLocaleMock: vi.fn(),
}));

vi.mock("@/lib/locale-context", () => ({
  useLocale: useLocaleMock,
}));

describe("IntlProvider", () => {
  afterEach(() => {
    cleanup();
    useLocaleMock.mockReset();
  });

  it("uses german messages when locale is de", () => {
    useLocaleMock.mockReturnValue({ locale: "de", setLocale: vi.fn() });

    render(
      <IntlProvider>
        <span>child</span>
      </IntlProvider>
    );

    const provider = screen.getByTestId("next-intl-provider");
    expect(provider).toHaveAttribute("data-locale", "de");
    expect(provider).toHaveAttribute("data-dashboard", "Übersicht");
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("falls back to english messages for unknown locale values", () => {
    useLocaleMock.mockReturnValue({ locale: "fr", setLocale: vi.fn() });

    render(
      <IntlProvider>
        <span>child</span>
      </IntlProvider>
    );

    const provider = screen.getByTestId("next-intl-provider");
    expect(provider).toHaveAttribute("data-locale", "fr");
    expect(provider).toHaveAttribute("data-dashboard", "Dashboard");
  });
});
