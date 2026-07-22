/**
 * Timeline touch gestures (tablet / coarse) — pinch zoom + double-tap.
 * Port of v4 `timeline-touch.js` behaviour without cloning chrome.
 *
 * Double-tap choice: fitZoom (same as keyboard Z), not v4 inspector open.
 * Spec: same spot <300ms → fitZoom.
 */

export const TOUCH_DOUBLE_TAP_MS = 300;
export const TOUCH_MOVE_THRESHOLD_PX = 12;
export const TOUCH_PINCH_MIN_DIST_PX = 8;

export type TouchPoint = { clientX: number; clientY: number };

export function touchDistance(a: TouchPoint, b: TouchPoint): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export function pinchAnchorViewportX(
  a: TouchPoint,
  b: TouchPoint,
  scrollRectLeft: number,
): number {
  return (a.clientX + b.clientX) / 2 - scrollRectLeft;
}

export function clampZoomH(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Continuous pinch: startZoom × ratio, clamped. */
export function pinchZoomFromRatio(
  startZoom: number,
  ratio: number,
  min: number,
  max: number,
): number {
  if (!(startZoom > 0) || !(ratio > 0) || !Number.isFinite(ratio)) {
    return clampZoomH(startZoom, min, max);
  }
  return clampZoomH(startZoom * ratio, min, max);
}

export type LastTapState = {
  time: number;
  x: number;
  y: number;
};

export function isDoubleTap(
  last: LastTapState | null,
  now: number,
  x: number,
  y: number,
  maxIntervalMs: number = TOUCH_DOUBLE_TAP_MS,
  maxDistancePx: number = TOUCH_MOVE_THRESHOLD_PX * 2,
): boolean {
  if (!last) return false;
  if (now - last.time > maxIntervalMs) return false;
  return Math.hypot(x - last.x, y - last.y) <= maxDistancePx;
}
