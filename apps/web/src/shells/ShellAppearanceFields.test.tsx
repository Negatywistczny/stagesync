/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShellAppearanceFields } from "./ShellAppearanceFields.js";

vi.mock("../lib/appearance.js", () => ({
  applyAppearance: vi.fn(),
  readAppearance: () => ({ light: false, highContrast: false }),
  setAppearance: vi.fn((patch: { light?: boolean; highContrast?: boolean }) => ({
    light: patch.light ?? false,
    highContrast: patch.highContrast ?? false,
  })),
}));

afterEach(() => {
  cleanup();
});

describe("ShellAppearanceFields", () => {
  it("exposes Jasny motyw and Wysoki kontrast switches", () => {
    render(<ShellAppearanceFields />);
    expect(screen.getByRole("switch", { name: "Jasny motyw" })).toBeTruthy();
    expect(
      screen.getByRole("switch", { name: "Wysoki kontrast" }),
    ).toBeTruthy();
  });

  it("forwards controlled changes without persisting", () => {
    const onChange = vi.fn();
    render(
      <ShellAppearanceFields
        value={{ light: false, highContrast: false }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("switch", { name: "Jasny motyw" }));
    expect(onChange).toHaveBeenCalledWith({
      light: true,
      highContrast: false,
    });
  });
});
