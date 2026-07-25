/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TrackAppearancePicker } from "./TrackAppearancePicker.js";

afterEach(() => {
  cleanup();
});

describe("TrackAppearancePicker", () => {
  it("exposes dialog with color and icon pressed controls", () => {
    const anchorRef = createRef<HTMLButtonElement>();
    const onClose = vi.fn();
    const onColorChange = vi.fn();
    const onIconChange = vi.fn();

    render(
      <>
        <button ref={anchorRef} type="button">
          badge
        </button>
        <TrackAppearancePicker
          anchorRef={anchorRef}
          color="#E74C3C"
          icon="mic"
          onColorChange={onColorChange}
          onIconChange={onIconChange}
          onClose={onClose}
        />
      </>,
    );

    expect(
      screen.getByRole("dialog", { name: "Kolor i ikona ścieżki" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Kolor #E74C3C" }).getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "Mikrofon" }).getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
  });

  it("closes on Escape", () => {
    const anchorRef = createRef<HTMLButtonElement>();
    const onClose = vi.fn();
    render(
      <>
        <button ref={anchorRef} type="button">
          badge
        </button>
        <TrackAppearancePicker
          anchorRef={anchorRef}
          color="#E74C3C"
          icon="mic"
          onColorChange={() => {}}
          onIconChange={() => {}}
          onClose={onClose}
        />
      </>,
    );
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalled();
  });
});
