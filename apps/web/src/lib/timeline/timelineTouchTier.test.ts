import { describe, expect, it, vi } from "vitest";
import { MQ_MOBILE_COMPACT } from "./breakpoints.js";
import {
  detectTimelineTier,
  isMobileTier,
  isTouchTier,
  TIMELINE_MOBILE_MQ,
  timelineGesturesAllowed,
} from "./timelineTouchTier.js";

/** Simulate `matchMedia` for a viewport dimension in px. */
function matchesAtViewport(widthPx: number, heightPx = 1000) {
  return (query: string) => {
    if (query.includes("pointer: coarse")) return false;
    const widthMatch = query.match(/max-width:\s*(\d+)px/);
    const heightMatch = query.match(/max-height:\s*(\d+)px/);

    let ok = true;
    if (widthMatch) ok = ok && widthPx <= Number(widthMatch[1]);
    if (heightMatch) ok = ok && heightPx <= Number(heightMatch[1]);
    if (!widthMatch && !heightMatch) ok = false;
    return ok;
  };
}

/** Legacy helper for existing tests. */
const matchesAtWidth = (w: number) => matchesAtViewport(w);

describe("timelineTouchTier", () => {
  it("uses phone compact breakpoint for player-only tier", () => {
    expect(TIMELINE_MOBILE_MQ).toBe(MQ_MOBILE_COMPACT);
  });

  it("keeps mouse desktop edit at tablet widths when pointer is fine", () => {
    expect(
      detectTimelineTier(matchesAtViewport(640), { allowMobilePlayer: true }),
    ).toBe("mobile");
    expect(
      detectTimelineTier(matchesAtViewport(641, 1000), { allowMobilePlayer: true }),
    ).toBe("desktop");
    expect(
      detectTimelineTier(matchesAtWidth(768), { allowMobilePlayer: true }),
    ).toBe("desktop");
    expect(
      detectTimelineTier(matchesAtWidth(1024), { allowMobilePlayer: true }),
    ).toBe("desktop");
    expect(
      detectTimelineTier(matchesAtWidth(1025), { allowMobilePlayer: true }),
    ).toBe("desktop");
  });

  it("detects mobile before coarse", () => {
    expect(
      detectTimelineTier(
        (q) =>
          q.includes("max-width: 640") || q.includes("pointer: coarse"),
        {
          allowMobilePlayer: true,
        },
      ),
    ).toBe("mobile");
  });

  it("can skip mobile player when allowMobilePlayer is false", () => {
    // Fine pointer + phone width → desktop mouse edit (not forced tablet nudge).
    expect(
      detectTimelineTier(matchesAtWidth(640), { allowMobilePlayer: false }),
    ).toBe("desktop");
    expect(
      detectTimelineTier(matchesAtWidth(500), { allowMobilePlayer: false }),
    ).toBe("desktop");
    expect(
      detectTimelineTier(
        (q) =>
          q.includes("max-width: 640") || q.includes("pointer: coarse"),
        { allowMobilePlayer: false },
      ),
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

  it("does not treat width ≤1024 alone as tablet", () => {
    expect(
      detectTimelineTier((q) => q.includes("max-width: 1024")),
    ).toBe("desktop");
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

  it("641–768px fine-pointer viewport stays desktop edit, not tablet nudge", () => {
    expect(
      detectTimelineTier(matchesAtViewport(700, 1000), { allowMobilePlayer: true }),
    ).toBe("desktop");
  });

  it("detects mobile in landscape low-height viewports (up to 960x500)", () => {
    expect(
      detectTimelineTier(matchesAtViewport(960, 500), { allowMobilePlayer: true }),
    ).toBe("mobile");
    expect(
      detectTimelineTier(matchesAtViewport(961, 500), { allowMobilePlayer: true }),
    ).toBe("desktop");
    expect(
      detectTimelineTier(matchesAtViewport(960, 501), { allowMobilePlayer: true }),
    ).toBe("desktop");
  });

  it("default matches returns false when window undefined", () => {
    const prev = globalThis.window;
    // @ts-expect-error test isolation
    delete globalThis.window;
    expect(detectTimelineTier()).toBe("desktop");
    globalThis.window = prev;
  });

});
