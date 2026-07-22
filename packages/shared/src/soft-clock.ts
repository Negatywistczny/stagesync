import { elapsedToTicks } from "./time.js";

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
): number {
  if (
    !Number.isFinite(anchor.positionTicks) ||
    !Number.isFinite(anchor.bpm) ||
    !Number.isFinite(anchor.ppq) ||
    !Number.isFinite(currentTimestampMs) ||
    !Number.isFinite(localReceiptMs)
  ) {
    throw new RangeError("getDisplayTicks: non-finite input");
  }
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
  return anchor.positionTicks + elapsedTicks;
}
