/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VerticalFader } from "./VerticalFader.js";

afterEach(() => {
  cleanup();
});

describe("VerticalFader", () => {
  it("exposes slider semantics and valuetext", () => {
    render(
      <VerticalFader
        gainDb={-6.25}
        onGainChange={() => {}}
        onGainReset={() => {}}
        aria-label="Fader Stereo Out"
      />,
    );
    const slider = screen.getByRole("slider", { name: "Fader Stereo Out" });
    expect(slider.getAttribute("aria-valuetext")).toBe("-6.3 dB");
    expect(slider.getAttribute("aria-valuemin")).toBe("-60");
    expect(slider.getAttribute("aria-valuemax")).toBe("6");
  });

  it("steps gain with arrow keys and resets on Home", () => {
    const onGainChange = vi.fn();
    render(
      <VerticalFader
        gainDb={0}
        onGainChange={onGainChange}
        onGainReset={() => {}}
        aria-label="Fader"
      />,
    );
    const slider = screen.getByRole("slider", { name: "Fader" });
    fireEvent.keyDown(slider, { key: "ArrowUp" });
    expect(onGainChange).toHaveBeenCalled();
    onGainChange.mockClear();
    fireEvent.keyDown(slider, { key: "Home" });
    expect(onGainChange).toHaveBeenCalledWith(6);
  });
});
