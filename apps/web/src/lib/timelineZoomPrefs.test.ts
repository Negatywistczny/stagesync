import { describe, expect, it } from "vitest";
import {
  clampZoomH,
  clampZoomUi,
  clampZoomV,
  DEFAULT_ZOOM_UI,
  loadZoomPrefs,
  saveZoomPrefs,
  TIMELINE_ZOOM_KEY,
  ZOOM_H_MAX,
  ZOOM_H_MIN,
  ZOOM_UI_MAX,
  ZOOM_UI_MIN,
} from "./timelineZoomPrefs.js";
import { DEFAULT_PX_PER_BAR } from "./formaCanvas.js";
import { DEFAULT_LANE_PX, MAX_LANE_PX, MIN_LANE_PX } from "./timelineLaneHeights.js";

function memoryStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    getItem: (k: string) => (k in store ? store[k]! : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    _store: store,
  };
}

describe("timelineZoomPrefs", () => {
  it("clamps zoom ranges", () => {
    expect(clampZoomH(ZOOM_H_MIN - 10)).toBe(ZOOM_H_MIN);
    expect(clampZoomH(ZOOM_H_MAX + 10)).toBe(ZOOM_H_MAX);
    expect(clampZoomV(MIN_LANE_PX - 1)).toBe(MIN_LANE_PX);
    expect(clampZoomV(MAX_LANE_PX + 1)).toBe(MAX_LANE_PX);
    expect(clampZoomUi(ZOOM_UI_MIN - 1)).toBe(ZOOM_UI_MIN);
    expect(clampZoomUi(ZOOM_UI_MAX + 1)).toBe(ZOOM_UI_MAX);
  });

  it("loadZoomPrefs returns defaults for missing/garbage", () => {
    expect(loadZoomPrefs(memoryStorage())).toEqual({
      zoomH: DEFAULT_PX_PER_BAR,
      zoomV: DEFAULT_LANE_PX,
      zoomUi: DEFAULT_ZOOM_UI,
    });
    expect(loadZoomPrefs(memoryStorage({ [TIMELINE_ZOOM_KEY]: "{" }))).toEqual({
      zoomH: DEFAULT_PX_PER_BAR,
      zoomV: DEFAULT_LANE_PX,
      zoomUi: DEFAULT_ZOOM_UI,
    });
  });

  it("round-trips prefs", () => {
    const storage = memoryStorage();
    saveZoomPrefs({ zoomH: 64, zoomV: 96, zoomUi: 120 }, storage);
    expect(loadZoomPrefs(storage)).toEqual({
      zoomH: 64,
      zoomV: 96,
      zoomUi: 120,
    });
  });
});
