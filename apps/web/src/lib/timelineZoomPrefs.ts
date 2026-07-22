/**
 * Persist Timeline zoom H / V / UI across sessions (session prefs, not project.json).
 */

import { DEFAULT_PX_PER_BAR } from "./formaCanvas.js";
import { DEFAULT_LANE_PX, MAX_LANE_PX, MIN_LANE_PX } from "./timelineLaneHeights.js";

export const TIMELINE_ZOOM_KEY = "stagesync-timeline-zoom";

export const ZOOM_H_MIN = 24;
export const ZOOM_H_MAX = 160;
export const ZOOM_UI_MIN = 50;
export const ZOOM_UI_MAX = 150;
export const DEFAULT_ZOOM_UI = 100;

export type TimelineZoomPrefs = {
  zoomH: number;
  zoomV: number;
  zoomUi: number;
};

export function clampZoomH(px: number): number {
  return Math.max(ZOOM_H_MIN, Math.min(ZOOM_H_MAX, Math.round(Number(px) || DEFAULT_PX_PER_BAR)));
}

export function clampZoomV(px: number): number {
  return Math.max(MIN_LANE_PX, Math.min(MAX_LANE_PX, Math.round(Number(px) || DEFAULT_LANE_PX)));
}

export function clampZoomUi(pct: number): number {
  return Math.max(
    ZOOM_UI_MIN,
    Math.min(ZOOM_UI_MAX, Math.round(Number(pct) || DEFAULT_ZOOM_UI)),
  );
}

export function defaultZoomPrefs(): TimelineZoomPrefs {
  return {
    zoomH: DEFAULT_PX_PER_BAR,
    zoomV: DEFAULT_LANE_PX,
    zoomUi: DEFAULT_ZOOM_UI,
  };
}

export function loadZoomPrefs(
  storage: Pick<Storage, "getItem"> | null = typeof localStorage !== "undefined"
    ? localStorage
    : null,
): TimelineZoomPrefs {
  const fallback = defaultZoomPrefs();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(TIMELINE_ZOOM_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<TimelineZoomPrefs>;
    return {
      zoomH: clampZoomH(Number(parsed.zoomH)),
      zoomV: clampZoomV(Number(parsed.zoomV)),
      zoomUi: clampZoomUi(Number(parsed.zoomUi)),
    };
  } catch {
    return fallback;
  }
}

export function saveZoomPrefs(
  prefs: TimelineZoomPrefs,
  storage: Pick<Storage, "setItem"> | null = typeof localStorage !== "undefined"
    ? localStorage
    : null,
): void {
  if (!storage) return;
  try {
    storage.setItem(
      TIMELINE_ZOOM_KEY,
      JSON.stringify({
        zoomH: clampZoomH(prefs.zoomH),
        zoomV: clampZoomV(prefs.zoomV),
        zoomUi: clampZoomUi(prefs.zoomUi),
      }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}
