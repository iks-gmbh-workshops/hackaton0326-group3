import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider, useLocale } from "./locale-context";

function LocaleProbe() {
  const { locale, setLocale } = useLocale();

  return (
    <>
      <span data-testid="locale">{locale}</span>
      <button onClick={() => setLocale("de")} type="button">
        switch-to-de
      </button>
    </>
  );
}

describe("LocaleProvider", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.lang = "";
    vi.restoreAllMocks();
  });

  it("uses stored locale first", () => {
    localStorage.setItem("drumdibum-locale", "de");
    vi.spyOn(window.navigator, "language", "get").mockReturnValue("en-US");

    render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>
    );

    expect(screen.getByTestId("locale")).toHaveTextContent("de");
  });

  it("uses browser locale when no valid stored locale exists", () => {
    localStorage.setItem("drumdibum-locale", "fr");
    vi.spyOn(window.navigator, "language", "get").mockReturnValue("de-DE");

    render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>
    );

    expect(screen.getByTestId("locale")).toHaveTextContent("de");
  });

  it("falls back to english when locale is unsupported", () => {
    vi.spyOn(window.navigator, "language", "get").mockReturnValue("es-ES");

    render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>
    );

    expect(screen.getByTestId("locale")).toHaveTextContent("en");
  });

  it("persists locale changes and updates the document language", () => {
    vi.spyOn(window.navigator, "language", "get").mockReturnValue("en-US");

    render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "switch-to-de" }));

    expect(screen.getByTestId("locale")).toHaveTextContent("de");
    expect(localStorage.getItem("drumdibum-locale")).toBe("de");
    expect(document.documentElement.lang).toBe("de");
  });
});

describe("useLocale", () => {
  afterEach(() => {
    cleanup();
  });

  it("returns default context values outside provider", () => {
    function ProbeWithoutProvider() {
      const { locale, setLocale } = useLocale();

      return (
        <>
          <span data-testid="locale">{locale}</span>
          <button onClick={() => setLocale("de")} type="button">
            try-switch
          </button>
        </>
      );
    }

    render(<ProbeWithoutProvider />);

    expect(screen.getByTestId("locale")).toHaveTextContent("en");
    fireEvent.click(screen.getByRole("button", { name: "try-switch" }));
    expect(localStorage.getItem("drumdibum-locale")).toBeNull();
  });
});
