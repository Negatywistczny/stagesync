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
 */
export function getDisplayTicks(
  anchor: TransportAnchor,
  currentTimestampMs: number,
  localReceiptMs: number,
  isPlaying: boolean,
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
  return anchor.positionTicks + elapsedTicks;
}
