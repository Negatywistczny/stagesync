/**
 * Timeline Forma gesture helpers — hit-test + snap modifier policy.
 * Pure where possible; no draftProject mutation ([ADR 0008] §8).
 */

import {
  DEFAULT_SNAP_MODE,
  type SnapMode,
} from "@stagesync/shared";
import type { AudioLaneId } from "./timelineTracks.js";

/** Edge hit zone width in CSS px (Logic-style trim handles). */
export const CLIP_EDGE_HIT_PX = 12;

/** v4 pencil click-vs-drag threshold (px). Below → 1-bar click insert. */
export const PENCIL_DRAG_THRESHOLD_PX = 5;

/** Content lanes historical default (beat) — docs/tests; session starts at `bar`. */
export const CONTENT_DEFAULT_SNAP_MODE: SnapMode = "beat";

const SNAP_STORAGE_KEY = "stagesync-timeline-snap-mode";

/** Session edit snap ([ADR 0007] phase 2) — not in project.json. */
let sessionSnapMode: SnapMode = DEFAULT_SNAP_MODE;

export function getSessionSnapMode(): SnapMode {
  return sessionSnapMode;
}

export function setSessionSnapMode(mode: SnapMode): void {
  sessionSnapMode = mode;
}

export function snapModeToStorageKey(mode: SnapMode): string {
  if (typeof mode === "string") return mode;
  return `subdivision:${mode.parts}`;
}

export function snapModeFromStorageKey(raw: string | null): SnapMode | null {
  if (raw == null || raw === "") return null;
  if (raw === "off" || raw === "bar" || raw === "beat") return raw;
  const m = /^subdivision:(2|4|8|16)$/.exec(raw);
  if (!m) return null;
  return { kind: "subdivision", parts: Number(m[1]) as 2 | 4 | 8 | 16 };
}

