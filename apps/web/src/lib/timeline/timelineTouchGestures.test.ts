import { describe, expect, it } from "vitest";
import {
  TOUCH_DOUBLE_TAP_MS,
  clampZoomH,
  isDoubleTap,
  pinchAnchorViewportX,
  pinchZoomFromRatio,
  touchDistance,
} from "./timelineTouchGestures.js";

describe("timelineTouchGestures", () => {
  it("touchDistance is hypot of deltas", () => {
    expect(touchDistance({ clientX: 0, clientY: 0 }, { clientX: 3, clientY: 4 })).toBe(
      5,
    );
  });

  it("pinchAnchorViewportX centers between fingers", () => {
    expect(
      pinchAnchorViewportX(
        { clientX: 10, clientY: 0 },
        { clientX: 30, clientY: 0 },
        5,
      ),
    ).toBe(15);
  });

  it("clampZoomH rounds and clamps", () => {
    expect(clampZoomH(12.6, 10, 40)).toBe(13);
    expect(clampZoomH(5, 10, 40)).toBe(10);
    expect(clampZoomH(99, 10, 40)).toBe(40);
  });

  it("pinchZoomFromRatio scales and rejects bad ratios", () => {
    expect(pinchZoomFromRatio(20, 2, 10, 80)).toBe(40);
    expect(pinchZoomFromRatio(20, 0, 10, 80)).toBe(20);
    expect(pinchZoomFromRatio(20, Number.NaN, 10, 80)).toBe(20);
    expect(pinchZoomFromRatio(0, 2, 10, 80)).toBe(10);
  });

  it("isDoubleTap requires recent nearby tap", () => {
    expect(isDoubleTap(null, 1000, 0, 0)).toBe(false);
    expect(
      isDoubleTap({ time: 1000, x: 0, y: 0 }, 1000 + TOUCH_DOUBLE_TAP_MS + 1, 0, 0),
    ).toBe(false);
    expect(isDoubleTap({ time: 1000, x: 0, y: 0 }, 1100, 50, 0)).toBe(false);
    expect(isDoubleTap({ time: 1000, x: 0, y: 0 }, 1100, 5, 5)).toBe(true);
  });
});
