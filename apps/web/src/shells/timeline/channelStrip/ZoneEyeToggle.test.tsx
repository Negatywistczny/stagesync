// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ZoneEyeToggle } from "./ZoneEyeToggle.js";

describe("ZoneEyeToggle", () => {
  it("toggles zone visibility and renders appropriate title", () => {
    const onToggle = vi.fn();

    const { rerender } = render(
      <ZoneEyeToggle
        zoneLabel="Szyny"
        visible={true}
        onToggle={onToggle}
      />,
    );

    const btn = screen.getByRole("button", { name: "Ukryj strefę Szyny" });
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalled();

    rerender(
      <ZoneEyeToggle
        zoneLabel="Szyny"
        visible={false}
        onToggle={onToggle}
      />,
    );

    expect(screen.getByRole("button", { name: "Pokaż strefę Szyny" })).toBeTruthy();
  });
});
