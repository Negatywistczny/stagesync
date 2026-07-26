/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PanKnob } from "./PanKnob.js";

afterEach(() => {
  cleanup();
});

describe("PanKnob", () => {
  it("exposes slider semantics for Pan", () => {
    render(
      <PanKnob
        pan={-0.25}
        onPanChange={() => {}}
        onPanReset={() => {}}
        label="PAN"
        aria-label="Pan ścieżki"
      />,
    );
    const slider = screen.getByRole("slider", { name: "Pan ścieżki" });
    expect(slider.getAttribute("aria-valuemin")).toBe("-100");
    expect(slider.getAttribute("aria-valuemax")).toBe("100");
    expect(slider.getAttribute("aria-valuenow")).toBe("-25");
  });

  it("steps with arrows and resets on Home", () => {
    const onPanChange = vi.fn();
    const onPanReset = vi.fn();
    render(
      <PanKnob
        pan={0}
        onPanChange={onPanChange}
        onPanReset={onPanReset}
        label="PAN"
        aria-label="Pan"
      />,
    );
    const slider = screen.getByRole("slider", { name: "Pan" });
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(onPanChange).toHaveBeenCalled();
    fireEvent.keyDown(slider, { key: "Home" });
    expect(onPanReset).toHaveBeenCalled();
  });
});
