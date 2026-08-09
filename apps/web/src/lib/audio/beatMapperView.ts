export const BEAT_MAPPER_ZOOM_MIN = 1;
export const BEAT_MAPPER_ZOOM_MAX = 32;
/** Visible window on open — enough for Beat 1 / intro alignment. */
export const BEAT_MAPPER_DEFAULT_VIEW_WINDOW_MS = 30_000;

export function clampBeatMapperZoom(z: number): number {
  return Math.max(BEAT_MAPPER_ZOOM_MIN, Math.min(BEAT_MAPPER_ZOOM_MAX, z));
}

export function defaultBeatMapperZoom(durationMs: number): number {
  if (!(durationMs > 0)) return BEAT_MAPPER_ZOOM_MIN;
  const targetWindow = Math.min(BEAT_MAPPER_DEFAULT_VIEW_WINDOW_MS, durationMs);
  if (targetWindow <= 0) return BEAT_MAPPER_ZOOM_MIN;
  return clampBeatMapperZoom(durationMs / targetWindow);
}

/** Dominant horizontal delta — Shift+wheel may arrive as deltaX (macOS) or deltaY. */
export function beatMapperWheelPanDelta(input: {
  shiftKey: boolean;
  deltaX: number;
  deltaY: number;
}): number {
  if (input.shiftKey) {
    return Math.abs(input.deltaX) > Math.abs(input.deltaY)
      ? input.deltaX
      : input.deltaY;
  }
  return input.deltaX !== 0 ? input.deltaX : input.deltaY;
}

export function isBeatMapperHorizontalWheel(input: {
  shiftKey: boolean;
  deltaX: number;
  deltaY: number;
}): boolean {
  return input.shiftKey || Math.abs(input.deltaX) > Math.abs(input.deltaY);
}
