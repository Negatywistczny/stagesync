/**
 * Locator / loop region helpers — pure (v4 ruler + cycle behavior).
 */

import type { TransportLoop } from "@stagesync/shared";
import type { Project } from "@stagesync/shared";
import type { SnapMode } from "@stagesync/shared";
import { snapEditTicks } from "./formaCanvas.js";

export type LoopRange = { startTicks: number; endTicks: number };

/** Inclusive start / exclusive end (matches server loopWrapTicks). */
export function ticksInLoopRegion(
  ticks: number,
  range: LoopRange | null | undefined,
): boolean {
  if (
    !range ||
    !Number.isFinite(ticks) ||
    !Number.isFinite(range.startTicks) ||
    !Number.isFinite(range.endTicks) ||
    range.endTicks <= range.startTicks
  ) {
    return false;
  }
  return ticks >= range.startTicks && ticks < range.endTicks;
}

export function usableLoopRange(
  loop: TransportLoop | null | undefined,
): LoopRange | null {
  if (
    !loop ||
    !Number.isFinite(loop.startTicks) ||
    !Number.isFinite(loop.endTicks) ||
    loop.endTicks <= loop.startTicks
  ) {
    return null;
  }
  return { startTicks: loop.startTicks, endTicks: loop.endTicks };
}

/** Snap loop bounds to beat grid (v4 quantizeAbsBeat on cycle). Cmd/Ctrl → mode `"off"`. */
export function snapLoopRange(
  project: Project,
  a: number,
  b: number,
  mode: SnapMode = "beat",
): LoopRange {
  const start = snapEditTicks(project, Math.min(a, b), mode);
  let end = snapEditTicks(project, Math.max(a, b), mode);
  if (end <= start) {
    // At least one beat past start when drag collapses under snap.
    end = snapEditTicks(project, start + 1, mode === "off" ? "beat" : mode);
    if (end <= start) {
      end = start + project.ppq; // fallback: one quarter
    }
  }
  return { startTicks: start, endTicks: end };
}

/** Map WS / HTTP transport payload → state shape (preserve loop). */
export function transportStateFromTick(msg: {
  playing: boolean;
  positionTicks: number;
  bpm: number;
  timeSignature: { numerator: number; denominator: number };
  ppq: number;
  activeProjectId?: string | null;
  loop?: TransportLoop | null;
}): {
  playing: boolean;
  positionTicks: number;
  bpm: number;
  timeSignature: { numerator: number; denominator: number };
  ppq: number;
  activeProjectId: string | null;
  loop: TransportLoop | null;
} {
  return {
    playing: msg.playing,
    positionTicks: msg.positionTicks,
    bpm: msg.bpm,
    timeSignature: msg.timeSignature,
    ppq: msg.ppq,
    activeProjectId: msg.activeProjectId ?? null,
    loop: msg.loop ?? null,
  };
}
