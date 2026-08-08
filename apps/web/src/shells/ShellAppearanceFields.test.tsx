/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { APPEARANCE_PROFILE_SWATCHES } from "@stagesync/shared";
import { ShellAppearanceFields } from "./ShellAppearanceFields.js";

vi.mock("@lib/client/appearance.js", () => ({
  applyAppearance: vi.fn(),
  readAppearance: () => ({ profile: "booth" }),
  setAppearance: vi.fn((patch: { profile?: string }) => ({
    profile: patch.profile ?? "booth",
  })),
}));

afterEach(() => {
  cleanup();
});

function cssColor(el: Element): string {
  return (el as HTMLElement).style.backgroundColor.replace(/\s/g, "").toLowerCase();
}

describe("ShellAppearanceFields", () => {
  it("exposes a named profile radiogroup with color swatches", () => {
    render(<ShellAppearanceFields />);
    expect(
      screen.getByRole("radiogroup", { name: "Motyw kolorystyczny" }),
    ).toBeTruthy();
    expect(screen.getByText("Booth Amber")).toBeTruthy();
    expect(screen.getByText("Neon Ember")).toBeTruthy();

    const booth = screen.getByRole("radio", { name: "Booth Amber" });
    expect(booth.getAttribute("aria-checked")).toBe("true");
    const swatchSpans = booth.querySelectorAll("[aria-hidden='true'] span");
    expect(swatchSpans).toHaveLength(2);
    const elevatedDot = swatchSpans[0] as HTMLElement;
    const primaryDot = swatchSpans[1] as HTMLElement;
    const elevated = cssColor(elevatedDot);
    const primary = cssColor(primaryDot);
    expect(elevatedDot.getAttribute("data-swatch")).toBe("elevated");
    expect(primaryDot.getAttribute("data-swatch")).toBe("primary");
    const elevatedBorder = elevatedDot.style.borderColor
      .replace(/\s/g, "")
      .toLowerCase();
    expect(
      elevatedBorder ===
        APPEARANCE_PROFILE_SWATCHES.booth.elevatedBorder.toLowerCase() ||
        elevatedBorder === "rgb(30,30,34)",
    ).toBe(true);
    expect(
      elevated === APPEARANCE_PROFILE_SWATCHES.booth.elevated.toLowerCase() ||
        elevated === "rgb(24,24,27)",
    ).toBe(true);
    expect(
      primary === "#fbbf24" || primary === "rgb(251,191,36)",
    ).toBe(true);
    expect(APPEARANCE_PROFILE_SWATCHES.booth.primary).toBe("#fbbf24");
  });

  it("forwards controlled changes without persisting", () => {
    const onChange = vi.fn();
    render(
      <ShellAppearanceFields
        value={{ profile: "booth" }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Midnight Cyan" }));
    expect(onChange).toHaveBeenCalledWith({ profile: "midnight" });
  });
});
