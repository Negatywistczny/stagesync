/**
 * Timeline dock column width — base px before UI scale; persisted in localStorage.
 * Painted width = base × `--tl-zoom-ui` (same pattern as lane heights).
 */

export const DOCK_WIDTH_KEY = "stagesync-timeline-dock-width";

/** Unscaled defaults / clamps (CSS was 7.5rem ≈ 120px at zoom 100%). */
export const MIN_DOCK_WIDTH_PX = 120;
export const MAX_DOCK_WIDTH_PX = 350;
export const DEFAULT_DOCK_WIDTH_PX = 120;

export function clampDockWidth(px: number): number {
  return Math.max(
    MIN_DOCK_WIDTH_PX,
    Math.min(MAX_DOCK_WIDTH_PX, Math.round(Number(px) || DEFAULT_DOCK_WIDTH_PX)),
  );
}

/** Painted dock width after UI scale. */
export function dockWidthEffective(basePx: number, uiScale: number): number {
  return Math.max(1, Math.round(basePx * (uiScale || 1)));
}

export function loadDockWidth(
  storage: Pick<Storage, "getItem"> | null = typeof localStorage !== "undefined"
    ? localStorage
    : null,
): number {
  if (!storage) return DEFAULT_DOCK_WIDTH_PX;
  try {
    const raw = storage.getItem(DOCK_WIDTH_KEY);
    if (raw == null || raw === "") return DEFAULT_DOCK_WIDTH_PX;
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_DOCK_WIDTH_PX;
    return clampDockWidth(n);
  } catch {
    return DEFAULT_DOCK_WIDTH_PX;
  }
}

export function saveDockWidth(
  basePx: number,
  storage: Pick<Storage, "setItem"> | null = typeof localStorage !== "undefined"
    ? localStorage
    : null,
): void {
  if (!storage) return;
  try {
    storage.setItem(DOCK_WIDTH_KEY, String(clampDockWidth(basePx)));
  } catch {
    /* ignore quota / private mode */
  }
}
