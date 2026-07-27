/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShellAppearanceFields } from "./ShellAppearanceFields.js";

vi.mock("../lib/appearance.js", () => ({
  applyAppearance: vi.fn(),
  readAppearance: () => ({ profile: "booth" }),
  setAppearance: vi.fn((patch: { profile?: string }) => ({
    profile: patch.profile ?? "booth",
  })),
}));

afterEach(() => {
  cleanup();
});

describe("ShellAppearanceFields", () => {
  it("exposes a named profile select", () => {
    render(<ShellAppearanceFields />);
    const select = screen.getByRole("combobox", {
      name: "Motyw kolorystyczny",
    });
    expect(select).toBeTruthy();
    expect(screen.getByText("Booth Amber")).toBeTruthy();
    expect(screen.getByText("Neon Ember")).toBeTruthy();
  });

  it("forwards controlled changes without persisting", () => {
    const onChange = vi.fn();
    render(
      <ShellAppearanceFields
        value={{ profile: "booth" }}
        onChange={onChange}
      />,
    );
    fireEvent.change(
      screen.getByRole("combobox", { name: "Motyw kolorystyczny" }),
      { target: { value: "midnight" } },
    );
    expect(onChange).toHaveBeenCalledWith({ profile: "midnight" });
  });
});
