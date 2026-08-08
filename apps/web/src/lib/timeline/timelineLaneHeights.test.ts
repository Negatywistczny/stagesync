import { describe, expect, it, vi } from "vitest";
import {
  clearLaneHeightOverride,
  clampLaneHeight,
  DEFAULT_LANE_PX,
  DEFAULT_META_LANE_PX,
  DOCK_COMPACT_MAX_PX,
  defaultLaneHeightForTrack,
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

  it("meta default is compact below audio and within dock single-row", () => {
    expect(DEFAULT_META_LANE_PX).toBeLessThan(DEFAULT_LANE_PX);
    expect(DEFAULT_META_LANE_PX).toBeLessThanOrEqual(DOCK_COMPACT_MAX_PX);
    expect(DEFAULT_META_LANE_PX).toBeGreaterThanOrEqual(MIN_LANE_PX);
  });

  it("defaultLaneHeightForTrack: meta compact, audio follows zoomV", () => {
    expect(defaultLaneHeightForTrack("forma", DEFAULT_LANE_PX)).toBe(
      DEFAULT_META_LANE_PX,
    );
    expect(defaultLaneHeightForTrack("tempo", DEFAULT_LANE_PX)).toBe(
      DEFAULT_META_LANE_PX,
    );
    expect(defaultLaneHeightForTrack("audio:t1", DEFAULT_LANE_PX)).toBe(
      DEFAULT_LANE_PX,
    );
    expect(defaultLaneHeightForTrack("tekst", 96)).toBe(64);
    expect(defaultLaneHeightForTrack("audio:t1", 96)).toBe(96);
  });

  it("laneHeightBase prefers override else type default", () => {
    expect(laneHeightBase("forma", {}, 72)).toBe(DEFAULT_META_LANE_PX);
    expect(laneHeightBase("forma", { forma: 96 }, 72)).toBe(96);
    expect(laneHeightBase("audio:t1", {}, 72)).toBe(72);
  });

  it("laneHeightEffective applies UI scale", () => {
    expect(laneHeightEffective(72, 1)).toBe(72);
    expect(laneHeightEffective(72, 1.25)).toBe(90);
  });

  it("dock compact threshold sits between min and default lane", () => {
    expect(DOCK_COMPACT_MAX_PX).toBeGreaterThan(MIN_LANE_PX);
    expect(DOCK_COMPACT_MAX_PX).toBeLessThan(72);
    expect(laneHeightEffective(MIN_LANE_PX, 1)).toBeLessThanOrEqual(
      DOCK_COMPACT_MAX_PX,
    );
    expect(laneHeightEffective(DEFAULT_META_LANE_PX, 1)).toBeLessThanOrEqual(
      DOCK_COMPACT_MAX_PX,
    );
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

  it("load/save tolerate null storage and filter bad keys", () => {
    expect(loadLaneHeights(null)).toEqual({});
    expect(() => saveLaneHeights({ a: 1 }, null)).not.toThrow();
    const longKey = "k".repeat(200);
    const storage = {
      getItem: () =>
        JSON.stringify({
          ok: 72,
          "": 50,
          [longKey]: 60,
          bad: "x",
          ...Object.fromEntries(
            Array.from({ length: 70 }, (_, i) => [`id${i}`, 50]),
          ),
        }),
      setItem: () => {
        throw new Error("quota");
      },
    };
    const loaded = loadLaneHeights(storage);
    expect(loaded.ok).toBe(72);
    expect(Object.keys(loaded).length).toBeLessThanOrEqual(64);
    expect(() => saveLaneHeights(loaded, storage)).not.toThrow();
    expect(setLaneHeightOverride({}, "", 90)).toEqual({});
  });


  it("default storage arg uses localStorage when defined", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
    });
    saveLaneHeights({ forma: 80 });
    expect(loadLaneHeights().forma).toBe(80);
    vi.unstubAllGlobals();
  });

  it("default storage arg is null when localStorage is undefined", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(loadLaneHeights()).toEqual({});
    expect(() => saveLaneHeights({ forma: 72 })).not.toThrow();
    vi.unstubAllGlobals();
  });

});