export function loadSessionSnapModeFromStorage(): SnapMode {
  try {
    const parsed = snapModeFromStorageKey(localStorage.getItem(SNAP_STORAGE_KEY));
    if (parsed) {
      sessionSnapMode = parsed;
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return sessionSnapMode;
}

export function persistSessionSnapMode(mode: SnapMode): void {
  sessionSnapMode = mode;
  try {
    localStorage.setItem(SNAP_STORAGE_KEY, snapModeToStorageKey(mode));
  } catch {
    /* ignore */
  }
}

/**
 * Resolve pencil gesture range (v4 `resolvePencilRange` in ticks).
 * Tiny pointer movement → click (1 bar at down); otherwise [min, max] span.
 */
export function resolvePencilRangeTicks(
  downTicks: number,
  upTicks: number,
  options: {
    barTicks: number;
    dxPx: number;
    thresholdPx?: number;
    /** Floor for start (e.g. after countdown). */
    floorTicks?: number;
  },
): { startTicks: number; lengthTicks: number; isClick: boolean } {
  const barTicks = Math.max(1, Math.floor(options.barTicks));
  const thresholdPx = Math.max(0, options.thresholdPx ?? PENCIL_DRAG_THRESHOLD_PX);
  const floor = Math.max(0, options.floorTicks ?? 0);
  const a = Math.max(floor, downTicks);
  const b = Math.max(floor, upTicks);
  const dxPx = Math.abs(options.dxPx);
  const tickDelta = Math.abs(b - a);
  const isClick = dxPx < thresholdPx && tickDelta < barTicks / 8;
  if (isClick) {
    return { startTicks: a, lengthTicks: barTicks, isClick: true };
  }
  const startTicks = Math.min(a, b);
  let endTicks = Math.max(a, b);
  if (endTicks - startTicks < 1) endTicks = startTicks + barTicks;
  return {
    startTicks,
    lengthTicks: Math.max(1, endTicks - startTicks),
    isClick: false,
  };
}

export type ClipHitZone = "body" | "start" | "end" | "fade-in" | "fade-out";

export type FormaToolId =
  | "pointer"
  | "smart"
  | "pencil"
  | "eraser"
  | "scissors"
  | "wand";

/** Hit zones only for Pointer / Smart — Pencil is exclusive draw. */
export function toolAllowsClipHitZones(tool: FormaToolId): boolean {
  return tool === "pointer" || tool === "smart";
}

export function toolIsPencilDraw(tool: FormaToolId): boolean {
  return tool === "pencil";
}

/**
 * Resolve snap mode from keyboard modifiers.
 * Re-evaluate on every pointermove (Cmd/Ctrl = off).
 * `baseMode` = session picker ([ADR 0007] phase 2); default = current session.
 */
export function snapModeFromModifiers(
  metaKey: boolean,
  ctrlKey: boolean,
  baseMode: SnapMode = getSessionSnapMode(),
): SnapMode {
  return metaKey || ctrlKey ? "off" : baseMode;
}

/**
 * Content / map / audio lanes: session snap when on; Cmd/Ctrl = off.
 * Default session = `bar` ([ADR 0007]); picker may select beat/subdivision.
 */
export function contentSnapModeFromModifiers(
  metaKey: boolean,
  ctrlKey: boolean,
  baseMode: SnapMode = getSessionSnapMode(),
): SnapMode {
  return metaKey || ctrlKey ? "off" : baseMode;
}

export function snapModeFromPointerEvent(e: {
  metaKey: boolean;
  ctrlKey: boolean;
}): SnapMode {
  return snapModeFromModifiers(e.metaKey, e.ctrlKey);
}

/**
 * Hit-test within a clip's local pixel box [0, widthPx).
 * When `allowZones` is false (Pencil), always `"body"` (caller treats as draw).
 */
export function hitTestClipZone(
  localX: number,
  widthPx: number,
  allowZones: boolean,
  edgePx: number = CLIP_EDGE_HIT_PX,
): ClipHitZone {
  if (!allowZones || widthPx <= 0) return "body";
  const edge = Math.min(edgePx, Math.max(1, Math.floor(widthPx / 3)));
  if (localX <= edge) return "start";
  if (localX >= widthPx - edge) return "end";
  return "body";
}

/**
 * Audio Smart Tool zones ([ADR 0008] §6): top corners = fade; lower edges = trim.
 * Pointer tool keeps classic start/end/body (no fade corners).
 */
export function hitTestAudioClipZone(
  localX: number,
  localY: number,
  widthPx: number,
  heightPx: number,
  allowZones: boolean,
  smartFades: boolean,
  edgePx: number = CLIP_EDGE_HIT_PX,
): ClipHitZone {
  if (!allowZones || widthPx <= 0) return "body";
  const edge = Math.min(edgePx, Math.max(1, Math.floor(widthPx / 3)));
  const topBand = Math.max(8, heightPx * 0.45);
  if (smartFades && localY <= topBand) {
    if (localX <= edge) return "fade-in";
    if (localX >= widthPx - edge) return "fade-out";
  }
  return hitTestClipZone(localX, widthPx, true, edgePx);
}

export type FormaGestureKind =
  | "pencil-draw"
  | "move"
  | "resize-start"
  | "resize-end"
  | "fade-in"
  | "fade-out"
  | "countdown-length"
  | "subsection-boundary";

export type GestureLane =
  | "forma"
  | "tekst"
  | "akordy"
  | "cue"
  | AudioLaneId;

export type FormaGestureSession = {
  kind: FormaGestureKind;
  clipId: string | null;
  pointerId: number;
  /** Raw ticks at pointerdown (before live snap). */
  originTicks: number;
  /** Clip start at gesture start (move/resize). */
  originClipStart: number;
  /** Clip length at gesture start. */
  originClipLength: number;
  /** Lane owning the gesture (default forma). */
  lane?: GestureLane;
  /** clientX at pointerdown — pencil click-vs-drag threshold (v4). */
  originClientX?: number;
  /** Band index ≥ 1 whose start is the dragged boundary. */
  boundarySubIdx?: number;
  /** Relative boundary offset at gesture start. */
  originBoundaryRel?: number;
  /** Multi-move same lane (v4 moveIds); resize ignores. */
  moveIds?: string[];
  /** Alt/⌥+drag: copy at drop; originals stay (v4 optionCopy / TE-07). */
  optionCopy?: boolean;
  /** Fade gesture: fade ms at pointerdown. */
  originFadeMs?: number;
};

export type FormaGesturePreview = {
  kind: FormaGestureKind;
  clipId: string | null;
  /** Preview start (snapped). */
  startTicks: number;
  /** Preview length (snapped). */
  lengthTicks: number;
  /** For pencil: ephemeral name. */
  name?: string;
  /** Live subsection offsets during boundary drag. */
  subsections?: number[];
  /** Live fade ms while dragging Smart fade handles. */
  fadeInMs?: number;
  fadeOutMs?: number;
};

export function cursorForHitZone(
  zone: ClipHitZone,
  allowZones: boolean,
): string {
  if (!allowZones) return "crosshair";
  if (zone === "fade-in" || zone === "fade-out") return "col-resize";
  if (zone === "start" || zone === "end") return "ew-resize";
  return "grab";
}
