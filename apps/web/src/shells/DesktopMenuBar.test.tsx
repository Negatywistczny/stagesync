/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DesktopMenuBar } from "./DesktopMenuBar.js";

vi.mock("@lib/client/desktopBridge.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@lib/client/desktopBridge.js")>();
  return {
    ...actual,
    openExternalUrl: vi.fn(),
  };
});

vi.mock("@lib/client/lastTimelineProject.js", () => ({
  getRecentTimelineProjects: () => [],
}));

function stubWideViewport(): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      media: "",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

describe("DesktopMenuBar menubar contract", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("arms on click then opens neighbor on hover (wide)", () => {
    stubWideViewport();
    render(<DesktopMenuBar />);
    const plik = screen.getByRole("menuitem", { name: "Plik" });
    const edycja = screen.getByRole("menuitem", { name: "Edycja" });

    fireEvent.click(plik);
    expect(plik.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("menu")).toBeTruthy();

    fireEvent.mouseEnter(edycja);
    expect(edycja.getAttribute("aria-expanded")).toBe("true");
    expect(plik.getAttribute("aria-expanded")).toBe("false");
  });

  it("does not open on hover when menubar is not armed", () => {
    stubWideViewport();
    render(<DesktopMenuBar />);
    const edycja = screen.getByRole("menuitem", { name: "Edycja" });
    fireEvent.mouseEnter(edycja);
    expect(edycja.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("ArrowLeft switches top-level after open (wrap)", () => {
    stubWideViewport();
    render(<DesktopMenuBar />);
    fireEvent.click(screen.getByRole("menuitem", { name: "Plik" }));
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByRole("menuitem", { name: "Pomoc" }).getAttribute("aria-expanded")).toBe(
      "true",
    );
  });
});
