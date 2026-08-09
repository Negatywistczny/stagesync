/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TimelineHelp } from "./TimelineHelp.js";

afterEach(() => {
  cleanup();
});

describe("TimelineHelp", () => {
  it("names filter, tablist, and close control", () => {
    render(<TimelineHelp onClose={() => {}} />);
    expect(
      screen.getByRole("searchbox", { name: "Filtruj pomoc" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("tablist", { name: "Sekcje pomocy Timeline" }),
    ).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Skróty klawiszowe" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Zamknij" })).toBeTruthy();
  });

  it("announces empty filter results", () => {
    render(<TimelineHelp onClose={() => {}} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Filtruj pomoc" }), {
      target: { value: "zzzz-no-match" },
    });
    expect(screen.getByRole("status").textContent).toMatch(/Brak wyników/);
  });

  it("switches to tools tabpanel", () => {
    render(<TimelineHelp onClose={() => {}} />);
    fireEvent.click(screen.getByRole("tab", { name: "Narzędzia i ścieżki" }));
    expect(
      screen
        .getByRole("tab", { name: "Narzędzia i ścieżki" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByRole("tabpanel")).toBeTruthy();
  });

  it("invokes onClose from Zamknij", () => {
    const onClose = vi.fn();
    render(<TimelineHelp onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Zamknij" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("documents Tap as vocal line marking, not tempo", () => {
    render(<TimelineHelp onClose={() => {}} />);
    fireEvent.click(screen.getByRole("tab", { name: "Narzędzia i ścieżki" }));
    const panel = screen.getByRole("tabpanel");
    expect(panel.textContent).toMatch(/Tap/);
    expect(panel.textContent).toMatch(/kolejka linii/i);
    expect(panel.textContent).toMatch(/Spacja/i);
    expect(panel.textContent).not.toMatch(/tempo BPM/i);
    expect(panel.textContent).not.toMatch(/BPM przy locatorze/i);
  });
});
