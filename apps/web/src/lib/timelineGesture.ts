/**
 * Timeline Forma gesture helpers — hit-test + snap modifier policy.
 * Pure where possible; no draftProject mutation ([ADR 0008] §8).
 */

import {
  DEFAULT_SNAP_MODE,
  type SnapMode,
} from "@stagesync/shared";

/** Edge hit zone width in CSS px (Logic-style trim handles). */
export const CLIP_EDGE_HIT_PX = 8;

export type ClipHitZone = "body" | "start" | "end";

export type FormaToolId =
  | "pointer"
  | "smart"
  | "pencil"
  | "eraser"
  | "scissors"
  | "zoom"
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
 */
export function snapModeFromModifiers(
  metaKey: boolean,
  ctrlKey: boolean,
): SnapMode {
  return metaKey || ctrlKey ? "off" : DEFAULT_SNAP_MODE;
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

export type FormaGestureKind =
  | "pencil-draw"
  | "move"
  | "resize-start"
  | "resize-end";

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
};

export function cursorForHitZone(
  zone: ClipHitZone,
  allowZones: boolean,
): string {
  if (!allowZones) return "crosshair";
  if (zone === "start" || zone === "end") return "ew-resize";
  return "grab";
}
