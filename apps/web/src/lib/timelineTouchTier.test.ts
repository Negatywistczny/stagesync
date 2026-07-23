import { describe, expect, it, vi } from "vitest";
import {
  detectTimelineTier,
  isMobileTier,
  isTouchTier,
  timelineGesturesAllowed,
} from "./timelineTouchTier.js";

describe("timelineTouchTier", () => {
  it("detects mobile before coarse", () => {
    expect(
      detectTimelineTier((q) => q.includes("max-width")),
    ).toBe("mobile");
  });

  it("detects tablet on coarse when not mobile", () => {
    expect(
      detectTimelineTier((q) => q.includes("pointer: coarse")),
    ).toBe("tablet");
  });

  it("detects tablet on width ≤1024 when not mobile", () => {
    expect(
      detectTimelineTier((q) => q.includes("max-width: 1024")),
    ).toBe("tablet");
  });

  it("defaults to desktop", () => {
    expect(detectTimelineTier(() => false)).toBe("desktop");
  });

  it("gesture policy: mobile RO, tablet no drag, desktop full", () => {
    expect(timelineGesturesAllowed("mobile").clipDragResize).toBe(false);
    expect(timelineGesturesAllowed("mobile").pencilDraw).toBe(false);
    expect(timelineGesturesAllowed("tablet").clipDragResize).toBe(false);
    expect(timelineGesturesAllowed("tablet").pencilDraw).toBe(true);
    expect(timelineGesturesAllowed("desktop").clipDragResize).toBe(true);
    expect(isTouchTier("tablet")).toBe(true);
    expect(isMobileTier("mobile")).toBe(true);
  });

  it("default matches uses window.matchMedia when available", () => {
    vi.stubGlobal("window", {
      matchMedia: (q: string) => ({ matches: q.includes("max-width: 768") }),
    });
    expect(detectTimelineTier()).toBe("mobile");
    vi.unstubAllGlobals();
  });

  it("default matches returns false when window undefined", () => {
    const prev = globalThis.window;
    // @ts-expect-error test isolation
    delete globalThis.window;
    expect(detectTimelineTier()).toBe("desktop");
    globalThis.window = prev;
  });

});
