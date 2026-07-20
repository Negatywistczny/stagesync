import { describe, expect, it } from "vitest";
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
});
