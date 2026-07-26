/**
 * @vitest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useKeepTileAboveIme } from "./useKeepTileAboveIme.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useKeepTileAboveIme", () => {
  it("sets --ss-ime-inset from visualViewport shrink", () => {
    const root = document.createElement("div");
    const tile = document.createElement("div");
    root.appendChild(tile);
    document.body.appendChild(root);

    tile.scrollIntoView = vi.fn();
    tile.getBoundingClientRect = () =>
      ({
        top: 0,
        bottom: 500,
        left: 0,
        right: 100,
        width: 100,
        height: 500,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    const listeners = new Map<string, EventListener>();
    const vv = {
      height: 400,
      offsetTop: 0,
      addEventListener: (type: string, fn: EventListener) => {
        listeners.set(type, fn);
      },
      removeEventListener: (type: string) => {
        listeners.delete(type);
      },
    };
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: vv,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
    });

    const raf = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb) => {
        cb(0);
        return 1;
      });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    const { unmount } = renderHook(() =>
      useKeepTileAboveIme({ current: root }, { current: tile }, true),
    );

    expect(root.style.getPropertyValue("--ss-ime-inset")).toBe("400px");
    expect(listeners.has("resize")).toBe(true);

    unmount();
    expect(root.style.getPropertyValue("--ss-ime-inset")).toBe("");
    raf.mockRestore();
    root.remove();
  });
});
