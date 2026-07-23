/**
 * Per-track lane height overrides — v4 `laneHeights` behavior (not chrome clone).
 * Base px before UI scale; missing → Zoom V for audio, compact default for meta lanes.
 */

import { isAudioLaneId } from "./timelineTracks.js";

export const LANE_HEIGHTS_KEY = "stagesync-timeline-lane-heights";

export const MIN_LANE_PX = 40;
export const MAX_LANE_PX = 160;
export const DEFAULT_LANE_PX = 72;
/**
 * Default base height for non-audio lanes (Tempo…Cue) at Zoom V = {@link DEFAULT_LANE_PX}.
 * Below audio default and at/under {@link DOCK_COMPACT_MAX_PX} so dock stays single-row.
 */
export const DEFAULT_META_LANE_PX = 48;
/** Effective lane height at/under this → dock single-row (hide fader). */
export const DOCK_COMPACT_MAX_PX = 56;

export type LaneHeightsMap = Record<string, number>;

export function clampLaneHeight(px: number): number {
  return Math.max(MIN_LANE_PX, Math.min(MAX_LANE_PX, Math.round(Number(px) || DEFAULT_LANE_PX)));
}

/** Unset-lane default: audio follows Zoom V; meta lanes stay compact vs audio. */
export function defaultLaneHeightForTrack(
  trackId: string,
  zoomV: number,
): number {
  if (isAudioLaneId(trackId)) {
    return clampLaneHeight(zoomV);
  }
  // Keep meta/audio ratio when global ↕ zoom changes (unset lanes only).
  const ratio = DEFAULT_META_LANE_PX / DEFAULT_LANE_PX;
  return clampLaneHeight(zoomV * ratio);
}

/** Base (unscaled) height for a track — custom override or type default. */
export function laneHeightBase(
  trackId: string,
  laneHeights: LaneHeightsMap,
  zoomV: number,
): number {
  const custom = laneHeights[trackId];
  if (custom != null && Number.isFinite(Number(custom))) {
    return clampLaneHeight(custom);
  }
  return defaultLaneHeightForTrack(trackId, zoomV);
}

/** Painted height after UI scale (v4 `laneHeightEffective`). */
export function laneHeightEffective(basePx: number, uiScale: number): number {
  return Math.max(1, Math.round(basePx * (uiScale || 1)));
}

/**
 * Keep relative proportions of per-track overrides when global ↕ zoom changes
 * (v4 `setVerticalZoom` ratio on `laneHeights`).
 */
export function scaleLaneHeights(
  laneHeights: LaneHeightsMap,
  oldBase: number,
  nextBase: number,
): LaneHeightsMap {
  if (!(oldBase > 0) || nextBase === oldBase) return laneHeights;
  const keys = Object.keys(laneHeights);
  if (!keys.length) return laneHeights;
  const ratio = nextBase / oldBase;
  const out: LaneHeightsMap = {};
  for (const id of keys) {
    out[id] = clampLaneHeight(Number(laneHeights[id]) * ratio);
  }
  return out;
}

export function clearLaneHeightOverride(
  laneHeights: LaneHeightsMap,
  trackId: string,
): LaneHeightsMap {
  if (!(trackId in laneHeights)) return laneHeights;
  const next = { ...laneHeights };
  delete next[trackId];
  return next;
}

export function setLaneHeightOverride(
  laneHeights: LaneHeightsMap,
  trackId: string,
  basePx: number,
): LaneHeightsMap {
  if (!trackId) return laneHeights;
  return { ...laneHeights, [trackId]: clampLaneHeight(basePx) };
}

export function loadLaneHeights(
  storage: Pick<Storage, "getItem"> | null = typeof localStorage !== "undefined"
    ? localStorage
    : null,
): LaneHeightsMap {
  if (!storage) return {};
  try {
    const raw = storage.getItem(LANE_HEIGHTS_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw) as unknown;
    if (!obj || typeof obj !== "object") return {};
    const out: LaneHeightsMap = {};
    for (const [id, val] of Object.entries(obj as Record<string, unknown>)) {
      if (Object.keys(out).length >= 64) break;
      const key = String(id);
      if (!key || key.length > 128) continue;
      const n = Math.round(Number(val));
      if (!Number.isFinite(n)) continue;
      out[key] = clampLaneHeight(n);
    }
    return out;
  } catch {
    return {};
  }
}

export function saveLaneHeights(
  laneHeights: LaneHeightsMap,
  storage: Pick<Storage, "setItem"> | null = typeof localStorage !== "undefined"
    ? localStorage
    : null,
): void {
  if (!storage) return;
  try {
    storage.setItem(LANE_HEIGHTS_KEY, JSON.stringify(laneHeights || {}));
  } catch {
    /* ignore quota / private mode */
  }
}
