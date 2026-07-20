import { describe, expect, it } from "vitest";
import {
  clearLaneHeightOverride,
  clampLaneHeight,
  laneHeightBase,
  laneHeightEffective,
  loadLaneHeights,
  MAX_LANE_PX,
  MIN_LANE_PX,
  saveLaneHeights,
  scaleLaneHeights,
  setLaneHeightOverride,
  LANE_HEIGHTS_KEY,
} from "./timelineLaneHeights.js";

describe("timelineLaneHeights", () => {
  it("clamps to v4 min/max", () => {
    expect(clampLaneHeight(10)).toBe(MIN_LANE_PX);
    expect(clampLaneHeight(200)).toBe(MAX_LANE_PX);
    expect(clampLaneHeight(72.4)).toBe(72);
  });

  it("laneHeightBase prefers override else zoomV", () => {
    expect(laneHeightBase("forma", {}, 72)).toBe(72);
    expect(laneHeightBase("forma", { forma: 96 }, 72)).toBe(96);
  });

  it("laneHeightEffective applies UI scale", () => {
    expect(laneHeightEffective(72, 1)).toBe(72);
    expect(laneHeightEffective(72, 1.25)).toBe(90);
  });

  it("scaleLaneHeights keeps proportions on Zoom V change", () => {
    const next = scaleLaneHeights({ forma: 96, tekst: 48 }, 72, 96);
    expect(next.forma).toBe(128);
    expect(next.tekst).toBe(64);
  });

  it("set/clear override", () => {
    const a = setLaneHeightOverride({}, "cue", 100);
    expect(a.cue).toBe(100);
    expect(clearLaneHeightOverride(a, "cue")).toEqual({});
  });

  it("load/save round-trip via storage mock", () => {
    const store: Record<string, string> = {};
    const storage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    };
    saveLaneHeights({ forma: 88 }, storage);
    expect(store[LANE_HEIGHTS_KEY]).toContain("forma");
    expect(loadLaneHeights(storage)).toEqual({ forma: 88 });
  });

  it("loadLaneHeights ignores garbage", () => {
    const storage = {
      getItem: () => "not-json",
    };
    expect(loadLaneHeights(storage)).toEqual({});
  });
});
