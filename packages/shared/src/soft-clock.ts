import { elapsedToTicks } from "./time.js";
import {
  isUsableLoop,
  type TransportLoop,
} from "./transport-loop.js";

export type TransportAnchor = {
  positionTicks: number;
  bpm: number;
  timeSignature: { numerator: number; denominator: number };
  ppq: number;
};

/**
 * Soft playhead between server ticks. Pure — caller supplies timestamps
 * (rAF frameTime or performance.now for receipt). Never a musical authority.
 *
 * Optional `loop` wraps extrapolated ticks into the loop range (inclusive start /
 * exclusive end) so the display matches server wrap between WS ticks.
 *
 * @example
 * // 4/4 @ 120 BPM, PPQ 960: 500 ms ≈ one quarter = 960 ticks
 * const anchor = {
 *   positionTicks: 1000,
 *   bpm: 120,
 *   timeSignature: { numerator: 4, denominator: 4 },
 *   ppq: 960,
 * };
 * getDisplayTicks(anchor, 1500, 1000, true) // 1000 + 960
 * getDisplayTicks(anchor, 5000, 1000, false) // 1000 (paused)
 */
export function getDisplayTicks(
  anchor: TransportAnchor,
  currentTimestampMs: number,
  localReceiptMs: number,
  isPlaying: boolean,
  loop?: TransportLoop | null,
): number {
  if (!isPlaying) {
    return anchor.positionTicks;
  }
  const elapsedMs = Math.max(0, currentTimestampMs - localReceiptMs);
  const elapsedTicks = elapsedToTicks(
    elapsedMs,
    anchor.bpm,
    anchor.timeSignature,
    anchor.ppq,
  );
  const raw = anchor.positionTicks + elapsedTicks;
  return wrapDisplayTicks(raw, loop);
}

/** Modular wrap for soft-clock display (server still reanchors via loopWrapTicks). */
export function wrapDisplayTicks(
  positionTicks: number,
  loop?: TransportLoop | null,
): number {
  if (!loop?.enabled || !isUsableLoop(loop) || positionTicks < loop.endTicks) {
    return positionTicks;
  }
  const len = loop.endTicks - loop.startTicks;
  const offset = (positionTicks - loop.startTicks) % len;
  return loop.startTicks + (offset < 0 ? offset + len : offset);
}
