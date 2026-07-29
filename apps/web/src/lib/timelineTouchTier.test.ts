import { describe, expect, it, vi } from "vitest";
import { MQ_MOBILE_COMPACT } from "./breakpoints.js";
import {
  detectTimelineTier,
  isMobileTier,
  isTouchTier,
  TIMELINE_MOBILE_MQ,
  timelineGesturesAllowed,
} from "./timelineTouchTier.js";

/** Simulate `matchMedia` for a viewport width in px. */
function matchesAtWidth(widthPx: number) {
  return (query: string) => {
    if (query.includes("pointer: coarse")) return false;
    const match = query.match(/max-width:\s*(\d+)/);
    if (!match) return false;
    return widthPx <= Number(match[1]);
  };
}

describe("timelineTouchTier", () => {
  it("uses phone compact breakpoint for player-only tier", () => {
    expect(TIMELINE_MOBILE_MQ).toBe(MQ_MOBILE_COMPACT);
  });

  it("detects mobile only at ≤640px, not tablet widths", () => {
    expect(
      detectTimelineTier(matchesAtWidth(640), { allowMobilePlayer: true }),
    ).toBe("mobile");
    expect(
      detectTimelineTier(matchesAtWidth(641), { allowMobilePlayer: true }),
    ).toBe("tablet");
    expect(
      detectTimelineTier(matchesAtWidth(768), { allowMobilePlayer: true }),
    ).toBe("tablet");
    expect(
      detectTimelineTier(matchesAtWidth(1024), { allowMobilePlayer: true }),
    ).toBe("tablet");
    expect(
      detectTimelineTier(matchesAtWidth(1025), { allowMobilePlayer: true }),
    ).toBe("desktop");
  });

  it("detects mobile before coarse", () => {
    expect(
      detectTimelineTier((q) => q.includes("max-width: 640"), {
        allowMobilePlayer: true,
      }),
    ).toBe("mobile");
  });

  it("can skip mobile player when allowMobilePlayer is false", () => {
    expect(
      detectTimelineTier(matchesAtWidth(640), { allowMobilePlayer: false }),
    ).toBe("tablet");
    expect(
      detectTimelineTier(matchesAtWidth(500), { allowMobilePlayer: false }),
    ).toBe("tablet");
  });

  it("enters mobile player at ≤640px when compact chrome is allowed (default)", () => {
    expect(detectTimelineTier(matchesAtWidth(640))).toBe("mobile");
    expect(detectTimelineTier(matchesAtWidth(500))).toBe("mobile");
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
    expect(isTouchTier("desktop")).toBe(false);
    expect(isMobileTier("mobile")).toBe(true);
    expect(isMobileTier("tablet")).toBe(false);
  });

  it("default matches uses window.matchMedia when available", () => {
    vi.stubGlobal("window", {
      matchMedia: (q: string) => ({ matches: q.includes("max-width: 640") }),
    });
    expect(detectTimelineTier()).toBe("mobile");
    vi.unstubAllGlobals();
  });

  it("641–768px viewport is tablet edit mode, not mobile preview", () => {
    expect(
      detectTimelineTier(matchesAtWidth(700), { allowMobilePlayer: true }),
    ).toBe("tablet");
  });

  it("default matches returns false when window undefined", () => {
    const prev = globalThis.window;
    // @ts-expect-error test isolation
    delete globalThis.window;
    expect(detectTimelineTier()).toBe("desktop");
    globalThis.window = prev;
  });

});
